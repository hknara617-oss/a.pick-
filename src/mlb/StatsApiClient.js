const https = require('https');

function fetch(endpoint) {
  return new Promise((resolve) => {
    https.get(`https://statsapi.mlb.com${endpoint}`, (res) => {
      if (res.statusCode !== 200) {
        return resolve(null);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function wrapResponse(endpoint, season, data) {
  if (!data) return null;
  return {
    source: 'statsapi.mlb.com',
    endpoint,
    retrievedAt: new Date().toISOString(),
    season,
    data
  };
}

async function getSchedule(date) {
  const endpoint = `/api/v1/schedule?sportId=1&date=${date}`;
  const data = await fetch(endpoint);
  if (!data || !data.dates || !data.dates.length) return null;
  return wrapResponse(endpoint, null, data.dates[0].games);
}

async function getTeamBattingStats(season) {
  // Using alternative endpoint as prompt suggested
  const endpoint = `/api/v1/stats?stats=season&group=hitting&season=${season}&sportId=1&playerPool=ALL`;
  const data = await fetch(endpoint);
  return wrapResponse(endpoint, season, data);
}

async function getTeamPitchingStats(season) {
  const endpoint = `/api/v1/teams/stats?group=pitching&stats=season&season=${season}`;
  const data = await fetch(endpoint);
  return wrapResponse(endpoint, season, data);
}

async function getPitcherStats(pitcherId, season) {
  const endpoint = `/api/v1/people/${pitcherId}/stats?stats=season&group=pitching&season=${season}`;
  const data = await fetch(endpoint);
  return wrapResponse(endpoint, season, data);
}

async function getPitcherGameLogs(pitcherId, season, limit) {
  const endpoint = `/api/v1/people/${pitcherId}/stats?stats=gameLog&group=pitching&season=${season}`;
  const data = await fetch(endpoint);
  if (data && data.stats && data.stats[0] && data.stats[0].splits && limit) {
    data.stats[0].splits = data.stats[0].splits.slice(0, limit);
  }
  return wrapResponse(endpoint, season, data);
}

async function getTeamGameLogs(teamId, season, limit) {
  const endpoint = `/api/v1/teams/${teamId}/stats?stats=gameLog&group=pitching&season=${season}`;
  const data = await fetch(endpoint);
  if (data && data.stats && data.stats[0] && data.stats[0].splits && limit) {
    data.stats[0].splits = data.stats[0].splits.slice(0, limit);
  }
  return wrapResponse(endpoint, season, data);
}

async function getVenues() {
  const endpoint = `/api/v1/venues`;
  const data = await fetch(endpoint);
  return wrapResponse(endpoint, null, data);
}

module.exports = {
  getSchedule,
  getTeamBattingStats,
  getTeamPitchingStats,
  getPitcherStats,
  getPitcherGameLogs,
  getTeamGameLogs,
  getVenues
};
