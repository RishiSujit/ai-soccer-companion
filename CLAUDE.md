# AI Soccer Companion — World Cup 2026
## CLAUDE.md — Project Briefing for Claude Code

---

## ⚠️ STACK NOTE (Read First)
This project uses **React (create-react-app) + Express.js** — NOT Next.js.
- Frontend runs on `localhost:3002`
- Backend Express server runs on `localhost:3001`
- Do NOT suggest Next.js API routes, App Router, or Pages Router patterns
- Do NOT suggest `'use client'` directives or server components
- Do NOT use TypeScript — this project is plain JavaScript

---

## 1. PROJECT OVERVIEW

You are helping build the **AI Soccer Companion**, a web app for casual American sports fans watching the 2026 FIFA World Cup (June 11 – July 19, 2026). The target user is "Sideline Sam" — a 19-24 year old American male sports fan who knows almost nothing about soccer but wants to engage with the tournament socially.

The product has three core features:
1. **Fan Identity Onboarding** — conversational AI that assigns Sam a World Cup team based on his existing sports personality
2. **AI Match Companion** — RAG-grounded chat assistant that answers questions in plain English during live matches
3. **Group Prediction Game** — friend group competition with match result and prop bet predictions, live leaderboard

**This is a portfolio project.** Code quality, architecture decisions, and documentation all matter. Every decision should be explainable to a PM interviewer.

---

## 2. TECH STACK

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React (create-react-app) | UI layer, runs on port 3002 |
| Backend | Express.js | API server, runs on port 3001 |
| Styling | CSS Modules or plain CSS | Component styling |
| Database | Supabase (PostgreSQL) | Users, groups, predictions, leaderboards |
| Vector DB | Supabase pgvector | RAG knowledge base (post-MVP) |
| Auth | Supabase Auth | Anonymous sessions + full accounts |
| Real-time | Supabase Realtime | Live leaderboard updates |
| AI | Anthropic API (claude-sonnet-4-5) | All three AI features |
| Embeddings | Keyword search for MVP, pgvector post-launch | Knowledge base retrieval |
| Sports Data | API-Football (free tier) | Live match scores and events |
| Analytics | Post-launch addition — skip for MVP | User behavior tracking |
| Deployment | Vercel | Hosting and CDN |
| Dev Tool | Claude Code (VS Code) | AI-assisted development |

**Package manager:** npm
**Node version:** 24+
**React version:** 18 (create-react-app)

---

## 3. PROJECT STRUCTURE

```
ai-soccer-companion/
├── backend/
│   ├── server.js                 # Express server — main entry point (port 3001)
│   ├── routes/
│   │   ├── onboarding.js         # POST /api/onboarding
│   │   ├── companion.js          # POST /api/chat
│   │   ├── predictions.js        # POST /api/predictions/submit, GET /api/predictions/options
│   │   └── groups.js             # POST /api/groups/create, POST /api/groups/join
│   ├── lib/
│   │   ├── anthropic.js          # Anthropic client + system prompts
│   │   ├── supabase.js           # Supabase server client
│   │   ├── rag.js                # Knowledge base retrieval (keyword search → pgvector later)
│   │   ├── sports-api.js         # API-Football client and match data
│   │   └── scoring.js            # Prediction scoring logic
│   └── knowledge-base/
│       ├── soccer-facts.txt      # Core RAG content
│       ├── rules-and-calls/      # Rule explanation documents
│       ├── teams-and-styles/     # Team profile documents
│       ├── players/              # Player profile documents
│       └── tournament-structure/ # How the World Cup works
│
├── src/
│   ├── App.js                    # Root component + routing
│   ├── index.js                  # React entry point
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.js
│   │   │   ├── Input.js
│   │   │   └── LoadingSpinner.js
│   │   ├── onboarding/
│   │   │   ├── OnboardingChat.js # Conversational onboarding UI
│   │   │   └── TeamReveal.js     # Team assignment reveal card
│   │   ├── companion/
│   │   │   ├── CompanionChat.js  # Main chat interface
│   │   │   ├── MessageBubble.js  # Individual message
│   │   │   └── RatingButtons.js  # Thumbs up/down rating
│   │   ├── predictions/
│   │   │   ├── PredictionCard.js
│   │   │   ├── PropBetCard.js
│   │   │   └── LockButton.js
│   │   └── leaderboard/
│   │       ├── Leaderboard.js
│   │       └── LeaderboardRow.js
│   ├── hooks/
│   │   ├── useChat.js            # Chat state management
│   │   └── useSupabase.js        # Supabase client hook
│   ├── services/
│   │   └── api.js                # All fetch calls to Express backend
│   └── lib/
│       └── supabase.js           # Supabase browser client
│
├── public/
├── CLAUDE.md                     # This file
├── .env                          # Environment variables (never commit)
├── .env.example                  # Safe template
├── .gitignore
└── package.json
```

