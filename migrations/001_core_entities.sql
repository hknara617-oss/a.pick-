-- migrations/001_core_entities.sql
-- Core entities: users, sport_events, markets, selections

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sport_events (
    id UUID PRIMARY KEY,
    provider VARCHAR(64) NOT NULL,
    round_id VARCHAR(64) NOT NULL,
    event_id VARCHAR(128) NOT NULL,
    sport VARCHAR(64) NOT NULL,
    league VARCHAR(128) NOT NULL,
    home_team VARCHAR(128) NOT NULL,
    away_team VARCHAR(128) NOT NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sport_event UNIQUE (provider, round_id, event_id)
);

CREATE TABLE IF NOT EXISTS markets (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES sport_events(id) ON DELETE CASCADE,
    market_id VARCHAR(128) NOT NULL,
    market_type VARCHAR(64) NOT NULL,
    line VARCHAR(32),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_market UNIQUE (event_id, market_id)
);

CREATE TABLE IF NOT EXISTS selections (
    id UUID PRIMARY KEY,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    selection_id VARCHAR(128) NOT NULL,
    label VARCHAR(128) NOT NULL,
    side VARCHAR(32) NOT NULL,
    selection_index INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_selection UNIQUE (market_id, selection_id)
);
