'use strict';

// In-memory store (resets per cold-start, fine for MVP)
const store = {
    trackedDecisions: [],
    imports: []
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    const send = (data, code = 200) => {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = code;
        res.end(JSON.stringify(data));
    };

    // GET /api/watch
    send({
        trackedCount: store.trackedDecisions.length,
        tracked: store.trackedDecisions,
        inbox: [],
        bundleCards: []
    });
};
