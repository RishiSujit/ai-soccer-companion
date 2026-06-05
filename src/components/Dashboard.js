import { useRef, useEffect } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import './Dashboard.css';

export default function Dashboard() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('key');
  const validKey = process.env.REACT_APP_DASHBOARD_KEY || 'worldcup2026';
  const authorized = key === validKey;

  // Hooks must be called unconditionally
  const { data, loading, lastUpdated, isUsingSampleData, refresh } = useDashboardData();

  if (!authorized) {
    return <div className="dash-blank" />;
  }

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const daysToFinal = Math.ceil(
    (new Date('2026-07-19') - new Date()) / (1000 * 60 * 60 * 24)
  );
  const daysToKickoff = Math.max(0, Math.ceil(
    (new Date('2026-06-11') - new Date()) / (1000 * 60 * 60 * 24)
  ));
  const tournamentStarted = new Date() >= new Date('2026-06-11');

  return (
    <div className="dashboard">

      {/* ── HEADER ── */}
      <div className="dash-header">
        <div className="dash-header-left">
          <div className="dash-logo">⚽ AI Soccer Companion</div>
          <div className="dash-subtitle">PM Metrics Dashboard</div>
        </div>
        <div className="dash-header-right">
          {isUsingSampleData && (
            <div className="sample-badge">Sample data — live Jun 11</div>
          )}
          <div className="dash-updated">
            Updated {lastUpdated?.toLocaleTimeString()}
          </div>
          <button className="dash-refresh" onClick={refresh}>↺ Refresh</button>
        </div>
      </div>

      {/* ── TOURNAMENT STATUS BAR ── */}
      <div className="dash-tournament-bar">
        {[
          { num: daysToKickoff === 0 ? 'LIVE' : daysToKickoff, label: daysToKickoff === 0 ? 'tournament' : 'days to kickoff' },
          { num: daysToFinal, label: 'days to final' },
          { num: 48, label: 'teams' },
          { num: 104, label: 'matches' },
          { num: 'Jun 11', label: 'kickoff' },
          { num: 'Jul 19', label: 'final' },
        ].map((s, i) => (
          <div key={i} className="t-stat">
            <span className="t-num">{s.num}</span>
            <span className="t-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── NORTH STAR ── */}
      <div className="dash-section">
        <div className="dash-section-label">North star metric</div>
        <div className="north-star-card">
          <div className="ns-left">
            <div className="ns-name">Companion questions per live match</div>
            <div className="ns-desc">
              If Sam asks 3+ questions during a live match he is engaged, the AI is working,
              and he is becoming a fan in real time.
            </div>
          </div>
          <div className="ns-right">
            <div className="ns-value">{data.avgQuestionsPerSession.toFixed(1)}</div>
            <div className="ns-target">target ≥ 3.0</div>
            <div className={`ns-status ${data.avgQuestionsPerSession >= 3 ? 'ns-pass' : 'ns-pending'}`}>
              {data.avgQuestionsPerSession >= 3
                ? '✅ On track'
                : tournamentStarted ? '⚠️ Below target' : '— Pre-launch'}
            </div>
          </div>
        </div>
      </div>

      {/* ── LAYER 1: AI METRICS ── */}
      <div className="dash-section">
        <div className="dash-section-label">Layer 1 — AI skill metrics</div>
        <div className="metric-grid">
          <MetricCard label="Factual accuracy" value="82%" delta="+12pts vs baseline" status="pass" gate="≥80%" source="eval" />
          <MetricCard label="Relevance" value="99%" delta="Gate passed" status="pass" gate="≥80%" source="eval" />
          <MetricCard label="Signal lift (live)" value="+8pts" delta="vs without signals" status="pass" gate="≥0pts" source="eval" />
          <MetricCard label="Signal accuracy" value="100%" delta="10/10 scenarios" status="pass" gate="≥90%" source="eval" />
          <MetricCard
            label="Thumbs-up rate"
            value={`${data.thumbsUpRate}%`}
            delta={`${data.totalRatings} ratings`}
            status={data.thumbsUpRate >= 70 ? 'pass' : data.thumbsUpRate >= 50 ? 'warn' : 'pending'}
            gate="≥70%"
            source="live"
          />
          <MetricCard label="Total ratings" value={data.totalRatings} delta="thumbs up + down" status="neutral" gate="" source="live" />
        </div>

        <div className="gates-card">
          <div className="gates-title">Eval gates — Run 3 (definitive)</div>
          <div className="gates-list">
            {[
              { name: 'Factual accuracy', score: '82%', gate: '≥80%', pass: true },
              { name: 'Relevance', score: '99%', gate: '≥80%', pass: true },
              { name: 'Signal accuracy', score: '100%', gate: '≥90%', pass: true },
              { name: 'Signal lift', score: '+8pts', gate: '≥0pts', pass: true },
              { name: 'Clarity', score: '68%', gate: '≥75%', pass: false, note: 'structural artifact' },
              { name: 'Baseline delta', score: '+2pts', gate: '≥+15pts', pass: false, note: 'wrong metric for this architecture' },
            ].map(g => (
              <div key={g.name} className="gate-row">
                <span className={`gate-icon ${g.pass ? 'gate-pass' : 'gate-fail'}`}>
                  {g.pass ? '✅' : '❌'}
                </span>
                <span className="gate-name">{g.name}</span>
                <span className="gate-score">{g.score}</span>
                <span className="gate-gate">gate: {g.gate}</span>
                {g.note && <span className="gate-note">{g.note}</span>}
              </div>
            ))}
          </div>
          <div className="gates-summary">
            4 of 6 gates passing · 2 failures are documented as measurement artifacts
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">Eval improvement story</div>
          <div className="chart-sub">Signal lift across 3 runs</div>
          <EvalRunChart />
        </div>
      </div>

      {/* ── LAYER 2: USER METRICS ── */}
      <div className="dash-section">
        <div className="dash-section-label">
          Layer 2 — User outcome metrics
          {isUsingSampleData && <span className="sample-tag">sample</span>}
        </div>
        <div className="metric-grid">
          <MetricCard label="Total signups" value={data.totalUsers} delta="registered users" status="neutral" gate="" source={isUsingSampleData ? 'sample' : 'live'} />
          <MetricCard
            label="Avg questions/session"
            value={data.avgQuestionsPerSession.toFixed(1)}
            delta="north star metric"
            status={data.avgQuestionsPerSession >= 3 ? 'pass' : 'pending'}
            gate="≥3.0"
            source={isUsingSampleData ? 'sample' : 'live'}
          />
          <MetricCard label="Total sessions" value={data.totalSessions} delta="companion sessions" status="neutral" gate="" source={isUsingSampleData ? 'sample' : 'live'} />
          <MetricCard
            label="Thumbs-up rate"
            value={`${data.thumbsUpRate}%`}
            delta="perceived quality"
            status={data.thumbsUpRate >= 70 ? 'pass' : data.thumbsUpRate >= 50 ? 'warn' : 'pending'}
            gate="≥70%"
            source={isUsingSampleData ? 'sample' : 'live'}
          />
        </div>

        <div className="transformation-card">
          <div className="chart-title">User transformation model</div>
          <div className="chart-sub">Expected behavioral change across the tournament</div>
          <div className="transform-rows">
            {[
              { week: 'Week 1', behavior: 'Asks basic rules — "what is offside?"', signal: 'Signal: short sessions', active: tournamentStarted },
              { week: 'Week 2', behavior: 'Asks about tactics — "why does USA press high?"', signal: 'Signal: pill tap rate increases', active: new Date() >= new Date('2026-06-18') },
              { week: 'Week 3', behavior: 'Asks about stakes — "what happens to Argentina now?"', signal: 'Signal: live mode sessions', active: new Date() >= new Date('2026-06-25') },
              { week: 'Knockout', behavior: 'Explains the game to friends', signal: 'Signal: invites group members', active: new Date() >= new Date('2026-06-28') },
            ].map(t => (
              <div key={t.week} className={`transform-row ${t.active ? 'transform-active' : ''}`}>
                <div className="transform-week">{t.week}</div>
                <div className="transform-behavior">{t.behavior}</div>
                <div className="transform-signal">{t.signal}</div>
                <div className={`transform-dot ${t.active ? 'dot-active' : ''}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">Response ratings over time</div>
          <div className="chart-sub">
            Thumbs up vs thumbs down by day (last 7 days){isUsingSampleData && ' — sample data'}
          </div>
          <RatingsChart data={data.ratingsOverTime} />
        </div>

        <div className="chart-card">
          <div className="chart-title">Top question categories</div>
          <div className="chart-sub">
            What Sam is actually asking{isUsingSampleData && ' — sample data'}
          </div>
          <CategoryChart data={data.topQuestionCategories} />
        </div>
      </div>

      {/* ── LAYER 3: PRODUCT METRICS ── */}
      <div className="dash-section">
        <div className="dash-section-label">
          Layer 3 — Product metrics
          {isUsingSampleData && <span className="sample-tag">sample</span>}
        </div>
        <div className="metric-grid">
          <MetricCard label="DAU (match days)" value={data.dauMatchDay} delta="est. from signups" status="neutral" gate="" source={isUsingSampleData ? 'sample' : 'live'} isLeading />
          <MetricCard label="Groups created" value={data.totalGroups} delta="friend groups" status={data.totalGroups >= 5 ? 'pass' : 'pending'} gate="" source={isUsingSampleData ? 'sample' : 'live'} isLeading />
          <MetricCard label="Group members" value={data.totalGroupMembers} delta="users in groups" status="neutral" gate="" source={isUsingSampleData ? 'sample' : 'live'} isLeading />
          <MetricCard label="Predictions submitted" value={data.totalPredictions} delta="total cards locked" status="neutral" gate="" source={isUsingSampleData ? 'sample' : 'live'} isLeading />
          <MetricCard
            label="Prediction submit rate"
            value={`${data.predictionSubmitRate}%`}
            delta="users who locked"
            status={data.predictionSubmitRate >= 50 ? 'pass' : data.predictionSubmitRate >= 30 ? 'warn' : 'pending'}
            gate="≥50%"
            source={isUsingSampleData ? 'sample' : 'live'}
            isLagging
          />
          <MetricCard
            label="Return rate"
            value={data.returnRate > 0 ? `${data.returnRate}%` : '—'}
            delta="match 1 → match 2"
            status="pending"
            gate="≥60%"
            source={isUsingSampleData ? 'sample' : 'live'}
            isLagging
          />
        </div>

        <div className="okr-card">
          <div className="chart-title">OKR progress — Jun 11 to Jul 19</div>
          <div className="okr-list">
            {[
              {
                obj: 'O1 — User Engagement',
                krs: [
                  { name: 'Onboarding completion', target: '70%', current: '—', status: 'pending' },
                  { name: 'Cross-match return rate', target: '60%', current: data.returnRate > 0 ? `${data.returnRate}%` : '—', status: 'pending' },
                  { name: 'Avg messages per session', target: '≥5 by Week 2', current: data.avgQuestionsPerSession.toFixed(1), status: data.avgQuestionsPerSession >= 5 ? 'pass' : 'pending' },
                ],
              },
              {
                obj: 'O2 — AI Quality',
                krs: [
                  { name: 'Factual accuracy ≥80%', target: '≥80%', current: '82%', status: 'pass' },
                  { name: 'RAG +15pts over baseline', target: '+15pts', current: '+2pts', status: 'fail-artifact', note: 'architecture value in live context (+8pts)' },
                  { name: 'Thumbs-down rate <15%', target: '<15%', current: `${data.thumbsDownRate}%`, status: data.thumbsDownRate < 15 ? 'pass' : 'pending' },
                ],
              },
              {
                obj: 'O3 — Social Growth',
                krs: [
                  { name: '40% users in groups', target: '40%', current: data.totalUsers > 0 ? `${Math.round(data.totalGroupMembers / data.totalUsers * 100)}%` : '—', status: 'pending' },
                  { name: 'Avg group size ≥4', target: '≥4', current: data.totalGroups > 0 ? (data.totalGroupMembers / data.totalGroups).toFixed(1) : '—', status: 'pending' },
                  { name: 'Predict in 3+ matches', target: '50% of groups', current: '—', status: 'pending' },
                ],
              },
            ].map(obj => (
              <div key={obj.obj} className="okr-obj">
                <div className="okr-obj-title">{obj.obj}</div>
                {obj.krs.map(kr => (
                  <div key={kr.name} className="okr-kr">
                    <span className={`okr-icon ${kr.status === 'pass' ? 'okr-pass' : kr.status === 'fail-artifact' ? 'okr-artifact' : 'okr-pending'}`}>
                      {kr.status === 'pass' ? '✅' : kr.status === 'fail-artifact' ? '📝' : '⏳'}
                    </span>
                    <span className="okr-name">{kr.name}</span>
                    <span className="okr-current">{kr.current}</span>
                    <span className="okr-target">target: {kr.target}</span>
                    {kr.note && <span className="okr-note">{kr.note}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="dash-footer">
        AI Soccer Companion · World Cup 2026 · Rishi Sujit · USC CS + Business
        <br />
        <a href="https://ai-soccer-companion.vercel.app" target="_blank" rel="noreferrer" className="dash-link">
          ai-soccer-companion.vercel.app
        </a>
        {' · '}
        <a href="https://github.com/RishiSujit/ai-soccer-companion" target="_blank" rel="noreferrer" className="dash-link">
          GitHub
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────
// METRIC CARD
// ─────────────────────────────────────
function MetricCard({ label, value, delta, status, gate, source, isLeading, isLagging }) {
  const statusColors = {
    pass: '#00ff87', warn: '#f5a623', fail: '#ff4d6d', pending: '#4a4a6a', neutral: '#9494b8',
  };
  return (
    <div className="metric-card">
      <div className="mc-label">{label}</div>
      <div className="mc-value" style={{ color: statusColors[status] || '#f0f0fa' }}>{value}</div>
      <div className="mc-delta">{delta}</div>
      <div className="mc-footer">
        {gate && <span className="mc-gate">{gate}</span>}
        {isLeading && <span className="mc-badge mc-leading">leading</span>}
        {isLagging && <span className="mc-badge mc-lagging">lagging</span>}
        <span className={`mc-source ${source === 'eval' ? 'mc-eval' : source === 'sample' ? 'mc-sample' : 'mc-live'}`}>
          {source === 'eval' ? '📊 eval' : source === 'sample' ? '🔮 sample' : '🔴 live'}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────
// CHARTS — use window.Chart from CDN
// ─────────────────────────────────────
function EvalRunChart() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !window.Chart) return;
    const ctx = canvas.getContext('2d');
    const chart = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Run 1\n(Claude refs)', 'Run 2\n(Human refs, bugs)', 'Run 3\n(Human refs, fixed)'],
        datasets: [{
          data: [4, -8, 8],
          backgroundColor: ['#378ADD', '#E24B4A', '#639922'],
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            min: -12, max: 12,
            ticks: { color: '#6b7280', callback: v => (v > 0 ? '+' : '') + v + 'pts' },
            grid: { color: 'rgba(255,255,255,0.06)' },
          },
          x: { ticks: { color: '#6b7280' }, grid: { display: false } },
        },
      },
    });
    return () => chart.destroy();
  }, []);

  return <div style={{ position: 'relative', height: '160px' }}><canvas ref={canvasRef} /></div>;
}

function RatingsChart({ data }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || !window.Chart) return;
    const ctx = canvas.getContext('2d');
    const chart = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.date),
        datasets: [
          { label: 'Thumbs up', data: data.map(d => d.up), backgroundColor: '#639922', borderRadius: 3 },
          { label: 'Thumbs down', data: data.map(d => d.down), backgroundColor: '#E24B4A', borderRadius: 3 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { color: '#9494b8' } } },
        scales: {
          y: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          x: { ticks: { color: '#6b7280' }, grid: { display: false } },
        },
      },
    });
    return () => chart.destroy();
  }, [data]);

  return <div style={{ position: 'relative', height: '160px' }}><canvas ref={canvasRef} /></div>;
}

function CategoryChart({ data }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || !window.Chart) return;
    const ctx = canvas.getContext('2d');
    const chart = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.category),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: ['#378ADD', '#639922', '#D97757', '#7F77DD', '#1D9E75'],
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: '#9494b8' }, grid: { display: false } },
        },
      },
    });
    return () => chart.destroy();
  }, [data]);

  return <div style={{ position: 'relative', height: '160px' }}><canvas ref={canvasRef} /></div>;
}