---

## 4. ENVIRONMENT VARIABLES

The `.env` file lives in the project root. Never commit it.

```bash
# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# Supabase
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Sports Data
API_FOOTBALL_KEY=your_api_football_key

# App
PORT=3001
REACT_APP_API_URL=http://localhost:3001
```

**Critical rules:**
- `ANTHROPIC_API_KEY` lives in the backend only — never in React frontend code
- `SUPABASE_SERVICE_ROLE_KEY` is backend only — bypasses Row Level Security
- `REACT_APP_` prefix = accessible in React frontend via `process.env.REACT_APP_*`
- Backend reads `.env` via `require('dotenv').config()`

---

## 5. DATABASE SCHEMA

All tables live in Supabase. Match this schema exactly when writing queries or migrations.

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  auth_type TEXT CHECK (auth_type IN ('anonymous', 'authenticated')) DEFAULT 'anonymous',
  email TEXT,
  assigned_team TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  onboarding_answers JSONB
);
```

### matches
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  kickoff_time TIMESTAMP WITH TIME ZONE NOT NULL,
  stage TEXT CHECK (stage IN ('group', 'round_of_16', 'quarterfinal', 'semifinal', 'final')) NOT NULL,
  group_name TEXT,
  status TEXT CHECK (status IN ('scheduled', 'live', 'finished')) DEFAULT 'scheduled',
  home_score INTEGER,
  away_score INTEGER,
  result TEXT CHECK (result IN ('home', 'away', 'draw'))
);
```

### match_props
```sql
CREATE TABLE match_props (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id),
  prop_type TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT,
  ai_explanation TEXT
);
```

### predictions
```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  match_id UUID REFERENCES matches(id),
  result_prediction TEXT CHECK (result_prediction IN ('home', 'away', 'draw')),
  prop_predictions JSONB,
  locked_at TIMESTAMP WITH TIME ZONE,
  points_earned INTEGER DEFAULT 0,
  UNIQUE(user_id, match_id)
);
```

### groups
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id)
);
```

### group_members
```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id),
  user_id UUID REFERENCES users(id),
  display_name TEXT,
  total_points INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);
