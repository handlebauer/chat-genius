-- Create a system user and store its UUID
DO $$
DECLARE
    system_user_id UUID;
    general_channel_id TEXT;
    ai_channel_id TEXT;
    docs_message_id UUID;
    welcome_message_id UUID;
    thread_id UUID;
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
        gen_ulid(),
        'general',
        false,
        system_user_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ),
      (
        gen_ulid(),
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
        'Thanks for the warm welcome! Excited to be here.',
        general_channel_id,
        system_user_id,
        thread_id,
        CURRENT_TIMESTAMP - INTERVAL '1 day 23 hours',
        CURRENT_TIMESTAMP - INTERVAL '1 day 23 hours'
      ),
      (
        gen_random_uuid(),
        'Looking forward to collaborating with everyone!',
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

    -- Get the ID of the documentation message
    SELECT id INTO docs_message_id
    FROM messages
    WHERE content LIKE '%documentation%'
    AND channel_id = general_channel_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Insert a sample PDF attachment for the documentation message
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
        docs_message_id,
        'chatgenius-quickstart-guide.pdf',
        1048576, -- 1MB sample size
        'pdf',
        'public/attachments/chatgenius-quickstart-guide.pdf',
        'application/pdf',
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
