CREATE TABLE IF NOT EXISTS page_views (
    id          SERIAL PRIMARY KEY,
    page_path   VARCHAR(500) NOT NULL,
    referrer    VARCHAR(1000),
    user_agent  VARCHAR(1000),
    ip_hash     VARCHAR(64),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_page_views_path_date ON page_views(page_path, created_at);

CREATE TABLE IF NOT EXISTS events (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    page_path   VARCHAR(500),
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_name_date ON events(name, created_at);
