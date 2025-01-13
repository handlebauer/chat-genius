#!/usr/bin/env bun

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/supabase/types'

const log = {
    info: (msg: string) => console.log(`\x1b[36m○\x1b[0m ${msg}`),
    success: (msg: string) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
    error: (msg: string, error?: any) =>
        console.error(`\x1b[31m⨯\x1b[0m ${msg}`, error || ''),
    start: (msg: string) => console.log(`\x1b[35m▶\x1b[0m ${msg}`),
    complete: (msg: string) => console.log(`\x1b[32m◼\x1b[0m ${msg}`),
}

// Initialize clients
function initializeClients() {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        log.error('Missing Supabase environment variables')
        process.exit(1)
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)
    return { openai, supabase }
}

async function generateEmbedding(openai: OpenAI, text: string) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
    })

    return response.data[0].embedding
}

async function fetchMessagesWithoutEmbeddings(
    supabase: ReturnType<typeof createClient<Database>>,
    batchSize: number,
) {
    const { data: messages, error } = await supabase
        .from('messages')
        .select('id, content, channel_id, sender_id')
        .is('embedding_vector', null)
        .limit(batchSize)

    if (error) {
        log.error('Error fetching messages:', error)
        return null
    }

    return messages
}

async function updateMessageEmbedding(
    supabase: ReturnType<typeof createClient<Database>>,
    messageId: string,
    embedding: number[],
) {
    const { error } = await supabase
        .from('messages')
        .update({
            embedding_vector: JSON.stringify(embedding),
        })
        .eq('id', messageId)

    if (error) {
        log.error(`Error updating message ${messageId}`, error)
        return false
    }
    return true
}

async function processMessages(
    openai: OpenAI,
    supabase: ReturnType<typeof createClient<Database>>,
    batchSize = 100,
) {
    log.info(`Scanning for messages without embeddings [batch: ${batchSize}]`)

    const messages = await fetchMessagesWithoutEmbeddings(supabase, batchSize)
    if (!messages || messages.length === 0) {
        log.complete('No pending messages found')
        return false
    }

    log.start(`Processing batch of ${messages.length} messages`)

    for (const message of messages) {
        try {
            const embedding = await generateEmbedding(openai, message.content)
            const success = await updateMessageEmbedding(
                supabase,
                message.id,
                embedding,
            )

            if (success) {
                log.success(`msg:${message.id.slice(0, 8)} → embedded`)
            }
        } catch (error) {
            log.error(`Failed to process msg:${message.id.slice(0, 8)}`, error)
        }
    }

    log.complete('Batch complete')
    return true
}

async function main() {
    const { openai, supabase } = initializeClients()

    log.start('\nEmbedding Generation Service')
    log.info('Using OpenAI text-embedding-3-large model')
    let hasMoreMessages = true
    let batchCount = 0

    while (hasMoreMessages) {
        batchCount++
        hasMoreMessages = await processMessages(openai, supabase)
        if (hasMoreMessages) {
            log.info(`Batch ${batchCount} complete, cooling down...`)
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }

    log.complete(`Service complete [processed ${batchCount} batches]`)
}

main().catch(error => log.error('Fatal error', error))
