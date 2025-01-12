import { z } from 'zod'

const envSchema = z.enum(['development', 'test', 'production'])

const configSchema = z.object({
    NODE_ENV: envSchema.default('development'),
    // Supabase configuration
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    // Add other environment variables here
})

type Config = z.infer<typeof configSchema>

function validateConfig(): Config {
    try {
        return configSchema.parse({
            NODE_ENV: process.env.NODE_ENV,
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY:
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('❌ Invalid configuration:')
            error.errors.forEach(err => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`)
            })
            process.exit(1)
        }
        throw error
    }
}

export const config = validateConfig()
