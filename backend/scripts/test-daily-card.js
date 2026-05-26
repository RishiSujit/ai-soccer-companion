require('dotenv').config();
const { generateDailyCards } = require('../jobs/generateDailyCard');

async function test() {
  console.log('Testing daily card generation');
  await generateDailyCards();
  console.log('Done — check Supabase daily_prediction_cards table');
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
