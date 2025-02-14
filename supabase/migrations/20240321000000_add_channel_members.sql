-- Create channel member role enum
CREATE TYPE channel_member_role AS ENUM ('owner', 'admin', 'member');

-- Create channel_members junction table
CREATE TABLE channel_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role channel_member_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(channel_id, user_id)
);

-- Add indexes for better query performance
CREATE INDEX idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user_id ON channel_members(user_id);
CREATE INDEX idx_channel_members_role ON channel_members(role);

-- Enable realtime for channel_members table
ALTER TABLE channel_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_members;

-- Add trigger for channel_members updated_at
CREATE TRIGGER update_channel_members_updated_at
    BEFORE UPDATE ON channel_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Automatically add channel creator as owner when channel is created (only for regular channels)
CREATE OR REPLACE FUNCTION add_channel_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
    -- Only add creator as owner for regular channels, not DMs
    IF NEW.channel_type = 'channel' THEN
        -- Use SECURITY DEFINER to bypass RLS
        INSERT INTO channel_members (channel_id, user_id, role)
        VALUES (NEW.id, NEW.created_by, 'owner');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER add_channel_creator_membership
    AFTER INSERT ON channels
    FOR EACH ROW
    EXECUTE FUNCTION add_channel_creator_as_owner();

-- Add RLS policies for channel_members
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

-- Create a function to check if a user is a member of a channel
CREATE OR REPLACE FUNCTION is_channel_member(channel_id TEXT, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = $1
        AND cm.user_id = $2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user is an admin or owner of a channel
CREATE OR REPLACE FUNCTION is_channel_admin(channel_id TEXT, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM channel_members cm
        JOIN channels c ON c.id = cm.channel_id
        WHERE cm.channel_id = $1
        AND cm.user_id = $2
        AND (
            -- For regular channels, check admin/owner role
            (c.channel_type = 'channel' AND cm.role IN ('admin', 'owner'))
            OR
            -- For DMs, any member can manage the channel
            (c.channel_type = 'direct_message' AND cm.role = 'member')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow viewing members of any channel you're a member of
CREATE POLICY "Allow viewing members if in channel"
    ON channel_members
    FOR SELECT
    USING (
        -- Can view if channel is public
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = channel_members.channel_id
            AND NOT c.is_private
        )
        OR
        -- Or if you're a member of the channel
        is_channel_member(channel_members.channel_id, auth.uid())
    );

-- Allow admins to insert new members
CREATE POLICY "Allow admins to add members"
    ON channel_members
    FOR INSERT
    WITH CHECK (
        (
            -- User can only insert themselves
            auth.uid() = user_id
            AND (
                -- Into public channels as regular member
                (
                    EXISTS (
                        SELECT 1 FROM channels c
                        WHERE c.id = channel_id
                        AND NOT c.is_private
                    )
                    AND role = 'member'
                )
                OR
                -- Or into private channels if they have the password (verified by server-side code)
                (
                    EXISTS (
                        SELECT 1 FROM channels c
                        WHERE c.id = channel_id
                        AND c.is_private
                    )
                    AND role = 'member'
                )
                OR
                -- Or if they're an admin of the channel
                is_channel_admin(channel_id, auth.uid())
            )
        )
        OR
        -- Special case for DM creation: allow creator to add both members
        (
            EXISTS (
                SELECT 1 FROM channels c
                WHERE c.id = channel_id
                AND c.channel_type = 'direct_message'
                AND c.created_by = auth.uid()
                AND role = 'member'
            )
        )
    );

-- Allow admins to update members
CREATE POLICY "Allow admins to update members"
    ON channel_members
    FOR UPDATE
    USING (
        is_channel_admin(channel_id, auth.uid())
    )
    WITH CHECK (
        is_channel_admin(channel_id, auth.uid())
    );

-- Allow admins to delete members
CREATE POLICY "Allow admins to delete members"
    ON channel_members
    FOR DELETE
    USING (
        is_channel_admin(channel_id, auth.uid())
        OR
        (user_id = auth.uid() AND role != 'owner')
    );
