#!/usr/bin/env bun

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { config, botUserConfig } from '@/config'
import { testUsers, generalMessages, aiMessages } from './data'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl)

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Store user IDs for reference
const userIds: { [key: string]: string } = {}
let systemUserId: string | null = null

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

async function createTestUsers() {
    try {
        for (const user of testUsers) {
            const { data: createdUser, error } = await supabase
                .from('users')
                .insert(user)
                .select()
                .single()

            if (error) {
                console.error(`Failed to insert user ${user.name}:`, error)
                continue
            }

            userIds[user.email] = createdUser.id
            console.log(
                `Created test user ${user.name} with ID ${createdUser.id}`,
            )
        }
    } catch (error) {
        console.error('Failed to create test users:', error)
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

async function createChannel(name: string, messages: typeof generalMessages) {
    try {
        const { data: channel, error } = await supabase
            .from('channels')
            .insert({
                name,
                is_private: false,
                channel_type: 'channel',
                created_by: systemUserId,
            })
            .select()
            .single()

        if (error) {
            console.error(`Failed to create ${name} channel:`, error)
            return
        }

        console.log(`Created ${name} channel:`, channel.id)

        // Add system user as channel member (will be owner due to trigger)
        await addChannelMember(channel.id, systemUserId!)

        // Add a welcome message from the system user
        const welcomeMessage =
            name === 'general'
                ? 'Welcome to the general channel! 👋 Feel free to chat about anything!'
                : 'Welcome to the AI testing channel! 🤖 This channel contains test messages for vector similarity search.'

        const { error: messageError } = await supabase.from('messages').insert({
            channel_id: channel.id,
            content: welcomeMessage,
            sender_id: systemUserId,
        })

        if (messageError) {
            console.error('Failed to create welcome message:', messageError)
        }

        // Track unique senders to avoid duplicate member additions
        const addedMembers = new Set<string>()

        // Add the test messages
        for (const message of messages) {
            const senderId = userIds[message.sender]
            if (!senderId) {
                console.warn(`No user ID found for ${message.sender}`)
                continue
            }

            // Add user as channel member if not already added
            if (!addedMembers.has(senderId)) {
                await addChannelMember(channel.id, senderId)
                addedMembers.add(senderId)
            }

            const { error: messageError } = await supabase
                .from('messages')
                .insert({
                    channel_id: channel.id,
                    content: message.content,
                    sender_id: senderId,
                    created_at: new Date().toISOString(),
                })

            if (messageError) {
                console.error('Failed to insert message:', messageError)
            }
        }

        console.log(`Seeded ${messages.length} messages in ${name} channel`)
        console.log(`Added ${addedMembers.size} members to ${name} channel`)
    } catch (error) {
        console.error(`Failed to create ${name} channel:`, error)
    }
}

async function clearExistingData() {
    if (config.NODE_ENV !== 'development') {
        console.error('Cannot clear data in non-development environment')
        process.exit(1)
    }

    try {
        // Delete messages in both channels
        const { data: channels } = await supabase.from('channels').select('id')

        if (channels) {
            for (const channel of channels) {
                await supabase
                    .from('messages')
                    .delete()
                    .eq('channel_id', channel.id)
                await supabase
                    .from('channel_members')
                    .delete()
                    .eq('channel_id', channel.id)
                await supabase
                    .from('channels')
                    .delete()
                    .eq('channel_id', channel.id)
            }
            console.log(`Cleared ${channels.length} channels`)
        }

        // Delete test users
        for (const user of testUsers) {
            await supabase.from('users').delete().eq('email', user.email)
        }

        // Delete system user
        await supabase.from('users').delete().eq('email', botUserConfig.email)

        console.log('Cleared existing test data')
    } catch (error) {
        console.error('Error clearing existing data:', error)
    }
}

async function createPrivateChannel() {
    try {
        // Use pgcrypto's crypt function to hash the password
        const { data: passwordHash, error: hashError } = await supabase.rpc(
            'crypt_password',
            {
                password: 'secret123',
            },
        )

        if (hashError) {
            console.error('Failed to hash password:', hashError)
            return
        }

        const { data: channel, error } = await supabase
            .from('channels')
            .insert({
                name: 'private-announcements',
                is_private: true,
                password_hash: passwordHash,
                channel_type: 'channel',
                created_by: systemUserId,
            })
            .select()
            .single()

        if (error) {
            console.error('Failed to create private channel:', error)
            return
        }

        console.log('Created private channel:', channel.id)

        // Add system user as channel member
        await addChannelMember(channel.id, systemUserId!)

        // Add a welcome message explaining the private channel
        const { error: messageError } = await supabase.from('messages').insert({
            channel_id: channel.id,
            content:
                '🔒 Welcome to the private announcements channel! This channel is password-protected. Share the password (secret123) only with team members who need access to important announcements.',
            sender_id: systemUserId,
        })

        if (messageError) {
            console.error('Failed to create welcome message:', messageError)
        }

        console.log('Seeded private channel with welcome message')
    } catch (error) {
        console.error('Failed to create private channel:', error)
    }
}

export async function seedDev() {
    if (config.NODE_ENV !== 'development') {
        console.error('This script can only be run in development environment')
        process.exit(1)
    }

    console.log('Starting test data seeding...')

    // Clear any existing test data
    await clearExistingData()

    // Create users and channels
    await createSystemUser()
    await createTestUsers()

    // Create both channels with their respective messages
    await createChannel('general', generalMessages)
    await createChannel('ai-test', aiMessages)
    await createPrivateChannel()

    console.log('Test data seeding completed!')
}

await seedDev().catch(console.error)
