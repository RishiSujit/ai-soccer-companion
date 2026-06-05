import './LandingPage.css';

const TICKER_TEXT = (
  <span className="lp-ticker__segment">
    <b>June 11</b>&nbsp;· Tournament kicks off at&nbsp;<b>SoFi Stadium, Los Angeles</b>&nbsp;·&nbsp;
    <b>48 teams</b>&nbsp;· Largest World Cup in history ·&nbsp;
    <b>104 matches</b>&nbsp;· Across&nbsp;<b>16 cities</b>&nbsp;in&nbsp;
    <b>USA, Canada &amp; Mexico</b>&nbsp;· Final ·&nbsp;
    <b>MetLife Stadium, New Jersey</b>&nbsp;·&nbsp;<b>July 19, 2026</b>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  </span>
);

const FEATURES = [
  {
    num: '01',
    title: 'Find your team',
    desc: 'Answer 3 questions about sports you already love. Get matched to a World Cup squad that fits your personality.',
    tag: 'AI-POWERED',
  },
  {
    num: '02',
    title: 'Live match companion',
    desc: 'Confused by a call? Ask. Every rule, player, and moment explained in plain English using analogies you already know.',
    tag: 'REAL-TIME',
  },
  {
    num: '03',
    title: 'Compete with friends',
    desc: 'Pick match results, lock in prop bets before kickoff, and climb a live leaderboard throughout the tournament.',
    tag: 'GROUP GAME',
  },
];

function LandingPage({ onShowAuth }) {
  return (
    <div className="lp">

      {/* ── 1. Navbar ─────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-nav__brand">
          <div className="lp-nav__icon">⚽</div>
          <span className="lp-nav__name">World Cup <span>Companion</span></span>
        </div>
        <div className="lp-nav__actions">
          <button className="lp-btn-ghost" onClick={() => onShowAuth('signin')}>Sign in</button>
          <button className="lp-btn-solid" onClick={() => onShowAuth('signup')}>Get started free</button>
        </div>
      </nav>

      {/* ── 2. Ticker ─────────────────────────────────────────── */}
      <div className="lp-ticker">
        <div className="lp-ticker__track">
          {TICKER_TEXT}
          {TICKER_TEXT}
        </div>
      </div>

      {/* ── 3. Hero ───────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero__inner">

          {/* Left column */}
          <div className="lp-hero__left">
            <div className="lp-eyebrow">
              <div className="lp-eyebrow__line" />
              <span className="lp-eyebrow__text">World Cup 2026 · June 11 – July 19</span>
            </div>

            <h1 className="lp-headline">
              <span className="lp-headline__dim">Don't just</span>
              <span className="lp-headline__green">watch it.</span>
              <span className="lp-headline__white">Live it.</span>
            </h1>

            <p className="lp-subheadline">
              The World Cup is coming to your backyard.{' '}
              <b>World Cup Companion</b> gives casual fans everything
              they need — your team, real-time AI explanations, and a
              predictions game with friends.
            </p>

            <div className="lp-cta">
              <button className="lp-cta__primary" onClick={() => onShowAuth('signup')}>
                Find my team →
              </button>
              <button className="lp-cta__secondary" onClick={() => onShowAuth('signin')}>
                Already have an account? Sign in
              </button>
            </div>

            <div className="lp-social-proof">
              <div className="lp-avatars">
                <div className="lp-avatar lp-avatar--a">R</div>
                <div className="lp-avatar lp-avatar--b">J</div>
                <div className="lp-avatar lp-avatar--c">M</div>
                <div className="lp-avatar lp-avatar--d">A</div>
              </div>
              <p className="lp-social-proof__text">
                Built for fans who <b>love sports</b> but don't know soccer. Yet.
              </p>
            </div>
          </div>

          {/* Right column — floating chat card */}
          <div className="lp-hero__right">
            <div className="lp-card">
              <div className="lp-card__header">
                <span className="lp-card__teams">USA vs Paraguay</span>
                <div className="lp-card__live">
                  <div className="lp-card__dot" />
                  <span className="lp-card__live-label">Live</span>
                </div>
              </div>

              <div className="lp-card__score-row">
                <span className="lp-card__score">2 – 1</span>
                <span className="lp-card__minute">67'</span>
              </div>

              <div className="lp-card__messages">
                <div className="lp-bubble lp-bubble--user">wait why did they stop??</div>
                <div className="lp-bubble lp-bubble--ai">
                  VAR review — like NFL replay. Ref is checking if the goal counts. Takes about 60 seconds then play resumes.
                </div>
                <div className="lp-bubble lp-bubble--user">is that good for USA?</div>
                <div className="lp-typing">
                  <div className="lp-typing__dot" />
                  <div className="lp-typing__dot" />
                  <div className="lp-typing__dot" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 4. Features row ───────────────────────────────────── */}
      <div className="lp-features">
        {FEATURES.map(f => (
          <div key={f.num} className="lp-feature">
            <div className="lp-feature__num">{f.num}</div>
            <div className="lp-feature__title">{f.title}</div>
            <div className="lp-feature__desc">{f.desc}</div>
            <div className="lp-feature__tag">{f.tag}</div>
          </div>
        ))}
      </div>

      {/* ── 5. Bottom bar ─────────────────────────────────────── */}
      <div className="lp-bottom">
        <div className="lp-bottom__left">
          <span>No soccer knowledge required.</span>
          <button className="lp-bottom__link" onClick={() => onShowAuth('signup')}>
            Continue as guest →
          </button>
        </div>
        <div className="lp-bottom__right">Free to use · No credit card</div>
      </div>

    </div>
  );
}

export default LandingPage;
