-- Create a system user and store its UUID
DO $$
DECLARE
    system_user_id UUID;
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
END $$;

-- Add an index on the channel name for faster lookups
CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);

-- Add a comment explaining the purpose of these channels
COMMENT ON TABLE channels IS 'Chat channels for team communication';
