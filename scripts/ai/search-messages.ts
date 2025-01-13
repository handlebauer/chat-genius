#!/usr/bin/env bun

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import type { Database } from '../../src/lib/supabase/types'

interface SearchResult {
    id: string
    content: string
    channel_id: string
    sender_id: string
    created_at: string
    similarity: number
}

const log = {
    info: (msg: string) => console.log(`\x1b[36m○\x1b[0m ${msg}`),
    success: (msg: string) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
    error: (msg: string, error?: any) =>
        console.error(`\x1b[31m⨯\x1b[0m ${msg}`, error || ''),
    start: (msg: string) => console.log(`\x1b[35m▶\x1b[0m ${msg}`),
    complete: (msg: string) => console.log(`\x1b[32m◼\x1b[0m ${msg}`),
    divider: () => console.log('\n' + '─'.repeat(50) + '\n'),
    result: (msg: string) => console.log(`\x1b[33m→\x1b[0m ${msg}`),
}

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

async function searchSimilarMessages(
    supabase: ReturnType<typeof createClient<Database>>,
    embedding: number[],
    limit = 5,
    similarity_threshold = 0,
): Promise<SearchResult[] | null> {
    const { data: messages, error } = await supabase.rpc('match_messages', {
        // @ts-expect-error all good
        query_embedding: embedding,
        match_threshold: similarity_threshold,
        match_count: limit,
    })

    if (error) {
        log.error('Error searching messages:', error)
        return null
    }

    return messages as SearchResult[]
}

async function main() {
    log.start('\nVector Similarity Search')
    log.info(`Prompt: "${SEARCH_PROMPT}"`)
    log.divider()

    const { openai, supabase } = initializeClients()

    try {
        // Generate embedding for the search prompt
        log.info('Generating embedding for search prompt...')
        const embedding = await generateEmbedding(openai, SEARCH_PROMPT)
        log.success('Embedding generated')

        // Search for similar messages
        log.info('Searching for similar messages...')
        const results = await searchSimilarMessages(supabase, embedding)

        if (!results || results.length === 0) {
            log.complete('No similar messages found')
            return
        }

        log.success(`Found ${results.length} similar messages`)
        log.divider()

        // Display results
        results.forEach((msg: SearchResult, index: number) => {
            const similarity = (msg.similarity * 100).toFixed(1)
            log.result(`Match #${index + 1} (${similarity}% similar):`)
            console.log(msg.content)
            console.log() // Empty line between results
        })

        log.complete('Search complete')
    } catch (error) {
        log.error('Search failed:', error)
    }
}

// Sample search prompt - modify this to test different searches
const SEARCH_PROMPT = 'What can I buy to help me get in shape??'

main().catch(error => log.error('Fatal error', error))
