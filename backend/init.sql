CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS links (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    original_url TEXT NOT NULL,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    analytics_code VARCHAR(20) UNIQUE,
    analytics_level VARCHAR(20) NOT NULL DEFAULT 'minimal',
    virus_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    last_virus_scan TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    redirect_type VARCHAR(20) NOT NULL DEFAULT 'immediate',
    delay_seconds INTEGER
);

CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    link_id INTEGER REFERENCES links(id) ON DELETE CASCADE,
    visited_at TIMESTAMP,
    redirected_at TIMESTAMP,
    accepted_risk_at TIMESTAMP,
    ip VARCHAR(45),
    country VARCHAR(100),
    device_type VARCHAR(50),
    os VARCHAR(100),
    browser VARCHAR(100),
    language VARCHAR(50),
    user_agent TEXT
);

CREATE TABLE IF NOT EXISTS virus_scans (
    id SERIAL PRIMARY KEY,
    link_id INTEGER REFERENCES links(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    scan_id VARCHAR(255),
    scanned_at TIMESTAMP DEFAULT NOW()
);