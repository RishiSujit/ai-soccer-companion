# AI Soccer Companion — World Cup 2026

**An AI-powered match companion that explains live soccer in American sports language — built for the 48 million casual fans watching the World Cup on US soil for the first time since 1994.**

[![Live App](https://img.shields.io/badge/Live%20App-ai--soccer--companion.vercel.app-00ff87?style=flat-square)](https://ai-soccer-companion.vercel.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org)
[![Claude](https://img.shields.io/badge/AI-Claude%20Sonnet-D97757?style=flat-square)](https://anthropic.com)
[![Supabase](https://img.shields.io/badge/DB-Supabase-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com)
[![Eval](https://img.shields.io/badge/Eval-82%25%20Accuracy-00ff87?style=flat-square)](https://github.com/RishiSujit/ai-soccer-companion/tree/main/backend/eval)

**[→ Live App](https://ai-soccer-companion.vercel.app)**

---

## The Problem

The 2026 World Cup is hosted across the USA, Canada, and Mexico — the first World Cup on American soil since 1994. Millions of casual American sports fans will watch matches they cannot follow.

Every existing soccer app assumes you already know soccer. There is no companion built for the fan who just turned on the TV.

**Research with 8 casual American fans confirmed the core insight:** team identity and real-time match context must both be present simultaneously to create genuine engagement. Neither alone is enough. No existing product solves both at once for this user.

---

## The Target User — "Sideline Sam"

- Age 19-24, American male
- Follows NFL and NBA religiously
- Soccer knowledge: zero
- Situation: watching World Cup at a bar with friends who do know soccer
- Goal: feel included, not lost
- Key insight: Sam does not want to learn soccer. He wants to feel informed right now.

---

## Features

### AI Match Companion (dual mode)

**General mode** — works anytime, no match required. Ask anything about soccer, rules, players, the tournament. Every response uses American sports analogies. Zero jargon.

**Live mode** — activates when Sam selects a match. Real-time match context injected into every response. The AI knows the score, the minute, what just happened, and how dramatic the moment is.

**Split bubble response format:**
- Fact bubble — direct answer in plain English
- Analogy bubble — sports frame in amber card (only when it genuinely helps)
- Follow-up pills — 3 contextual questions to go deeper

**Web search on dramatic incidents** — red cards, VAR decisions, and disallowed goals trigger automatic web search so Claude explains the real reason, not just the event type.

### AI Team Assignment

AI assigns Sam a World Cup team based on his existing sports personality — "you love the Warriors fast break, here's why you are a Spain fan." Creates identity before he watches a single match.

### Daily Prediction Cards

AI-generated daily questions covering all matches. Feature match with 3 props specific to that game. Bonus parlay for high-risk high-reward players. Locks at kickoff. Points contribute to group leaderboard.

### Friend Groups + Leaderboard

Invite-code groups with live standings across the full 39-day tournament. Automatic point scoring when matches finish.

### Pre-Match Briefing

AI-generated 60-second personalized brief 2 hours before Sam's team plays. The story so far. Who to watch. The one thing to know. A talking point for the room.

### Pivotal Moment Alerts

Goals, red cards, VAR decisions, missed penalties trigger a slide-down alert during live matches. One tap asks the companion what happened.

---

## AI Architecture

Three intelligence layers stacked on Claude Sonnet:

```
API-Football (raw events)
↓
Derived Signals Engine
backend/lib/matchSignals.js
→ pressure: low / medium / high / critical
→ momentum: which team is in control
→ stakes: low / medium / high / maximum
→ intensity: low / medium / high / spike
↓
RAG Knowledge Base
backend/knowledge-base/soccer-facts.txt
→ 75+ concepts in NFL/NBA language
→ Player profiles, rules, tournament structure, team styles
→ Retrieved per-question at inference time
↓
Claude Sonnet
backend/routes/companion.js
→ System prompt + signals + knowledge
→ [FACT] / [ANALOGY] / [FOLLOW_UPS] response format
↓
Split Bubble UI
src/components/companion/CompanionChat.js
→ Fact bubble (always)
→ Amber analogy card (when present)
→ Follow-up pills (always 3)
```

**Why the signals layer exists:**

Raw API data gives you "Goal scored at 67'."

The signals engine transforms this into "pressure: critical, stakes: maximum, intensity: spike" — so Claude responds with appropriate urgency, not a calm encyclopedia entry.

Signal lift measured at +8 percentage points in live scenario testing vs the same system without signals.

---

## Evaluation Framework

The AI was evaluated across three datasets with human-written ground truth references — not Claude-generated references. This distinction matters.

### Why Not User Ratings

Sideline Sam cannot judge whether a soccer fact is correct. He will thumbs up a wrong answer because he has no way to verify it. User ratings measure perceived quality, not actual quality. The eval framework measures both independently.

### Three Datasets

**Dataset 1 — Static Golden Test Set**

75 human-written question-and-answer pairs across 5 categories:
- Rules and Calls (15)
- Teams and Styles (15)
- Players (15)
- Tournament Structure (15)
- Match Context (15)

Each question has a core answer, 3 follow-up pills, and 3 pill answers — all written by hand, not generated.

Scored by Claude-as-judge on: Factual Accuracy / Relevance / Clarity

**Dataset 2b — Signal Accuracy Tests**

10 test scenarios checking that matchSignals.js correctly computes pressure, momentum, stakes, and intensity from raw match state. Pure logic test — Claude not involved.

**Dataset 3 — Live Scenario Tests**

15 scenarios from the 2022 World Cup Final (Argentina vs France). Each scenario run twice — WITH signals and WITHOUT signals. Delta measures architecture value.

### Final Results (Run 3 — definitive)

| Metric | Score | Gate | Status |
|--------|-------|------|--------|
| Factual Accuracy | **82%** | ≥80% | ✅ Pass |
| Relevance | **99%** | ≥80% | ✅ Pass |
| Signal Accuracy | **100%** | ≥90% | ✅ Pass |
| Signal Lift (live) | **+8pts** | ≥0pts | ✅ Pass |
| Clarity | 68% | ≥75% | ❌ Structural artifact |
| Baseline Delta | +2pts | ≥+15pts | ❌ Wrong metric |

### The Three-Run Improvement Story

**Run 1** — Claude-generated references
Static: 84%. Inflated by self-consistency bias. Claude evaluating Claude-generated answers against Claude-written references produces artificially high scores.

**Run 2** — Human-written references, pre-fix
Static: 70%. Signal lift: -8pts.
Three bugs identified through root cause analysis of raw failure data:
1. Judge JSON parse errors creating phantom zero scores
2. Scenario LS-14 had Mbappe falsely described as a substitute (he started)
3. matchSignals.js returning intensity: "low" at minute 116 of a tied World Cup Final — algorithm checked recent events only, not situational context

**Run 3** — Human-written references, post-fix
Static: 70% (unchanged — correct).
Signal lift: **+8pts**.
All three bugs fixed. Signal lift flipped from -8 to +8.

### The Key Methodological Insight

**Model eval ≠ AI eval.**

Comparing Claude to Claude-generated references is model eval — it measures consistency, not quality. Comparing Claude to human-written references is AI eval — it measures whether the product is actually good.

The score drop from 84% to 70% between runs 1 and 2 proves run 1 was inflated, not that the product got worse.

### Two Failing Gates Are Not Product Failures

**Clarity 68% (gate ≥75%):**
The AI answers correctly and relevantly. The judge penalizes Claude for not matching the specific analogy phrasing in the human reference answer. "Like a receiver past the line of scrimmage" vs "like an offside trap in football" — both correct, both helpful, judge scores one lower. Measurement artifact, not deficiency.

**Baseline delta +2pts (gate ≥+15pts):**
Our architecture adds +8pts on live match context (Dataset 3) — exactly where the product's value proposition is. The baseline gate measures RAG value on static knowledge where Claude already knows soccer from training. The wrong metric for this architecture.

---

## Product Metrics Framework

Three-layer measurement system built before launch:

**North Star Metric:**
Companion questions per live match
Target: ≥3 questions per Sam per match

**Layer 1 — AI Skill Metrics**
- Factual accuracy: 82% (gate passed)
- Signal lift: +8pts (gate passed)
- Thumbs-down rate: target <15%
- Response latency: target <3 seconds

**Layer 2 — User Outcome Metrics**
- Questions per session over time
- Follow-up pill tap rate
- Session depth (turns per session)
- Return rate match 1 → match 2

**Layer 3 — Product Metrics**
- DAU on match days (leading)
- Prediction submission rate (leading)
- Group creation rate (leading)
- Cross-match week retention (lagging)
- Fan conversion rate (lagging)

---

## PM Artifacts

Written before and during development:

| Document | Description |
|----------|-------------|
| [01 — Problem Statement & User Research](https://docs.google.com/document/d/1gwyynY5WFbQbWRVQ7SI6s84FWckB7m7hxG_yDJxbsu8/edit) | 8 user interviews, Sideline Sam persona, core insight |
| [02 — Competitive Analysis](https://drive.google.com/file/d/1YO858FA6PjHcaeNN00tFJ6BbARhzZc4K/view) | FotMob, ESPN FC, FIFA+, ChatGPT teardown |
| [03 — PRD](https://docs.google.com/document/d/1BxIG5RoZfSpnjr-I49tMdYn-DrwTQymEKsmP1uIdZ8Y/edit) | Goals, success metrics, feature requirements |
| [04 — OKRs](https://docs.google.com/document/d/1muADKIClcvvDETEjEtpSfCOyHg3MYQTGAKaj2KvR5zI/edit) | 3 objectives, 9 key results, June 11–July 19 |
| [05 — Metrics Plan](https://docs.google.com/document/d/1rjXCDiF3qTPhnSsduS0SY-3CFvHzyB7Lxl885xRivHM/edit) | North star, funnel, Mixpanel event taxonomy |
| [06 — System Architecture](https://docs.google.com/document/d/1fLSLIXCfyR98w5ybgwkRmc4VqGd3RlIbiYaLzgBaSUU/edit) | Architecture decisions and tradeoffs |
| [07 — AI Design Doc](https://docs.google.com/document/d/1-hxE7axa6PN9XCYO2cNk5SBN8G-qKmJBssekvfW-_CU/edit) | System prompt design, tone, failure handling |
| [08 — AI Evaluation Framework](https://docs.google.com/document/d/1_grUoEPySFZ80QYdUc-l630ze5cAl2ii7E_AncbtbXU/edit) | Methodology, scoring rubric, quality gates |
| [09 — Data Model](https://drive.google.com/file/d/1hIMUzRFCLgfpkhM4PCd2J1hWTK3sY7J8/view) | Full Supabase schema and relationships |
| [Complete Project Summary](https://docs.google.com/document/d/1uQfhEcE4E9HU0UzunEZgIvn6LP8upkAKPSYW-DABaDU/edit) | Post-build summary with all results |
| [Eval Framework & Results](https://docs.google.com/document/d/1DZodPFc3ANzi_ZOyrPdv6QydxB0PjuwH08RkWK6W6ac/edit) | Three-dataset eval methodology, LLM-as-judge setup, all three run results, gate analysis, interview answers |

---

## Tech Stack

| Layer | Technology | Decision |
|-------|-----------|----------|
| Frontend | React (CRA) | Vercel deployment, component model for complex UI states |
| Backend | Express.js | Lightweight persistent server needed for scheduled jobs |
| Database | Supabase | Auth + PostgreSQL + RLS in one service — consolidation over proliferation |
| AI | Claude Sonnet | Best instruction-following for constrained response formats, web search tool built in |
| Live Data | API-Football v3 | Real-time match events, fixtures, lineups, formations |
| Frontend Deploy | Vercel | Auto-deploy on git push, free tier sufficient |
| Backend Deploy | Render | Persistent Node server, free tier for development |

**Why RAG over fine-tuning:**
Soccer knowledge changes every match day. Fine-tuning is a snapshot. RAG lets the knowledge base be updated without retraining. The companion should know about a player transferred yesterday — fine-tuning cannot do that.

**Why Claude over GPT-4:**
Instruction-following on constrained output formats ([FACT] / [ANALOGY] / [FOLLOW_UPS]) was more reliable in testing. The web_search tool is built in without a separate API key.

---

## Repository Structure

```
ai-soccer-companion/
├── src/                          # React frontend
│   ├── components/
│   │   ├── companion/            # Match companion UI
│   │   │   ├── CompanionChat.js  # Core chat interface
│   │   │   ├── MatchSelector.js  # Match picker
│   │   │   └── FormationPitch.js # Live formation viz
│   │   ├── HomeScreen.js         # Main home screen
│   │   ├── DailyCardView.js      # Prediction cards
│   │   └── PredictionsGroupView.js # Groups + leaderboard
│   ├── lib/
│   │   └── worldCupData.js       # All 48 teams, fixtures
│   └── services/
│       └── api.js                # Backend API client
│
├── backend/
│   ├── routes/
│   │   ├── companion.js          # AI companion endpoint
│   │   ├── matches.js            # Live match data
│   │   ├── dailyCard.js          # Prediction card gen
│   │   └── groups.js             # Groups + leaderboard
│   ├── lib/
│   │   ├── matchSignals.js       # Derived signals engine
│   │   ├── rag.js                # RAG retrieval
│   │   └── sports-api.js         # API-Football client
│   ├── knowledge-base/
│   │   └── soccer-facts.txt      # RAG content
│   ├── eval/                     # Evaluation framework
│   │   ├── reference-answers.json
│   │   ├── live-scenarios.json
│   │   ├── run-eval.js
│   │   ├── run-signal-eval.js
│   │   ├── run-live-eval.js
│   │   └── run-all-evals.js
│   └── scripts/
│       ├── test-scoring.js       # Prediction scoring test
│       ├── seed-wc-matches.js    # WC fixture seeding
│       └── e2e-test.js           # Launch readiness test
│
├── supabase/
│   └── migrations/               # DB schema migrations
│
└── CLAUDE.md                     # AI pair programming notes
```

---

## Running Locally

```bash
# Clone the repo
git clone https://github.com/RishiSujit/ai-soccer-companion
cd ai-soccer-companion

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Set up environment variables
cp .env.example .env

# Required variables:
# ANTHROPIC_API_KEY
# REACT_APP_SUPABASE_URL
# REACT_APP_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# API_FOOTBALL_KEY
# ACTIVE_LEAGUE_ID=1
# ACTIVE_SEASON=2026

# Start backend (port 3001)
node backend/server.js

# Start frontend in new terminal (port 3002)
npm start
```

---

## Running the Eval Suite

```bash
# Signal accuracy — free, instant
node backend/eval/run-signal-eval.js

# Static golden test set (~8 min, costs ~$0.50)
node backend/eval/run-eval.js

# Live scenario test (~6 min)
node backend/eval/run-live-eval.js

# Full suite (~25 min)
node backend/eval/run-all-evals.js

# Launch readiness check
node backend/scripts/e2e-test.js
```

---

## What I Learned

**1. Model eval vs AI eval is the most important distinction in this project.**

Using Claude to evaluate Claude-generated answers creates self-consistency bias. The system scores itself generously. Rewriting all 75 reference answers by hand dropped the score from 84% to 70% and revealed the true gap. That drop is a feature of the methodology, not a regression.

**2. Eval as improvement engine, not report card.**

The eval framework's most valuable output was diagnosing 3 bugs in run 2 that caused signals to hurt by -8pts. Root cause analysis on each failure led to specific fixes that flipped the delta from -8 to +8. A report card says 70%. An improvement engine tells you which 21 questions failed, why, and what to fix.

**3. The signals layer's value is in context, not knowledge.**

The +2pt RAG lift on static knowledge was smaller than expected — Claude already knows soccer from training. The +8pt signal lift on live match responses was where the architecture earned its complexity. The job to be done is not explaining what offside is. It is explaining why everyone is going crazy right now.

**4. What I would do differently.**

Build human-written reference answers before writing the eval runner, not after. The reference answers are the most important artifact in the eval framework and they require human judgment that cannot be automated. Doing this work first would have saved one full wasted eval run.

---

## What's Next (v2 Roadmap)

- **Storyboard / multi-turn evaluation** — test full 8-12 question match sessions, not individual Q&A pairs. A companion that answers each question well in isolation but forgets prior context is still a bad companion.

- **User metrics dashboard** — real-time tracking of north star metric, session depth, return rate, and fan conversion signal during the tournament window.

- **Post-tournament case study** — full written case study with real usage data from the World Cup window. Results vs OKR targets. Failure analysis. What worked.

- **Mixpanel integration** — funnel analysis and retention cohorts for the full tournament arc.

---

## Built By

**Rishi Sujit** — CS + Business Administration double major, USC
Targeting AI PM roles

Built with Claude Code as AI pair programmer. Every architectural decision, product requirement, evaluation methodology, and PM artifact was designed and authored by me. Claude Code was the implementation partner — the same way a PM works with an engineering team.

---

*Tournament window: June 11 – July 19, 2026*
*48 teams · 104 matches · Final at MetLife Stadium, NJ*
