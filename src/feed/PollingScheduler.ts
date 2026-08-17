export class PollingScheduler {
    public POLL_OPEN_MS = 60000;
    public POLL_NEAR_START_MS = 10000;
    public POLL_BACKOFF_MS = 30000;
    public MAX_CONSECUTIVE_FAILURES = 3;

    public async runControlledFetches(fetchFn: () => Promise<void>, count: number = 3): Promise<void> {
        // For Phase 3 gate: only runs controlled 3 fetches, then stops
        for (let i = 0; i < count; i++) {
            await fetchFn();
        }
    }
}
