-- Create a system user and store its UUID
DO $$
DECLARE
    system_user_id UUID;
    general_channel_id TEXT;
    ai_channel_id TEXT;
    meme_message_id UUID;
    welcome_message_id UUID;
    thread_id UUID;
    ai_welcome_message_id UUID;
BEGIN
    -- Insert system user and get its ID
    INSERT INTO users (id, email, name, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'system@gauntletai.com',
        'GauntletAI Bot',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id INTO system_user_id;

    -- Add unique constraint on channel name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'channels_name_key'
    ) THEN
        ALTER TABLE channels ADD CONSTRAINT channels_name_key UNIQUE (name);
    END IF;

    -- Create default channels using the system user ID
    INSERT INTO channels (id, name, is_private, created_by, created_at, updated_at)
    VALUES
      (
        gen_ulid(),
        'general',
        false,
        system_user_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ),
      (
        gen_ulid(),
        'ai-memes',
        false,
        system_user_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    ON CONFLICT (name) DO NOTHING;

    -- Get channel IDs for message insertion
    SELECT id INTO general_channel_id FROM channels WHERE name = 'general';
    SELECT id INTO ai_channel_id FROM channels WHERE name = 'ai-memes';

    -- Ensure system user is a member of both channels
    INSERT INTO channel_members (channel_id, user_id, role)
    VALUES
        (general_channel_id, system_user_id, 'owner'),
        (ai_channel_id, system_user_id, 'owner')
    ON CONFLICT (channel_id, user_id) DO NOTHING;

    -- Insert seed messages for general channel
    INSERT INTO messages (id, content, channel_id, sender_id, created_at, updated_at)
    VALUES
      (
        gen_random_uuid(),
        'Welcome to GauntletAI, where we make AI our code monkey so we can focus on the actually interesting shit 🚀',
        general_channel_id,
        system_user_id,
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        CURRENT_TIMESTAMP - INTERVAL '2 days'
      )
    RETURNING id INTO welcome_message_id;

    -- Create a thread for the welcome message
    INSERT INTO threads (id, channel_id, parent_message_id, created_at)
    VALUES (
        gen_random_uuid(),
        general_channel_id,
        welcome_message_id,
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    )
    RETURNING id INTO thread_id;

    -- Add some replies to the thread
    INSERT INTO messages (id, content, channel_id, sender_id, thread_id, created_at, updated_at)
    VALUES
      (
        gen_random_uuid(),
        'Pro tip: ChatGPT is like that intern who sometimes writes brilliant code and sometimes tries to import React into a CSS file',
        general_channel_id,
        system_user_id,
        thread_id,
        CURRENT_TIMESTAMP - INTERVAL '1 day 23 hours',
        CURRENT_TIMESTAMP - INTERVAL '1 day 23 hours'
      ),
      (
        gen_random_uuid(),
        'If you''re spending more time fixing AI''s code than writing it yourself, you''re doing it wrong 🤦',
        general_channel_id,
        system_user_id,
        thread_id,
        CURRENT_TIMESTAMP - INTERVAL '1 day 22 hours',
        CURRENT_TIMESTAMP - INTERVAL '1 day 22 hours'
      );

    -- Continue with other seed messages
    INSERT INTO messages (id, content, channel_id, sender_id, created_at, updated_at)
    VALUES
      (
        gen_random_uuid(),
        'Survival guide: 1) AI is your junior dev with imposter syndrome 2) Trust but verify (lol jk, just assume it''s wrong) 3) When in doubt, read the docs that AI should''ve read but didn''t',
        general_channel_id,
        system_user_id,
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
      ),
      (
        gen_random_uuid(),
        'Just watched AI generate a 500-line solution for something that needed 5 lines. Peak comedy. 💀',
        general_channel_id,
        system_user_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );

    -- Get the ID of the meme message
    SELECT id INTO meme_message_id
    FROM messages
    WHERE content LIKE '%comedy%'
    AND channel_id = general_channel_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Insert a sample meme attachment
    INSERT INTO attachments (
        id,
        message_id,
        file_name,
        file_size,
        file_type,
        storage_path,
        content_type,
        created_at,
        updated_at
    )
    VALUES (
        gen_random_uuid(),
        meme_message_id,
        'debugging-in-prod.gif',
        524288, -- 512KB sample size
        'gif',
        'public/attachments/debugging-in-prod.gif',
        'image/gif',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- Insert seed messages for ai-memes channel
    INSERT INTO messages (id, content, channel_id, sender_id, created_at, updated_at)
    VALUES
      (
        gen_random_uuid(),
        'Welcome to AI-memes, where we document the hilarious shit our AI overlords try to pass off as production-ready code 🤖',
        ai_channel_id,
        system_user_id,
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
      )
    RETURNING id INTO ai_welcome_message_id;

    INSERT INTO messages (id, content, channel_id, sender_id, created_at, updated_at)
    VALUES
      (
        gen_random_uuid(),
        'ChatGPT just tried to solve a race condition by adding more race conditions. Outstanding move. 👌',
        ai_channel_id,
        system_user_id,
        CURRENT_TIMESTAMP - INTERVAL '12 hours',
        CURRENT_TIMESTAMP - INTERVAL '12 hours'
      );

    -- Add reactions to the welcome messages
    INSERT INTO reactions (message_id, user_id, emoji, created_at)
    VALUES
      -- Reactions for general channel welcome message
      (welcome_message_id, system_user_id, '🔥', CURRENT_TIMESTAMP - INTERVAL '2 days'),
      (welcome_message_id, system_user_id, '💀', CURRENT_TIMESTAMP - INTERVAL '2 days'),
      (welcome_message_id, system_user_id, '🤯', CURRENT_TIMESTAMP - INTERVAL '2 days'),
      -- Reactions for AI channel welcome message
      (ai_welcome_message_id, system_user_id, '🤖', CURRENT_TIMESTAMP - INTERVAL '1 day'),
      (ai_welcome_message_id, system_user_id, '🧠', CURRENT_TIMESTAMP - INTERVAL '1 day'),
      (ai_welcome_message_id, system_user_id, '☠️', CURRENT_TIMESTAMP - INTERVAL '1 day');

END $$;

-- Add an index on the channel name for faster lookups
CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);

-- Add a comment explaining the purpose of these channels
COMMENT ON TABLE channels IS 'Where devs come to celebrate and/or roast AI-assisted development';
