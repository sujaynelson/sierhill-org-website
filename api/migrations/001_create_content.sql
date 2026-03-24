CREATE TABLE IF NOT EXISTS pages (
    id          SERIAL PRIMARY KEY,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    title       VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sections (
    id          SERIAL PRIMARY KEY,
    page_id     INTEGER REFERENCES pages(id) ON DELETE CASCADE,
    key         VARCHAR(100) NOT NULL,
    content     JSONB NOT NULL DEFAULT '{}',
    sort_order  INTEGER DEFAULT 0,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(page_id, key)
);
