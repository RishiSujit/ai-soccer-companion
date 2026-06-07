const { scoreDate } = require('../lib/scoringEngine');

async function runDailyScoring() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const result = await scoreDate(today);
    if (result.scored > 0) {
      console.log(`[runDailyScoring] Scored ${result.scored} predictions for ${today}`);
    }
    return result;
  } catch (err) {
    console.error('[runDailyScoring] Error:', err.message);
    return { scored: 0, error: err.message };
  }
}

module.exports = { runDailyScoring };
