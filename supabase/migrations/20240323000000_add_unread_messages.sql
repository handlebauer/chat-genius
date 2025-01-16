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
    -- Update unread_count for all channel members except the message sender
    INSERT INTO public.unread_messages (channel_id, user_id, unread_count)
    SELECT
        NEW.channel_id,
        cm.user_id,
        1
    FROM public.channel_members cm
    WHERE cm.channel_id = NEW.channel_id
    AND cm.user_id != NEW.sender_id
    ON CONFLICT (channel_id, user_id)
    DO UPDATE SET
        unread_count = public.unread_messages.unread_count + 1,
        updated_at = NOW();

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

