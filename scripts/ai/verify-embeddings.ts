#!/usr/bin/env bun

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/supabase/types'

const log = {
    info: (msg: string) => console.log(`\x1b[36m○\x1b[0m ${msg}`),
    warn: (msg: string) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`),
    success: (msg: string) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
    error: (msg: string, error?: any) =>
        console.error(`\x1b[31m⨯\x1b[0m ${msg}`, error || ''),
    start: (msg: string) => console.log(`\x1b[35m▶\x1b[0m ${msg}`),
    complete: (msg: string) => console.log(`\x1b[32m◼\x1b[0m ${msg}`),
    table: (data: any[][]) => {
        console.log('\n' + data.map(row => row.join('\t')).join('\n') + '\n')
    },
}

function initializeClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        log.error('Missing Supabase environment variables')
        process.exit(1)
    }

    return createClient<Database>(supabaseUrl, supabaseServiceKey)
}

async function getEmbeddingStats(
    supabase: ReturnType<typeof createClient<Database>>,
) {
    // Get total message count
    const { count: totalCount, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })

    if (countError) {
        log.error('Error fetching total message count:', countError)
        process.exit(1)
    }

    // Get messages without embeddings
    const { data: missingEmbeddings, error: missingError } = await supabase
        .from('messages')
        .select('id, content, channel_id, created_at')
        .is('embedding_vector', null)

    if (missingError) {
        log.error('Error fetching messages without embeddings:', missingError)
        process.exit(1)
    }

    // Get sample of messages with embeddings to verify format
    const { data: sampleWithEmbeddings, error: sampleError } = await supabase
        .from('messages')
        .select('id, embedding_vector')
        .not('embedding_vector', 'is', null)
        .limit(1)

    if (sampleError) {
        log.error('Error fetching sample message with embedding:', sampleError)
        process.exit(1)
    }

    return {
        totalMessages: totalCount || 0,
        messagesWithoutEmbeddings: missingEmbeddings || [],
        sampleEmbedding: sampleWithEmbeddings?.[0]?.embedding_vector,
    }
}

async function main() {
    log.start('\nEmbedding Verification Report')
    const supabase = initializeClient()

    const stats = await getEmbeddingStats(supabase)
    const missingCount = stats.messagesWithoutEmbeddings.length
    const embeddedCount = stats.totalMessages - missingCount
    const completionRate = (
        (embeddedCount / stats.totalMessages) *
        100
    ).toFixed(2)

    // Print summary
    log.table([
        ['Total Messages', stats.totalMessages.toString()],
        ['Messages with Embeddings', embeddedCount.toString()],
        ['Messages without Embeddings', missingCount.toString()],
        ['Completion Rate', `${completionRate}%`],
    ])

    // Verify embedding format if we have a sample
    if (stats.sampleEmbedding) {
        try {
            const parsed = JSON.parse(stats.sampleEmbedding as string)
            if (
                Array.isArray(parsed) &&
                parsed.length > 0 &&
                typeof parsed[0] === 'number'
            ) {
                log.success('Embedding format verification: Valid')
                log.info(`Vector dimensions: ${parsed.length}`)
            } else {
                log.warn('Embedding format verification: Invalid structure')
            }
        } catch {
            log.warn('Embedding format verification: Invalid JSON')
        }
    }

    // Report on messages without embeddings
    if (missingCount > 0) {
        log.warn('\nMessages requiring embedding generation:')
        stats.messagesWithoutEmbeddings.slice(0, 5).forEach(msg => {
            const date = new Date(msg.created_at || '')
                .toISOString()
                .split('T')[0]
            log.info(
                `${msg.id.slice(0, 8)} | Channel: ${msg.channel_id} | Created: ${date}`,
            )
        })

        if (missingCount > 5) {
            log.info(`... and ${missingCount - 5} more messages`)
        }
    } else {
        log.complete('All messages have embeddings')
    }
}

main().catch(error => log.error('Fatal error', error))
