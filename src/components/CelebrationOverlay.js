import { useEffect } from 'react';
import './CelebrationOverlay.css';

function CelebrationOverlay({ show, message, points, onDismiss }) {
  useEffect(() => {
    if (!show) return;

    const duration = 2500;
    const end = Date.now() + duration;

    const frame = () => {
      window.confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#7cfc8e', '#ffffff', '#26de81'],
      });
      window.confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#7cfc8e', '#ffffff', '#26de81'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    if (window.confetti) {
      frame();
    }

    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null;

  return (
    <div className="celebration-overlay">
      <div className="celebration-card">
        <div className="celebration-icon">🎯</div>
        <div className="celebration-title">Correct!</div>
        <div className="celebration-message">{message}</div>
        {points > 0 && (
          <div className="celebration-points">+{points} pts</div>
        )}
      </div>
    </div>
  );
}

export default CelebrationOverlay;
