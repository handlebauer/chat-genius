-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Add a vector column to the messages table for storing OpenAI text-embedding-3-small vectors
alter table messages add column if not exists embedding_vector vector(1536);

-- Create a function that automatically nullifies the embedding when message content is updated
-- This ensures that outdated embeddings are not kept around and will be regenerated by the embedding generation script
create or replace function messages_embedding_vector_update() returns trigger as $$
begin
    -- Set embedding to null when content changes so it will be regenerated
    new.embedding_vector := null;
    return new;
end;
$$ language plpgsql;

-- Create a trigger to reset embedding_vector when content is updated
create trigger messages_embedding_vector_trigger
    before update of content on messages
    for each row
    execute function messages_embedding_vector_update();

-- Drop the existing B-tree index if it exists
drop index if exists messages_embedding_vector_idx;

-- Create an HNSW index for approximate nearest neighbor search
-- This is more efficient for high-dimensional vectors and doesn't have the B-tree size limitations
create index if not exists messages_embedding_vector_idx
    on messages
    using hnsw (embedding_vector vector_cosine_ops)
    with (
        m = 16,        -- max number of connections per layer (default: 16)
        ef_construction = 64  -- size of the dynamic candidate list (default: 64)
    );

drop function if exists match_messages;

create or replace function public.match_messages (
    query_embedding vector(1536),
    match_threshold float default 0.7,
    match_count int default 5
)
returns table (
    id text,
    content text,
    channel_id text,
    sender_id text,
    created_at timestamptz,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        messages.id::text,
        messages.content,
        messages.channel_id::text,
        messages.sender_id::text,
        messages.created_at,
        1 - (messages.embedding_vector <=> query_embedding) as similarity
    from messages
    where messages.embedding_vector is not null
    and 1 - (messages.embedding_vector <=> query_embedding) > match_threshold
    order by messages.embedding_vector <=> query_embedding
    limit match_count;
end;
$$;
