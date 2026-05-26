require('dotenv').config();
const { generatePropsForUpcoming } = require('../jobs/generateProps');

generatePropsForUpcoming()
  .then(() => {
    console.log('Done — check Supabase');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
