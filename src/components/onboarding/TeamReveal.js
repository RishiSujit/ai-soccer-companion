import { useState, useEffect } from 'react';

const FLAG_EMOJIS = {
  'Argentina': '🇦🇷', 'Australia': '🇦🇺', 'Belgium': '🇧🇪', 'Brazil': '🇧🇷',
  'Canada': '🇨🇦', 'Colombia': '🇨🇴', 'Croatia': '🇭🇷', 'Ecuador': '🇪🇨',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Ghana': '🇬🇭',
  'Japan': '🇯🇵', 'Mexico': '🇲🇽', 'Morocco': '🇲🇦', 'Netherlands': '🇳🇱',
  'Nigeria': '🇳🇬', 'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Saudi Arabia': '🇸🇦',
  'Senegal': '🇸🇳', 'South Korea': '🇰🇷', 'Spain': '🇪🇸', 'Switzerland': '🇨🇭',
  'USA': '🇺🇸', 'United States': '🇺🇸', 'Uruguay': '🇺🇾',
};

function TeamReveal({ team, reasoning, knownSports = [], existingFan = false, onContinue }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const flag = FLAG_EMOJIS[team] ?? '🌍';

  return (
    <div className={`team-reveal ${revealed ? 'team-reveal--visible' : ''}`}>
      <p className="team-reveal__label">
        {existingFan ? 'You already knew what was up 🤝' : 'Your World Cup team is'}
      </p>

      <div className="team-reveal__card">
        <span className="team-reveal__flag">{flag}</span>
        <h1 className="team-reveal__team">{team}</h1>
      </div>

      {existingFan ? (
        <p className="team-reveal__reasoning">
          Great — you're already locked in. Let's get you ready for every match.
        </p>
      ) : (
        <p className="team-reveal__reasoning">{reasoning}</p>
      )}

      {knownSports.length > 0 && (
        <div className="team-reveal__sports">
          <span className="team-reveal__sports-label">Following with your</span>
          {knownSports.map(sport => (
            <span key={sport} className="team-reveal__sport-pill">{sport}</span>
          ))}
          <span className="team-reveal__sports-label">eyes →</span>
        </div>
      )}

      <button className="team-reveal__cta" onClick={onContinue}>
        {existingFan ? `Let's get ready, ${team}!` : `Let's go, ${team}!`}
      </button>
    </div>
  );
}

export default TeamReveal;
