const { evaluateDataQuality } = require('./DataQuality');

function buildFeatureSnapshot({
  game,
  marketPrior,
  homeStarter,
  awayStarter,
  homeOffense,
  awayOffense,
  homeBullpen,
  awayBullpen
}) {
  const missingFields = [];
  if (!homeStarter || homeStarter.status === 'UNKNOWN') missingFields.push('homeStarter');
  if (!awayStarter || awayStarter.status === 'UNKNOWN') missingFields.push('awayStarter');
  if (!homeOffense) missingFields.push('homeOffense');
  if (!awayOffense) missingFields.push('awayOffense');
  if (!homeBullpen || !homeBullpen.seasonBullpenEra) missingFields.push('homeBullpenEra');
  if (!awayBullpen || !awayBullpen.seasonBullpenEra) missingFields.push('awayBullpenEra');
  if (!game.venue || !game.venue.id) missingFields.push('venue');

  const dataQuality = evaluateDataQuality({
    homeStarter,
    awayStarter,
    homeOffense,
    homeBullpen,
    awayBullpen,
    game
  });

  return {
    gameId: game.gamePk,
    gamePk: game.gamePk,
    gameDate: game.gameDate,
    venue: game.venue,
    homeTeam: game.teams.home.team,
    awayTeam: game.teams.away.team,
    marketPrior,
    homeStarter,
    awayStarter,
    homeOffense,
    awayOffense,
    homeBullpen,
    awayBullpen,
    park: game.venue ? { venueId: game.venue.id, venueName: game.venue.name } : null,
    restDays: { home: null, away: null },
    injuries: null,
    dataQuality,
    missingFields,
    fetchedAt: new Date().toISOString()
  };
}

module.exports = { buildFeatureSnapshot };
