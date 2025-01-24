-- Create channel_webhooks table
CREATE TABLE IF NOT EXISTS channel_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create an index on channel_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_channel_webhooks_channel_id ON channel_webhooks(channel_id);

-- Add RLS policies
ALTER TABLE channel_webhooks ENABLE ROW LEVEL SECURITY;

-- Policy to allow channel owners to manage webhooks
CREATE POLICY "Channel owners can manage webhooks" ON channel_webhooks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM channel_members cm
            WHERE cm.channel_id = channel_webhooks.channel_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'owner'
        )
    );

-- Policy to allow reading webhooks for channel members
CREATE POLICY "Channel members can view webhooks" ON channel_webhooks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM channel_members cm
            WHERE cm.channel_id = channel_webhooks.channel_id
            AND cm.user_id = auth.uid()
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_channel_webhooks_updated_at
    BEFORE UPDATE ON channel_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
