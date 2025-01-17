-- Create a table to track unread messages per channel per user
CREATE TABLE IF NOT EXISTS public.unread_messages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id TEXT NOT NULL,
    user_id uuid NOT NULL,
    last_read_at timestamptz NOT NULL DEFAULT NOW(),
    unread_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- Add foreign key constraints after table creation
ALTER TABLE public.unread_messages
    ADD CONSTRAINT unread_messages_channel_id_fkey
    FOREIGN KEY (channel_id)
    REFERENCES public.channels(id)
    ON DELETE CASCADE;

-- Add RLS policies
ALTER TABLE public.unread_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own unread message status
CREATE POLICY "Users can read their own unread message status"
    ON public.unread_messages
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Function to update unread count when a new message is created
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
    -- For regular channels: Update unread_count for all channel members except the message sender
    IF EXISTS (SELECT 1 FROM public.channels WHERE id = NEW.channel_id AND channel_type = 'channel') THEN
        INSERT INTO public.unread_messages (channel_id, user_id, unread_count)
        SELECT
            NEW.channel_id,
            cm.user_id,
            1
        FROM public.channel_members cm
        WHERE cm.channel_id = NEW.channel_id
        AND cm.user_id != NEW.sender_id
        -- Don't increment if this is their active channel
        AND NOT EXISTS (
            SELECT 1 FROM public.active_channels ac
            WHERE ac.user_id = cm.user_id
            AND ac.channel_id = NEW.channel_id
        )
        ON CONFLICT (channel_id, user_id)
        DO UPDATE SET
            unread_count = public.unread_messages.unread_count + 1,
            updated_at = NOW();
    -- For DM channels: Update unread_count only for the recipient
    ELSIF EXISTS (SELECT 1 FROM public.channels WHERE id = NEW.channel_id AND channel_type = 'direct_message') THEN
        INSERT INTO public.unread_messages (channel_id, user_id, unread_count)
        SELECT
            NEW.channel_id,
            cm.user_id,
            1
        FROM public.channel_members cm
        WHERE cm.channel_id = NEW.channel_id
        AND cm.user_id != NEW.sender_id
        -- Don't increment if this is their active channel
        AND NOT EXISTS (
            SELECT 1 FROM public.active_channels ac
            WHERE ac.user_id = cm.user_id
            AND ac.channel_id = NEW.channel_id
        )
        ON CONFLICT (channel_id, user_id)
        DO UPDATE SET
            unread_count = public.unread_messages.unread_count + 1,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle new messages
CREATE TRIGGER on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_message();

-- Function to reset unread count
CREATE OR REPLACE FUNCTION public.reset_unread_count(p_channel_id text, p_user_id uuid)
RETURNS void AS $$
BEGIN
    INSERT INTO public.unread_messages (channel_id, user_id, unread_count)
    VALUES (p_channel_id, p_user_id, 0)
    ON CONFLICT (channel_id, user_id)
    DO UPDATE SET
        unread_count = 0,
        last_read_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for unread_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.unread_messages;

-- Create active_channels table to track which channel each user is currently viewing
CREATE TABLE IF NOT EXISTS public.active_channels (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add RLS policies for active_channels
ALTER TABLE public.active_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own active channel"
    ON public.active_channels
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id);

-- Function to update active channel
CREATE OR REPLACE FUNCTION public.set_active_channel(p_channel_id text)
RETURNS void AS $$
BEGIN
    INSERT INTO public.active_channels (user_id, channel_id)
    VALUES (auth.uid(), p_channel_id)
    ON CONFLICT (user_id)
    DO UPDATE SET
        channel_id = p_channel_id,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

