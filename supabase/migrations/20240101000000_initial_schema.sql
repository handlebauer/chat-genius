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

-- Create channel type enum
CREATE TYPE channel_type AS ENUM ('channel', 'direct_message');

-- Create channels table
CREATE TABLE channels (
    id TEXT PRIMARY KEY DEFAULT gen_ulid(),
    name TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false,
    channel_type channel_type NOT NULL DEFAULT 'channel',
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

-- Create index for full-text search
CREATE INDEX messages_search_idx ON messages USING GIN (search_vector);

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

-- Enable realtime for reactions table
ALTER TABLE reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;

-- Create attachments table
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    content_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for better query performance on attachments
CREATE INDEX idx_attachments_message_id ON attachments(message_id);

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

-- Add trigger for attachments updated_at
CREATE TRIGGER update_attachments_updated_at
    BEFORE UPDATE ON attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

-- Create storage bucket for file attachments if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES (
    'attachments',
    'attachments',
    true -- Making it public since we'll control access through policies
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Set up storage policies for the attachments bucket
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

-- Only authenticated users can upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments' AND
  (storage.foldername(name))[1] = 'public'
);

-- Users can only delete their own uploads
CREATE POLICY "Allow users to delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Add an index on the channel name for faster lookups
CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);
