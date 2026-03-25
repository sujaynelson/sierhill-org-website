CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    title VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_filename ON documents (filename);
