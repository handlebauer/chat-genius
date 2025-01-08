-- Add search vector column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- Create index for full-text search if it doesn't exist
CREATE INDEX IF NOT EXISTS messages_search_idx ON messages USING GIN (search_vector);
