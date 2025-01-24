import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { config } from '@/config'
import type { Database } from '@/lib/supabase/types'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: webhookId } = await params
    const supabase = createServiceClient<Database>(
        config.NEXT_PUBLIC_SUPABASE_URL,
        config.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    )

    // Get the webhook and its associated channel
    const { data: webhook, error: webhookError } = await supabase
        .from('channel_webhooks')
        .select('*, channels!inner(*)')
        .eq('id', webhookId)
        .single()

    if (webhookError || !webhook) {
        return NextResponse.json(
            { error: 'Webhook not found' },
            { status: 404 },
        )
    }

    try {
        // Parse the webhook payload
        const payload = await request.json()

        // Create a message in the channel with the webhook payload
        const { error: messageError } = await supabase.from('messages').insert({
            channel_id: webhook.channel_id,
            content: JSON.stringify(payload, null, 2),
            sender_id: webhook.channels.created_by, // Use channel owner as sender
        })

        if (messageError) {
            console.error('Error creating message:', messageError)
            return NextResponse.json(
                { error: 'Failed to create message' },
                { status: 500 },
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error processing webhook:', error)
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
}
