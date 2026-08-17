-- migrations/002_market_observations.sql
-- Immutable time-series: market_observations, selection_observations, context_snapshots, provider_health_observations

CREATE TABLE IF NOT EXISTS market_observations (
    id UUID PRIMARY KEY,
    provider VARCHAR(64) NOT NULL,
    round_id VARCHAR(64) NOT NULL,
    market_id VARCHAR(128) NOT NULL,
    event_id VARCHAR(128) NOT NULL,
    market_type VARCHAR(64) NOT NULL,
    line VARCHAR(32),
    availability VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    observed_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    provider_health VARCHAR(32) NOT NULL DEFAULT 'HEALTHY',
    payload_hash VARCHAR(64) NOT NULL,
    created_db_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_market_observation_idempotency UNIQUE (provider, round_id, market_id, observed_at, payload_hash)
);

CREATE TABLE IF NOT EXISTS selection_observations (
    id UUID PRIMARY KEY,
    market_observation_id UUID NOT NULL REFERENCES market_observations(id) ON DELETE CASCADE,
    selection_id VARCHAR(128) NOT NULL,
    label VARCHAR(128) NOT NULL,
    side VARCHAR(32) NOT NULL,
    odds NUMERIC(8, 4) NOT NULL,
    availability VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    created_db_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_selection_observation UNIQUE (market_observation_id, selection_id)
);

CREATE TABLE IF NOT EXISTS context_snapshots (
    id UUID PRIMARY KEY,
    sport VARCHAR(64) NOT NULL,
    event_id VARCHAR(128) NOT NULL,
    adapter VARCHAR(128) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    freshness VARCHAR(32) NOT NULL DEFAULT 'FRESH',
    signals JSONB NOT NULL DEFAULT '[]'::jsonb,
    critical_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
    payload_hash VARCHAR(64) NOT NULL,
    created_db_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_context_snapshot UNIQUE (sport, event_id, observed_at, payload_hash)
);

CREATE TABLE IF NOT EXISTS provider_health_observations (
    id UUID PRIMARY KEY,
    provider VARCHAR(64) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL, -- HEALTHY, DEGRADED, STALE, DOWN, INVALID
    latency_ms INT,
    error_code VARCHAR(64),
    details JSONB DEFAULT '{}'::jsonb,
    created_db_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
