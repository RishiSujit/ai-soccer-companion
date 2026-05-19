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

function TeamReveal({ team, reasoning, onContinue }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const flag = FLAG_EMOJIS[team] ?? '🌍';

  return (
    <div className={`team-reveal ${revealed ? 'team-reveal--visible' : ''}`}>
      <p className="team-reveal__label">Your World Cup team is</p>

      <div className="team-reveal__card">
        <span className="team-reveal__flag">{flag}</span>
        <h1 className="team-reveal__team">{team}</h1>
      </div>

      <p className="team-reveal__reasoning">{reasoning}</p>

      <button className="team-reveal__cta" onClick={onContinue}>
        Let's go, {team}!
      </button>
    </div>
  );
}

export default TeamReveal;
