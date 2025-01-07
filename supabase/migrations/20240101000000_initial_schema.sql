-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ULID generation function
CREATE OR REPLACE FUNCTION gen_ulid() RETURNS text AS $$
DECLARE
  -- Crockford's Base32
  encoding   CHAR(32) := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  timestamp  BIGINT;
  output     TEXT := '';
  unix_time  BIGINT;
  ulid_chars CHAR(2);
  counter    INT;
BEGIN
  -- Get current Unix timestamp in milliseconds
  unix_time := (EXTRACT(EPOCH FROM CLOCK_TIMESTAMP()) * 1000)::BIGINT;

  -- Generate timestamp part (first 10 chars)
  timestamp := unix_time;
  FOR i IN REVERSE 9..0 LOOP
    output := output || substr(encoding, (timestamp % 32)::integer + 1, 1);
    timestamp := timestamp >> 5;
  END LOOP;

  -- Generate random part (last 16 chars)
  FOR i IN 0..15 LOOP
    output := output || substr(encoding, 1 + (random() * 31)::integer, 1);
  END LOOP;

  RETURN output;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create channels table
CREATE TABLE channels (
    id TEXT PRIMARY KEY DEFAULT gen_ulid(),
    name TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
    thread_id UUID,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable realtime for messages table
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Create threads table
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
    parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create reactions table
CREATE TABLE reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(message_id, user_id, emoji)
);

-- Add foreign key constraint for thread_id in messages table
ALTER TABLE messages
ADD CONSTRAINT fk_thread
FOREIGN KEY (thread_id)
REFERENCES threads(id)
ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_reactions_message_id ON reactions(message_id);
CREATE INDEX idx_threads_parent_message_id ON threads(parent_message_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
