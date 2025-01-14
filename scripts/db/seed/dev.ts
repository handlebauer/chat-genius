#!/usr/bin/env bun

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { config } from '@/config'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Store user IDs for reference
const userIds: { [key: string]: string } = {}
let aiChannelId: string | null = null
let systemUserId: string | null = null

// Test users for AI discussions
const testUsers = [
    {
        email: 'alice@test.com',
        name: 'Alice (AI Engineer)',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    },
    {
        email: 'bob@test.com',
        name: 'Bob (ML Researcher)',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    },
    {
        email: 'carol@test.com',
        name: 'Carol (Data Scientist)',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol',
    },
]

// AI discussion messages - covering highly distinct topics and language patterns
const aiMessages = [
    // Scientific/Technical Messages
    {
        content:
            'Our quantum computing simulation achieved 99.9% accuracy in predicting molecular structures. The quantum entanglement patterns were particularly fascinating.',
        sender: 'alice@test.com',
    },
    {
        content:
            'Breaking: Deep sea exploration robot discovered 5 new species at 11,000m depth in the Mariana Trench. Bio-luminescence patterns suggest evolutionary adaptations never seen before.',
        sender: 'bob@test.com',
    },
    {
        content:
            'Mars colonization update: Our hydroponics AI system successfully grew wheat in simulated Martian soil under radiation conditions. First time in human history!',
        sender: 'carol@test.com',
    },
    {
        content:
            'Breakthrough in fusion energy: Plasma containment held stable for 24 hours at 150 million degrees Celsius. This could revolutionize clean energy production.',
        sender: 'alice@test.com',
    },
    // Consumer Tech/Lifestyle
    {
        content:
            'My smart fridge now suggests recipes based on my fitness goals and remaining ingredients. It even ordered groceries automatically when running low!',
        sender: 'bob@test.com',
    },
    {
        content:
            'Virtual reality therapy shows 92% success rate in treating chronic arachnophobia. Patients reported zero anxiety after just 3 sessions.',
        sender: 'carol@test.com',
    },
    {
        content:
            'New AI-powered dating app matches people based on their dream journal entries. Early tests show 85% compatibility rate among matched couples.',
        sender: 'alice@test.com',
    },
    {
        content:
            'Revolutionary smart fabric can change colors and patterns on demand. Fashion designers are already planning dynamic clothing lines for 2024.',
        sender: 'bob@test.com',
    },
    // Environmental/Nature
    {
        content:
            'Drone-based reforestation project successfully planted 1 million mangrove trees in coastal areas. Marine ecosystem showing signs of recovery.',
        sender: 'carol@test.com',
    },
    {
        content:
            'Arctic wildlife tracking system detected previously unknown migration patterns of narwhals. Data suggests climate adaptation strategies.',
        sender: 'alice@test.com',
    },
    // Arts/Culture
    {
        content:
            'AI-restored ancient Egyptian hieroglyphs revealed unknown dynasty. Archaeological community is buzzing with excitement about this discovery.',
        sender: 'bob@test.com',
    },
    {
        content:
            'Holographic museum exhibits allow visitors to walk through accurate reconstructions of ancient Rome. Time-travel tourism is finally here!',
        sender: 'carol@test.com',
    },
    // Sports/Health
    {
        content:
            'New biomechanical running shoes adapt to your gait in real-time. Marathon runners reported 23% less fatigue in preliminary trials.',
        sender: 'alice@test.com',
    },
    {
        content:
            'Brain-computer interface allows completely paralyzed patients to play chess online. First tournament scheduled for next month.',
        sender: 'bob@test.com',
    },
    // Education/Learning
    {
        content:
            'Personalized learning algorithm reduced high school dropout rates by 47%. System adapts to individual student learning patterns and emotional states.',
        sender: 'carol@test.com',
    },
    {
        content:
            'Language learning breakthrough: Neural implant enables instant basic comprehension of foreign languages. Clinical trials starting next year.',
        sender: 'alice@test.com',
    },
    // Business/Finance
    {
        content:
            'Quantum blockchain technology processed 1 million transactions per second while using 99% less energy than traditional systems.',
        sender: 'bob@test.com',
    },
    {
        content:
            'AI-driven microinsurance program helps small farmers in developing countries protect against crop failure. Already helped 50,000 families.',
        sender: 'carol@test.com',
    },
    // Entertainment/Gaming
    {
        content:
            'New neural gaming headset lets you control characters with thoughts alone. Response time 500% faster than traditional controllers.',
        sender: 'alice@test.com',
    },
    {
        content:
            'Procedurally generated virtual world reached size of actual universe. Players have discovered only 0.0001% after six months of exploration.',
        sender: 'bob@test.com',
    },
]

