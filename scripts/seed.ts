#!/usr/bin/env bun
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/supabase/types'
import { readdir } from 'fs/promises'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Map to store Slack ID to UUID mappings
const userIdMap = new Map<string, string>()
const channelIdMap = new Map<string, string>()
let systemUserId: string | null = null

async function createSystemUser() {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .insert({
                email: 'system@gauntletai.com',
                name: 'GauntletAI Bot',
                avatar_url:
                    'https://api.dicebear.com/7.x/bottts/svg?seed=gauntlet',
            })
            .select()
            .single()

        if (error) {
            console.error('Failed to create system user:', error)
            process.exit(1)
        }

        systemUserId = user.id
        console.log('Created system user with ID:', systemUserId)
    } catch (error) {
        console.error('Failed to create system user:', error)
        process.exit(1)
    }
}

async function seedUsers() {
    try {
        const usersFile = await Bun.file('./exports/users.json').json()

        for (const slackUser of usersFile) {
            const { data: user, error } = await supabase
                .from('users')
                .insert({
                    email: `${slackUser.name}@gauntletai.com`, // Placeholder email
                    name: slackUser.realName,
                    avatar_url: slackUser.avatar,
                })
                .select()
                .single()

            if (error) {
                console.error(`Failed to insert user ${slackUser.name}:`, error)
                continue
            }

            userIdMap.set(slackUser.id, user.id)
            console.log(`Inserted user ${slackUser.name} with ID ${user.id}`)
        }
    } catch (error) {
        console.error('Failed to seed users:', error)
        process.exit(1)
    }
}

async function seedTestChannel() {
    try {
        const { data: channel, error } = await supabase
            .from('channels')
            .insert({
                name: 'test',
                is_private: false,
                channel_type: 'channel',
                created_by: systemUserId,
            })
            .select()
            .single()

        if (error) {
            console.error('Failed to create test channel:', error)
            return
        }

        console.log('Created test channel:', channel.id)

        // Add a welcome message from the system user
        const { error: messageError } = await supabase.from('messages').insert({
            channel_id: channel.id,
            content:
                'Welcome to the test channel! 👋 I am the GauntletAI Bot, here to help you test things out.',
            sender_id: systemUserId,
        })

        if (messageError) {
            console.error('Failed to create test message:', messageError)
        }
    } catch (error) {
        console.error('Failed to seed test channel:', error)
    }
}

async function seedChannels() {
    try {
        const channelsDir = './exports/channels'
        const files = await readdir(channelsDir)
        const jsonFiles = files.filter(file => file.endsWith('.json'))

        for (const file of jsonFiles) {
            const channelName = file.replace('.json', '')

            // Create channel
            const { data: channel, error } = await supabase
                .from('channels')
                .insert({
                    name: channelName,
                    is_private: false,
                    channel_type: 'channel',
                    created_by: systemUserId, // Set system user as creator
                })
                .select()
                .single()

            if (error) {
                console.error(`Failed to create channel ${channelName}:`, error)
                continue
            }

            channelIdMap.set(channelName, channel.id)
            console.log(`Created channel ${channelName} with ID ${channel.id}`)

            // Seed messages for this channel
            const messages = await Bun.file(`${channelsDir}/${file}`).json()

            for (const message of messages) {
                const senderId = userIdMap.get(message.user)
                if (!senderId) {
                    console.warn(
                        `No UUID found for Slack user ID ${message.user}`,
                    )
                    continue
                }

                const { error: messageError } = await supabase
                    .from('messages')
                    .insert({
                        channel_id: channel.id,
                        content: message.text,
                        sender_id: senderId,
                        created_at: new Date(
                            Number(message.ts) * 1000,
                        ).toISOString(),
                    })

                if (messageError) {
                    console.error(
                        `Failed to insert message in ${channelName}:`,
                        messageError,
                    )
                }
            }

            console.log(`Seeded ${messages.length} messages in ${channelName}`)
        }
    } catch (error) {
        console.error('Failed to seed channels:', error)
    }
}

async function seed() {
    console.log('Starting data seeding...')

    // Create system user first
    await createSystemUser()

    // Then seed regular users
    await seedUsers()

    // Then seed the test channel
    await seedTestChannel()

    // Finally seed the actual channels and their messages
    await seedChannels()

    console.log('Data seeding completed!')
}

// Run the seeding
await seed()
