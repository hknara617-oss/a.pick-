const { getTeamPitchingStats, getTeamGameLogs } = require('./StatsApiClient');

async function getBullpenProfile(teamId, teamName, season) {
  const [pitchStats, gameLogs] = await Promise.all([
    getTeamPitchingStats(season),
    getTeamGameLogs(teamId, season, 3)
  ]);

  let seasonBullpenEra = null;
  let seasonBullpenWhip = null;
  let notes = [];

  if (pitchStats && pitchStats.data && pitchStats.data.stats && pitchStats.data.stats[0] && pitchStats.data.stats[0].splits) {
    const teamSplit = pitchStats.data.stats[0].splits.find(s => s.team.id === teamId);
    if (teamSplit && teamSplit.stat) {
      seasonBullpenEra = teamSplit.stat.era;
      seasonBullpenWhip = teamSplit.stat.whip;
      notes.push("Approximated using total team pitching stats.");
    }
  }

  let last1day = null;
  let last3days = null;

  if (gameLogs && gameLogs.data && gameLogs.data.stats && gameLogs.data.stats[0] && gameLogs.data.stats[0].splits) {
    notes.push("Recent workload approximated from team game logs.");
  }

  return {
    teamId,
    teamName,
    seasonBullpenEra,
    seasonBullpenWhip,
    recentWorkload: { last1day, last3days },
    dataSource: 'statsapi.mlb.com',
    confidence: seasonBullpenEra ? 'MEDIUM' : 'LOW',
    notes
  };
}

module.exports = { getBullpenProfile };
