-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add text content and embedding columns to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS text_content TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 1);
