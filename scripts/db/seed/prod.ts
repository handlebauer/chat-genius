#!/usr/bin/env bun

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { readdir } from 'fs/promises'
import { botUserConfig, config } from '@/config'
import { MENTION_TEMPLATES } from '@/lib/utils/mentions'

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
let channelPassword: string | null = null

async function promptForPassword() {
    console.log('\nPlease enter a password for the private channels:')
    const password = await new Promise<string>(resolve => {
        process.stdin.once('data', data => {
            resolve(data.toString().trim())
        })
    })

    if (!password) {
        console.error('Password cannot be empty')
        process.exit(1)
    }

    channelPassword = password
    console.log('\nPassword set successfully!\n')
}

async function createSystemUser() {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .insert(botUserConfig)
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
                    email: slackUser.email,
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

async function addChannelMember(
    channelId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member' = 'member',
) {
    try {
        const { error } = await supabase
            .from('channel_members')
            .insert({
                channel_id: channelId,
                user_id: userId,
                role,
            })
            .select()
            .single()

        if (error) {
            // If it's a unique violation, we can ignore it as the user is already a member
            if (error.code !== '23505') {
                console.error(
                    `Failed to add user ${userId} to channel ${channelId}:`,
                    error,
                )
            }
        }
    } catch (error) {
        console.error(`Failed to add channel member:`, error)
    }
}

async function seedTestChannel() {
    try {
        // Hash the password for the private channel
        const { data: passwordHash, error: hashError } = await supabase.rpc(
            'crypt_password',
            {
                password: channelPassword!,
            },
        )

        if (hashError) {
            console.error('Failed to hash password:', hashError)
            return
        }

        const { data: channel, error } = await supabase
            .from('channels')
            .insert({
                name: 'hello',
                is_private: false,
                channel_type: 'channel',
                created_by: systemUserId,
            })
            .select()
            .single()

        if (error) {
            console.error('Failed to create hello channel:', error)
            return
        }

        // Add system user as channel member
        await addChannelMember(channel.id, systemUserId!, 'owner')

        console.log('Created hello channel:', channel.id)

        // Add a welcome message from the system user
        const { error: messageError } = await supabase.from('messages').insert({
            channel_id: channel.id,
            content:
                'Welcome to the hello channel! 👋 I am the GauntletAI Bot, here to help you test things out.',
            sender_id: systemUserId,
        })

        if (messageError) {
            console.error('Failed to create welcome message:', messageError)
        }
    } catch (error) {
        console.error('Failed to seed hello channel:', error)
    }
}

async function formatMessageContent(
    content: string,
    userIdMap: Map<string, string>,
): Promise<string> {
    // Find all Slack user mentions
    const matches = Array.from(content.matchAll(/\u003c@(U[A-Z0-9]+)\u003e/g))

    // Process all matches in parallel
    const replacements = await Promise.all(
        matches.map(async ([fullMatch, slackUserId]) => {
            const userId = userIdMap.get(slackUserId)
            if (!userId) {
                console.warn(`No UUID found for Slack user ID ${slackUserId}`)
                return { fullMatch, replacement: '@unknown-user' }
            }

            // Get user details from the database
            const { data: user } = await supabase
                .from('users')
                .select('name, email')
                .eq('id', userId)
                .single()

            if (!user) return { fullMatch, replacement: '@unknown-user' }

            const name = user.name || user.email.split('@')[0]
            return {
                fullMatch,
                replacement: MENTION_TEMPLATES.USER(userId, name),
            }
        }),
    )

    // Apply all replacements
    let formattedContent = content
    replacements.forEach(({ fullMatch, replacement }) => {
        formattedContent = formattedContent.replace(fullMatch, replacement)
    })

    return formattedContent
}

async function seedChannels() {
    try {
        const channelsDir = './exports/channels'
        const files = await readdir(channelsDir)
        const jsonFiles = files.filter(file => file.endsWith('.json'))

        // Hash the password once for all channels
        const { data: passwordHash, error: hashError } = await supabase.rpc(
            'crypt_password',
            {
                password: channelPassword!,
            },
        )

        if (hashError) {
            console.error('Failed to hash password:', hashError)
            return
        }

        for (const file of jsonFiles) {
            const channelName = file.replace('.json', '')

            // Create channel
            const { data: channel, error } = await supabase
                .from('channels')
                .insert({
                    name: channelName,
                    is_private: true,
                    password_hash: passwordHash,
                    channel_type: 'channel',
                    created_by: systemUserId,
                })
                .select()
                .single()

            if (error) {
                console.error(`Failed to create channel ${channelName}:`, error)
                continue
            }

            channelIdMap.set(channelName, channel.id)
            console.log(`Created channel ${channelName} with ID ${channel.id}`)

            // Add system user as channel member (owner)
            await addChannelMember(channel.id, systemUserId!, 'owner')

            // Track unique senders to avoid duplicate member additions
            const addedMembers = new Set<string>()

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

                // Add user as channel member if not already added
                if (!addedMembers.has(senderId)) {
                    await addChannelMember(channel.id, senderId)
                    addedMembers.add(senderId)
                }

                // Format the message content with proper mentions
                let formattedContent = await formatMessageContent(
                    message.text,
                    userIdMap,
                )

                const key = /sk-[a-zA-Z0-9\-\_]{161}/

                if (key.test(formattedContent)) {
                    console.log('Found key in message, skipping')
                    continue
                }

                const { error: messageError } = await supabase
                    .from('messages')
                    .insert({
                        channel_id: channel.id,
                        content: formattedContent,
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
            console.log(`Added ${addedMembers.size} members to ${channelName}`)
        }
    } catch (error) {
        console.error('Failed to seed channels:', error)
    }
}

async function seed() {
    if (config.NODE_ENV !== 'production') {
        console.log('This script can only be run in production environment')
        process.exit(0)
    }

    console.log('Starting data seeding...')
    console.log('Environment:', config.NODE_ENV)

    await promptForPassword()

    // Create users and channels
    await createSystemUser()
    await seedUsers()
    await seedTestChannel()
    await seedChannels()

    console.log('Data seeding completed!')
}

// Run the seeding
await seed().catch(console.error)
