function evaluateDataQuality({
  homeStarter,
  awayStarter,
  homeOffense,
  homeBullpen,
  awayBullpen,
  game
}) {
  const starterConfirmed = (homeStarter && homeStarter.status === 'CONFIRMED') && (awayStarter && awayStarter.status === 'CONFIRMED');
  const battingFresh = !!(homeOffense && homeOffense.season === '2026');
  const bullpenAvailable = !!(homeBullpen && homeBullpen.seasonBullpenEra && awayBullpen && awayBullpen.seasonBullpenEra);
  const parkKnown = !!(game && game.venue && game.venue.id);
  const injuryDataAvailable = false;

  let overall = 'LOW';
  if (starterConfirmed && battingFresh && bullpenAvailable && parkKnown) {
    overall = 'HIGH';
  } else if (starterConfirmed && battingFresh) {
    overall = 'MEDIUM';
  }

  return {
    starterConfirmed,
    battingFresh,
    bullpenAvailable,
    parkKnown,
    injuryDataAvailable,
    overall
  };
}

module.exports = { evaluateDataQuality };
