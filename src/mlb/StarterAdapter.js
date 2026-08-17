const { getPitcherStats, getPitcherGameLogs } = require('./StatsApiClient');

async function resolveStarter(probablePitcher, gameDateStr, season) {
  if (!probablePitcher || !probablePitcher.id) {
    return {
      pitcherId: null,
      fullName: null,
      handedness: null,
      status: 'UNKNOWN',
      seasonStats: null,
      recentStarts: null,
      daysRest: null,
      source: 'statsapi.mlb.com',
      retrievedAt: new Date().toISOString()
    };
  }

  const pitcherId = probablePitcher.id;
  const fullName = probablePitcher.fullName;
  
  const [statsRes, logsRes] = await Promise.all([
    getPitcherStats(pitcherId, season),
    getPitcherGameLogs(pitcherId, season, 3)
  ]);

  let seasonStats = null;
  if (statsRes && statsRes.data && statsRes.data.stats && statsRes.data.stats[0] && statsRes.data.stats[0].splits && statsRes.data.stats[0].splits[0]) {
    const s = statsRes.data.stats[0].splits[0].stat;
    seasonStats = {
      era: s.era,
      whip: s.whip,
      inningsPitched: s.inningsPitched,
      strikeouts: s.strikeOuts,
      walks: s.baseOnBalls,
      homeRunsAllowed: s.homeRuns
    };
  }

  let recentStarts = [];
  let daysRest = null;
  if (logsRes && logsRes.data && logsRes.data.stats && logsRes.data.stats[0] && logsRes.data.stats[0].splits) {
    const splits = logsRes.data.stats[0].splits;
    recentStarts = splits.slice(0, 3).map(split => ({
      date: split.date,
      opponent: split.opponent.name,
      ip: split.stat.inningsPitched,
      er: split.stat.earnedRuns,
      k: split.stat.strikeOuts,
      bb: split.stat.baseOnBalls,
      result: split.isWin ? 'W' : (split.isLoss ? 'L' : 'ND')
    }));
    
    if (splits.length > 0) {
      const lastStart = new Date(splits[0].date);
      const gameDate = new Date(gameDateStr);
      const diffTime = Math.abs(gameDate - lastStart);
      daysRest = Math.floor(diffTime / (1000 * 60 * 60 * 24)) - 1;
    }
  }

  return {
    pitcherId,
    fullName,
    handedness: null,
    status: 'CONFIRMED',
    seasonStats,
    recentStarts,
    daysRest,
    source: 'statsapi.mlb.com',
    retrievedAt: new Date().toISOString()
  };
}

module.exports = { resolveStarter };
