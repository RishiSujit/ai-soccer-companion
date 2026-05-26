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
  console.log('\nEstimated time: 12-15 minutes\n');

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

  console.log('\n' + '#'.repeat(60));
  console.log('  EVAL SUITE COMPLETE');
  console.log('#'.repeat(60) + '\n');
}

runAll();
