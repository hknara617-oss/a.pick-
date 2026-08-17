const assert = require('assert');

function removeVig2Way(odds1, odds2) {
  const raw1 = 1 / odds1;
  const raw2 = 1 / odds2;
  const overround = raw1 + raw2;
  const noVig1 = raw1 / overround;
  const noVig2 = raw2 / overround;
  return { raw1, raw2, overround, noVig1, noVig2 };
}

function removeVig3Way(odds1, odds2, odds3) {
  const raw1 = 1 / odds1;
  const raw2 = 1 / odds2;
  const raw3 = 1 / odds3;
  const overround = raw1 + raw2 + raw3;
  const noVig1 = raw1 / overround;
  const noVig2 = raw2 / overround;
  const noVig3 = raw3 / overround;
  return { raw1, raw2, raw3, overround, noVig1, noVig2, noVig3 };
}

function createMarketPrior(gameId, marketId, homeOdds, awayOdds) {
  const vigRes = removeVig2Way(homeOdds, awayOdds);
  return {
    gameId,
    marketId,
    homeOdds,
    awayOdds,
    rawHomeProbability: vigRes.raw1,
    rawAwayProbability: vigRes.raw2,
    overround: vigRes.overround,
    noVigHomeProbability: vigRes.noVig1,
    noVigAwayProbability: vigRes.noVig2,
    observedAt: new Date().toISOString()
  };
}

if (require.main === module) {
  const res2 = removeVig2Way(1.63, 1.91);
  assert(Math.abs(res2.noVig1 + res2.noVig2 - 1.0) < 1e-10, '2-way sum must be exactly 1.0');
  
  const res3 = removeVig3Way(2.0, 3.0, 4.0);
  assert(Math.abs(res3.noVig1 + res3.noVig2 + res3.noVig3 - 1.0) < 1e-10, '3-way sum must be exactly 1.0');
  
  console.log('BettingMath tests passed');
}

module.exports = { removeVig2Way, removeVig3Way, createMarketPrior };
