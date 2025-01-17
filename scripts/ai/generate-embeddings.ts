#!/usr/bin/env bun

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

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

async function generateEmbeddings(openai: OpenAI, texts: string[]) {
    // Source: https://platform.openai.com/docs/api-reference/embeddings/create
    // "You can input up to 2048 texts per request"
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float',
    })

    return response.data.map(item => item.embedding)
}

async function loadStoredEmbeddings(): Promise<Set<string>> {
    try {
        const outputPath = './exports/embeddings.json'
        const file = Bun.file(outputPath)

        if (await file.exists()) {
            const embeddings: StoredEmbedding[] = await file.json()
            const messageIds = new Set(embeddings.map(e => e.message_id))
            log.info(
                `Loaded ${messageIds.size} existing message IDs from storage`,
            )
            return messageIds
        }
    } catch (error) {
        log.error('Failed to load existing embeddings:', error)
    }

    return new Set()
}

async function fetchMessagesWithoutEmbeddings(
    supabase: ReturnType<typeof createClient<Database>>,
    batchSize: number,
    existingMessageIds: Set<string>,
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

    // Filter out messages that already have embeddings stored locally
    const filteredMessages = messages?.filter(
        msg => !existingMessageIds.has(msg.id),
    )

    if (
        messages &&
        filteredMessages &&
        messages.length !== filteredMessages.length
    ) {
        log.info(
            `Skipped ${messages.length - filteredMessages.length} messages with existing embeddings`,
        )
    }

    return filteredMessages
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

interface StoredEmbedding {
    message_id: string
    content: string
    embedding_vector: number[]
}

async function saveEmbeddingsToFile(newEmbeddings: StoredEmbedding[]) {
    const outputPath = './exports/embeddings.json'
    let existingEmbeddings: StoredEmbedding[] = []

    // Try to load existing embeddings
    try {
        const file = Bun.file(outputPath)
        if (await file.exists()) {
            existingEmbeddings = await file.json()
            log.info(`Loaded ${existingEmbeddings.length} existing embeddings`)
        }
    } catch (error) {
        log.error('Failed to load existing embeddings, starting fresh:', error)
    }

    // Merge existing and new embeddings, using message_id as key
    // Later embeddings will override earlier ones in case of collision
    const embeddingsMap = new Map<string, StoredEmbedding>()

    // Add existing embeddings to map
    for (const embedding of existingEmbeddings) {
        embeddingsMap.set(embedding.message_id, embedding)
    }

    // Add/override with new embeddings
    for (const embedding of newEmbeddings) {
        embeddingsMap.set(embedding.message_id, embedding)
    }

    // Convert map back to array
    const mergedEmbeddings = Array.from(embeddingsMap.values())

    // Save merged embeddings
    await Bun.write(outputPath, JSON.stringify(mergedEmbeddings, null, 2))
    log.success(
        `Saved ${mergedEmbeddings.length} embeddings (${newEmbeddings.length} new) to ${outputPath}`,
    )
}

async function processMessages(
    openai: OpenAI,
    supabase: ReturnType<typeof createClient<Database>>,
    batchSize = 100,
    existingMessageIds: Set<string>,
) {
    log.info(`Scanning for messages without embeddings [batch: ${batchSize}]`)

    const messages = await fetchMessagesWithoutEmbeddings(
        supabase,
        batchSize,
        existingMessageIds,
    )
    if (!messages || messages.length === 0) {
        log.complete('No pending messages found')
        return false
    }

    log.start(`Processing batch of ${messages.length} messages`)

    const storedEmbeddings: StoredEmbedding[] = []

    try {
        // Generate embeddings in batch
        const embeddings = await generateEmbeddings(
            openai,
            messages.map(m => m.content),
        )

        // Process results in parallel
        await Promise.all(
            messages.map(async (message, index) => {
                try {
                    const embedding = embeddings[index]
                    const success = await updateMessageEmbedding(
                        supabase,
                        message.id,
                        embedding,
                    )

                    if (success) {
                        log.success(`msg:${message.id.slice(0, 8)} → embedded`)
                        storedEmbeddings.push({
                            message_id: message.id,
                            content: message.content,
                            embedding_vector: embedding,
                        })
                        existingMessageIds.add(message.id)
                    }
                } catch (error) {
                    log.error(
                        `Failed to process msg:${message.id.slice(0, 8)}`,
                        error,
                    )
                }
            }),
        )
    } catch (error) {
        log.error('Failed to generate batch embeddings:', error)
    }

    // Save embeddings to file after each batch
    if (storedEmbeddings.length > 0) {
        await saveEmbeddingsToFile(storedEmbeddings)
    }

    log.complete('Batch complete')
    return true
}

async function main() {
    const { openai, supabase } = initializeClients()

    log.start('\nEmbedding Generation Service')
    log.info('Using OpenAI text-embedding-3-small model')

    // Load existing message IDs once at the start
    const existingMessageIds = await loadStoredEmbeddings()

    let hasMoreMessages = true
    let batchCount = 0

    while (hasMoreMessages) {
        batchCount++
        hasMoreMessages = await processMessages(
            openai,
            supabase,
            100,
            existingMessageIds,
        )
        if (hasMoreMessages) {
            log.info(`Batch ${batchCount} complete, cooling down...`)
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }

    log.complete(`Service complete [processed ${batchCount} batches]`)
}

main().catch(error => log.error('Fatal error', error))
