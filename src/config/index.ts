import { z } from 'zod'

const envSchema = z.enum(['development', 'test', 'production'])

// Add bot user configuration
export const botUserConfig = {
    email: 'ai-bot@test.com',
    name: 'Bot',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ai-test',
} as const

const configSchema = z.object({
    NODE_ENV: envSchema.default('development'),
    // Supabase configuration
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    // Site configuration
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    // Auth configuration
    SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET: z.string().optional(),
    SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET: z.string().optional(),
    SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID: z.string().optional(),
    SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID: z.string().optional(),
})

type Config = z.infer<typeof configSchema>

function validateConfig(): Config {
    try {
        return configSchema.parse({
            NODE_ENV: process.env.NODE_ENV,
            NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY:
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:
                process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
            SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET:
                process.env.SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET,
            SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET:
                process.env.SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET,
            SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID:
                process.env.SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID,
            SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID:
                process.env.SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID,
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error(
                `❌ Invalid configuration for ${process.env.NODE_ENV} environment:`,
            )
            error.errors.forEach(err => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`)
            })
            process.exit(1)
        }
        throw error
    }
}

export const config = validateConfig()
