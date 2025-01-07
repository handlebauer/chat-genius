-- Create a system user and store its UUID
DO $$
DECLARE
    system_user_id UUID;
    general_channel_id UUID;
    ai_channel_id UUID;
BEGIN
    -- Insert system user and get its ID
    INSERT INTO users (id, email, name, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'system@chatgenius.local',
        'System',
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
        gen_random_uuid(),
        'general',
        false,
        system_user_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ),
      (
        gen_random_uuid(),
        'ai',
        false,
        system_user_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    ON CONFLICT (name) DO NOTHING;

    -- Get channel IDs for message insertion
    SELECT id INTO general_channel_id FROM channels WHERE name = 'general';
    SELECT id INTO ai_channel_id FROM channels WHERE name = 'ai';

    -- Insert seed messages for general channel
    INSERT INTO messages (id, content, channel_id, sender_id, created_at, updated_at)
    VALUES
      (
        gen_random_uuid(),
        'Welcome to ChatGenius! This is the general channel for team-wide discussions.',
        general_channel_id,
        system_user_id,
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        CURRENT_TIMESTAMP - INTERVAL '2 days'
      ),
      (
        gen_random_uuid(),
        'Feel free to introduce yourself and connect with your teammates here!',
        general_channel_id,
        system_user_id,
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
      ),
      (
        gen_random_uuid(),
        'Remember to check out our documentation for tips on using ChatGenius effectively.',
        general_channel_id,
        system_user_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );

    -- Insert seed messages for ai channel
    INSERT INTO messages (id, content, channel_id, sender_id, created_at, updated_at)
    VALUES
      (
        gen_random_uuid(),
        'Welcome to the AI channel! Here we discuss all things artificial intelligence.',
        ai_channel_id,
        system_user_id,
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
      ),
      (
        gen_random_uuid(),
        'Share your favorite AI tools, experiences, and insights with the team!',
        ai_channel_id,
        system_user_id,
        CURRENT_TIMESTAMP - INTERVAL '12 hours',
        CURRENT_TIMESTAMP - INTERVAL '12 hours'
      );
END $$;

-- Add an index on the channel name for faster lookups
CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);

-- Add a comment explaining the purpose of these channels
COMMENT ON TABLE channels IS 'Chat channels for team communication';
