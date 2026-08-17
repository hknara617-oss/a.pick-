-- migrations/006_rls_and_security.sql
-- Row Level Security (RLS) policies for Supabase / PostgreSQL deployment

-- Enable RLS on User-Owned Tables
ALTER TABLE decision_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_candidates ENABLE ROW LEVEL SECURITY;

-- 1. Decision Contracts: Users can view & create their own contracts. No direct updates.
CREATE POLICY p_user_read_own_contracts ON decision_contracts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY p_user_insert_own_contracts ON decision_contracts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Decision Events: Users can read events belonging to their contracts.
CREATE POLICY p_user_read_own_events ON decision_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM decision_contracts dc
            WHERE dc.id = decision_events.decision_id
              AND dc.user_id = auth.uid()
        )
    );

-- 3. Watch Targets: Users can read and pause/resume their own watch targets.
CREATE POLICY p_user_read_own_watch_targets ON watch_targets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM decision_contracts dc
            WHERE dc.id = watch_targets.decision_id
              AND dc.user_id = auth.uid()
        )
    );

CREATE POLICY p_user_update_own_watch_targets ON watch_targets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM decision_contracts dc
            WHERE dc.id = watch_targets.decision_id
              AND dc.user_id = auth.uid()
        )
    );

-- 4. Notification Candidates: Users can read their own notifications.
CREATE POLICY p_user_read_own_notifications ON notification_candidates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM decision_contracts dc
            WHERE dc.id = notification_candidates.decision_id
              AND dc.user_id = auth.uid()
        )
    );

-- 5. Shared Provider Data (Public / System Read-Only)
-- market_observations, selection_observations, sport_events, context_snapshots are shared system tables.
ALTER TABLE sport_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_public_read_sport_events ON sport_events FOR SELECT USING (true);
CREATE POLICY p_public_read_markets ON markets FOR SELECT USING (true);
CREATE POLICY p_public_read_selections ON selections FOR SELECT USING (true);
CREATE POLICY p_public_read_market_obs ON market_observations FOR SELECT USING (true);
CREATE POLICY p_public_read_selection_obs ON selection_observations FOR SELECT USING (true);
CREATE POLICY p_public_read_context_snapshots ON context_snapshots FOR SELECT USING (true);

-- Service Role (Ingestion Worker) bypasses RLS to insert market observations and process watches.
