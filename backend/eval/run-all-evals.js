'use strict';

const { execSync } = require('child_process');
const path = require('path');

async function runAll() {
  console.log('\n' + '#'.repeat(60));
  console.log('  AI SOCCER COMPANION -- FULL EVAL SUITE');
  console.log('#'.repeat(60));
  console.log('\nThis will run:');
  console.log('  1. Dataset 2b -- Signal accuracy (fast)');
  console.log('  2. Dataset 1  -- Static golden set (slow, ~10 min)');
  console.log('  3. Dataset 3  -- Live scenarios (slow, ~6 min)');
  console.log('\nEstimated time: 20-25 minutes\n');

  // Step 1 — Signal eval (fast, no API calls)
  console.log('\n--- STEP 1: Signal Eval ---\n');
  try {
    execSync(
      `node ${path.join(__dirname, 'run-signal-eval.js')}`,
      { stdio: 'inherit' }
    );
  } catch (err) {
    console.error('Signal eval failed:', err);
  }

  // Step 2 — Static eval (slow, API calls)
  console.log('\n--- STEP 2: Static Eval ---\n');
  const args = process.argv.slice(2);
  const quickFlag = args.includes('--quick') ? '--quick' : '';
  const skipBaseline = args.includes('--skip-baseline') ? '--skip-baseline' : '';

  try {
    execSync(
      `node ${path.join(__dirname, 'run-eval.js')} ${quickFlag} ${skipBaseline}`,
      { stdio: 'inherit' }
    );
  } catch (err) {
    console.error('Static eval failed:', err);
  }

  // Step 3 — Live scenario eval
  console.log('\n--- STEP 3: Live Eval ---\n');
  try {
    execSync(
      `node ${path.join(__dirname, 'run-live-eval.js')} ${quickFlag}`,
      { stdio: 'inherit' }
    );
  } catch (err) {
    console.error('Live eval failed:', err);
  }

  console.log('\n' + '#'.repeat(60));
  console.log('  EVAL SUITE COMPLETE');
  console.log('#'.repeat(60) + '\n');

  // ─────────────────────────────────────────
  // Improvement workflow prompt
  // ─────────────────────────────────────────
  console.log('─'.repeat(50));
  console.log('NEXT STEPS:');
  console.log('─'.repeat(50));
  console.log('\n1. Review results in backend/eval/');
  console.log('2. Run improvement analysis:');
  console.log('   node backend/scripts/improve-from-feedback.js');
  console.log('\n3. Apply suggested fixes to:');
  console.log('   → backend/lib/matchSignals.js');
  console.log('   → backend/routes/companion.js');
  console.log('   → backend/knowledge-base/soccer-facts.txt');
  console.log('\n4. Re-run quick eval to confirm:');
  console.log('   node backend/eval/run-eval.js --quick --skip-baseline');
  console.log('\n5. If gates pass — deploy:');
  console.log('   git add . && git commit -m "fix: post-eval improvements" && git push');
  console.log('─'.repeat(50) + '\n');
}

runAll();