async function createSystemUser() {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .insert({
                email: 'ai-bot@test.com',
                name: 'AI Test Bot',
                avatar_url:
                    'https://api.dicebear.com/7.x/bottts/svg?seed=ai-test',
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

async function createAIChannel() {
    try {
        const { data: channel, error } = await supabase
            .from('channels')
            .insert({
                name: 'ai-testing',
                is_private: false,
                channel_type: 'channel',
                created_by: systemUserId,
            })
            .select()
            .single()

        if (error) {
            console.error('Failed to create AI testing channel:', error)
            return
        }

        aiChannelId = channel.id
        console.log('Created AI testing channel:', channel.id)

        // Add a welcome message from the system user
        const { error: messageError } = await supabase.from('messages').insert({
            channel_id: channel.id,
            content:
                'Welcome to the AI testing channel! 🤖 This channel contains test messages for vector similarity search.',
            sender_id: systemUserId,
        })

        if (messageError) {
            console.error('Failed to create welcome message:', messageError)
        }
    } catch (error) {
        console.error('Failed to create AI channel:', error)
    }
}

async function seedAIMessages() {
    if (!aiChannelId) {
        console.error('AI channel ID not found')
        return
    }

    try {
        for (const message of aiMessages) {
            const senderId = userIds[message.sender]
            if (!senderId) {
                console.warn(`No user ID found for ${message.sender}`)
                continue
            }

            const { error: messageError } = await supabase
                .from('messages')
                .insert({
                    channel_id: aiChannelId,
                    content: message.content,
                    sender_id: senderId,
                    created_at: new Date().toISOString(),
                })

            if (messageError) {
                console.error('Failed to insert message:', messageError)
            }
        }

        console.log(`Seeded ${aiMessages.length} AI test messages`)
    } catch (error) {
        console.error('Failed to seed AI messages:', error)
    }
}

async function clearExistingData() {
    if (config.NODE_ENV !== 'development') {
        console.error('Cannot clear data in non-development environment')
        process.exit(1)
    }

    try {
        // Delete messages in ai-testing channel
        const { data: channel } = await supabase
            .from('channels')
            .select('id')
            .eq('name', 'ai-testing')
            .single()

        if (channel) {
            await supabase
                .from('messages')
                .delete()
                .eq('channel_id', channel.id)
            await supabase.from('channels').delete().eq('id', channel.id)
        }

        // Delete test users
        for (const user of testUsers) {
            await supabase.from('users').delete().eq('email', user.email)
        }

        // Delete system user
        await supabase.from('users').delete().eq('email', 'ai-bot@test.com')

        console.log('Cleared existing test data')
    } catch (error) {
        console.error('Error clearing existing data:', error)
    }
}

export async function seedDev() {
    if (config.NODE_ENV !== 'development') {
        console.error('This script can only be run in development environment')
        process.exit(1)
    }

    console.log('Starting AI test data seeding...')

    // Clear any existing test data
    await clearExistingData()

    // Create users and channel
    await createSystemUser()
    await createTestUsers()
    await createAIChannel()

    // Seed messages
    await seedAIMessages()

    console.log('AI test data seeding completed!')
}

await seedDev().catch(console.error)