```

### chat_sessions
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  match_id UUID REFERENCES matches(id),
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### response_ratings
```sql
CREATE TABLE response_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  session_id UUID REFERENCES chat_sessions(id),
  message_index INTEGER NOT NULL,
  rating TEXT CHECK (rating IN ('up', 'down')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 6. AI SYSTEM PROMPTS

### Onboarding Prompt
```
You are an AI helping a casual American sports fan discover which World Cup 2026 team they should root for.

Your job:
1. Ask 3-4 conversational questions about their existing sports preferences (favorite teams, players, what they love about sports)
2. Based on their answers, reason through which World Cup team matches their personality
3. Deliver a confident, exciting team assignment with a clear explanation connecting their sports identity to the team

Rules:
- Keep it conversational and fun — this is not a quiz
- Use American sports analogies they already understand
- When you have enough information, output your decision in this exact JSON format:
  {"action": "assign_team", "team": "[country name]", "reasoning": "[2-3 sentence explanation]"}
- Do not assign a team until you have asked at least 2 questions
```

### Match Companion Prompt
```
You are an AI soccer companion helping a casual American fan enjoy a live World Cup 2026 match.

Context you have:
- MATCH CONTEXT: {match_context} (live score, teams, current minute)
- RELEVANT KNOWLEDGE: {retrieved_knowledge} (from knowledge base)

Your job:
- Explain what's happening in plain English using American sports analogies
- Answer questions about rules, players, tactics, and tournament context
- Keep responses under 150 words — Sam is watching the match, not reading an essay
- Be enthusiastic but accurate — never fabricate statistics
- If you don't know something, say so and offer what you do know
```

### Prediction Explanation Prompt
```
You are explaining a prop bet prediction option to a casual American sports fan.

For the prop: {prop_question}
Option: {option}

Give a 2-sentence explanation of why this outcome is or isn't likely, using plain English and American sports analogies where helpful.
```

---

## 7. API ROUTES (Express)

```javascript
// server.js pattern
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/chat', require('./routes/companion'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/groups', require('./routes/groups'));

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
```

```javascript
// Route file pattern
const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    // ... logic
    res.json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
```

---

## 8. FRONTEND API CALLS

All calls to the backend go through `src/services/api.js`:

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const sendChatMessage = async (message) => {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  return response.json();
};
```

Never call the Anthropic API directly from React components. Always go through the Express backend.

---

## 9. RAG IMPLEMENTATION (MVP)

For MVP, use keyword search against `soccer-facts.txt`. Upgrade to pgvector post-launch.

```javascript
// backend/lib/rag.js — MVP version
const fs = require('fs');
const path = require('path');

const knowledgeBase = fs.readFileSync(
  path.join(__dirname, '../knowledge-base/soccer-facts.txt'), 'utf8'
).split('\n\n');

function retrieve(query, topK = 3) {
  const keywords = query.toLowerCase().split(' ');
  const scored = knowledgeBase.map(chunk => ({
    chunk,
    score: keywords.filter(kw => chunk.toLowerCase().includes(kw)).length
  }));
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(r => r.chunk)
    .join('\n\n');
}

module.exports = { retrieve };
```

---

## 10. CODING CONVENTIONS

### JavaScript
- Plain JavaScript (no TypeScript)
- Use `async/await` — no raw `.then()` chains
- `const` by default, `let` only when reassignment is needed
- Meaningful variable names

### React Components
- Functional components with hooks only — no class components
- One component per file
- Props destructured at the top of the function
- Keep components under 150 lines — extract if larger

### Express Routes
- Every route has try/catch
- Sports API failures degrade gracefully — never throw, return fallback
- Anthropic API failures return user-friendly message, never expose error details

### Error handling
```javascript
const { data, error } = await supabase.from('users').select('*');
if (error) {
  console.error('Supabase error:', error);
  return res.status(500).json({ error: 'Database error' });
}
```

---

## 11. FEATURE BUILD ORDER

### Phase 1 — Foundation ✅ COMPLETE
- [x] React project setup (create-react-app)
- [x] Express server running on port 3001
- [x] Anthropic API connected and tested
- [x] .env secured, .gitignore updated
- [ ] Supabase project created and connected
- [ ] Database migrations (all 8 tables)
- [ ] Folder structure finalized

### Phase 2 — Fan Identity Onboarding
- [ ] Onboarding chat UI (OnboardingChat.js)
- [ ] `/api/onboarding` route with multi-turn conversation
- [ ] Team assignment and Supabase persistence
- [ ] Team reveal component

### Phase 3 — Knowledge Base
- [ ] Write soccer-facts.txt content
- [ ] Keyword retrieval function (rag.js)
- [ ] Test retrieval quality before building companion

### Phase 4 — AI Match Companion
- [ ] Match schedule data (manual JSON for now)
- [ ] `/api/chat` route with RAG + match context
- [ ] Chat UI with streaming (CompanionChat.js)
- [ ] Thumbs up/down rating

### Phase 5 — Prediction Game
- [ ] Prediction submission UI
- [ ] Group creation and invite link flow
- [ ] Scoring logic
- [ ] Real-time leaderboard via Supabase Realtime

### Phase 6 — Polish and Deploy
- [ ] Mobile responsiveness (Sam uses this at a bar)
- [ ] Vercel deployment
- [ ] Environment variables set in Vercel dashboard

---

## 12. IMPORTANT CONSTRAINTS

### Never do these things
- Never put `ANTHROPIC_API_KEY` in React frontend code
- Never skip the kickoff_time check before accepting predictions
- Never let the AI companion fabricate statistics
- Never make Anthropic API calls from React components — Express routes only

### Always do these things
- Always handle sports API failures gracefully
- Always validate prediction submissions server-side
- Always test on mobile viewport — Sam is using this at a bar
- Always keep companion responses under 150 words

### Scope boundaries (do not build in v1)
- No live score display UI
- No fantasy team management
- No matches outside World Cup 2026
- No OpenAI embeddings or pgvector (post-launch)
- No analytics (post-launch)

---

## 13. SCORING LOGIC

```javascript
// Points system:
// Correct match result = 1 point
// Correct prop bet (per prop) = 2 points
// Maximum per match = 7 points (1 + 2 + 2 + 2)
```

---

## 14. HELPFUL COMMANDS

```bash
# Start backend (Terminal 1)
node backend/server.js

# Start frontend (Terminal 2)
npm start

# Test backend directly
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about the 2026 World Cup"}'

# Install a new package
npm install [package-name]

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

---

## 15. PORTFOLIO CONTEXT

This is a PM portfolio project demonstrating AI PM skills. When making architectural decisions, choose the option that is:
1. Most explainable to a non-technical interviewer
2. Aligned with the documented decision rationale
3. Simple enough to ship before June 11, 2026

**Deadline: June 11, 2026 — World Cup kickoff**

---

*Last updated: May 2026 | AI Soccer Companion — World Cup 2026*
