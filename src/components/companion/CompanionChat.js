import { useState, useEffect, useRef } from 'react';
import { sendCompanionMessage } from '../../services/api';
import { supabase } from '../../lib/supabase';
import PivotalMomentAlert from '../PivotalMomentAlert';
import FormationPitch from './FormationPitch';
import LineupList from './LineupList';

const FLAGS = {
  'Argentina':'🇦🇷','France':'🇫🇷','Brazil':'🇧🇷',
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Germany':'🇩🇪','Spain':'🇪🇸',
  'USA':'🇺🇸','Mexico':'🇲🇽','Portugal':'🇵🇹',
  'Netherlands':'🇳🇱','Italy':'🇮🇹','Japan':'🇯🇵',
  'Morocco':'🇲🇦','Senegal':'🇸🇳','Australia':'🇦🇺',
  'Croatia':'🇭🇷','Uruguay':'🇺🇾','Colombia':'🇨🇴',
};

const MATCH_OPENING = "I'm your match companion for this game. Ask me anything — rules, players, what just happened. I'll explain it in plain English.";
const GENERAL_OPENING = "Hey! I'm your World Cup 2026 companion. Ask me anything — rules, players, how the tournament works, or what's been happening. What's on your mind?";

const GENERAL_STARTER_PILLS = [
  "Explain the offside rule to me",
  "Who are the favorites to win it all?",
  "How does the group stage work?",
  "What's VAR and when does it get used?",
];

function getPillIcon(question) {
  const q = question.toLowerCase();
  if (q.includes('how often') || q.includes('how many') || q.includes('stat')) return '📊';
  if (q.includes('why') && (q.includes('controversial') || q.includes('argue'))) return '🔥';
  if (q.includes('watch') || q.includes('look for') || q.includes('spot')) return '👀';
  if (q.includes('what happens') || q.includes('next') || q.includes('result')) return '⚡';
  if (q.includes('odds') || q.includes('chance') || q.includes('likely')) return '🎲';
  if (q.includes('best') || q.includes('greatest') || q.includes('who is') || q.includes('favorites')) return '🏆';
  if (q.includes('history') || q.includes('before') || q.includes('last time')) return '📖';
  if (q.includes('bar') || q.includes('friends') || q.includes('say') || q.includes('tell')) return '🍺';
  if (q.includes('how does') || q.includes('explain') || q.includes('what is') || q.includes('rule') || q.includes('var')) return '💡';
  return '💬';
}

function ChatPanel({
  messages, isLoading, input, setInput, onSend, onKeyDown,
  ratings, onRating,
  followUps, showFollowUps, tappedIndex, onFollowUpTap, onDismissFollowUps,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, showFollowUps]);

  return (
    <div className="chat-panel">
      <div className="split-chat-feed">
        {messages.map((msg, i) => (
          <div key={i} className="companion-message" style={{ animation: 'slideUp 0.3s ease forwards' }}>
            {msg.role === 'assistant' && (
              <div className="msg-sender-label">
                <div className="ai-avatar">AI</div>
                <span>Companion</span>
              </div>
            )}
            <div className={`onboarding-chat__bubble onboarding-chat__bubble--${msg.role}`}>
              {msg.content}
            </div>
            {msg.role === 'assistant' && (
              <div className="message-rating-row">
                <button
                  className={`rating-btn thumbs-up${ratings[i] === 'up' ? ' rated' : ''}`}
                  onClick={() => onRating(i, 'up', msg.content)}
                  disabled={!!ratings[i]}
                  aria-label="Helpful"
                >👍</button>
                <button
                  className={`rating-btn thumbs-down${ratings[i] === 'down' ? ' rated' : ''}`}
                  onClick={() => onRating(i, 'down', msg.content)}
                  disabled={!!ratings[i]}
                  aria-label="Not helpful"
                >👎</button>
                {ratings[i] && (
                  <span className="rating-thanks">
                    {ratings[i] === 'up' ? 'Thanks!' : "Got it — we'll improve"}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="onboarding-chat__bubble onboarding-chat__bubble--assistant onboarding-chat__bubble--loading">
            <span className="onboarding-chat__dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </div>
        )}
        {showFollowUps && followUps.length > 0 && (
          <div className="follow-ups-container">
            <div className="follow-ups-label">Ask more</div>
            <div className="follow-ups-pills">
              {followUps.map((q, i) => (
                <button
                  key={i}
                  className={`follow-up-pill${tappedIndex === i ? ' loading' : ''}`}
                  onClick={() => onFollowUpTap(q, i)}
                  disabled={isLoading}
                >
                  {tappedIndex === i ? '...' : (
                    <>
                      <span className="pill-icon">{getPillIcon(q)}</span>
                      <span className="pill-text">{q}</span>
                    </>
                  )}
                </button>
              ))}
              <button className="follow-up-dismiss" onClick={onDismissFollowUps} disabled={isLoading}>
                Got it ✓
              </button>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="split-chat-input">
        <input
          className="onboarding-chat__input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything..."
          disabled={isLoading}
        />
        <button
          className="onboarding-chat__send"
          onClick={onSend}
          disabled={isLoading || !input.trim()}
        />
      </div>
    </div>
  );
}

function CompanionChat({ match, userContext, userId, onBack, preloadedQuestion }) {
  const isGeneral = !match;
  const today = new Date().toISOString().split('T')[0];
  const chatStorageKey = match?.id
    ? `wcc_chat_${match.id}_${userId}`
    : `wcc_chat_general_${userId}_${today}`;

  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(chatStorageKey));
      if (saved?.timestamp > Date.now() - 7200000 && saved?.messages?.length > 0) {
        return saved.messages;
      }
    } catch {}
    return [{ role: 'assistant', content: isGeneral ? GENERAL_OPENING : MATCH_OPENING }];
  });
  const [conversationHistory, setConversationHistory] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(chatStorageKey));
      if (saved?.timestamp > Date.now() - 7200000 && saved?.history?.length > 0) {
        return saved.history;
      }
    } catch {}
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState('formation');
  const [followUps, setFollowUps] = useState([]);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [tappedIndex, setTappedIndex] = useState(null);
  const [ratings, setRatings] = useState({});
  const [currentMatchContext, setCurrentMatchContext] = useState(null);
  const [currentSignals, setCurrentSignals] = useState(null);
  const [pivotalEvent, setPivotalEvent] = useState(null);
  const [showStarterPills, setShowStarterPills] = useState(() => {
    if (!isGeneral) return false;
    try {
      const saved = JSON.parse(localStorage.getItem(chatStorageKey));
      if (saved?.timestamp > Date.now() - 7200000 && saved?.messages?.length > 0) return false;
    } catch {}
    return true;
  });
  const lastEventIdRef = useRef(null);
  const preloadFiredRef = useRef(false);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setShowStarterPills(false);
    setFollowUps([]);
    setShowFollowUps(false);
    setTappedIndex(null);
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setIsLoading(true);

    const updatedHistory = [...conversationHistory, { role: 'user', content: trimmed }];

    try {
      const data = await sendCompanionMessage(trimmed, conversationHistory, match, userContext);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      setConversationHistory([...updatedHistory, { role: 'assistant', content: data.reply }]);
      if (data.matchContext) setCurrentMatchContext(data.matchContext);
      if (data.signals) setCurrentSignals(data.signals);
      if (data.followUps?.length > 0) {
        setFollowUps(data.followUps);
        setShowFollowUps(true);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, something went wrong. Try asking again?" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fire preloaded question from home screen on mount
  useEffect(() => {
    if (preloadedQuestion && !preloadFiredRef.current) {
      preloadFiredRef.current = true;
      const timer = setTimeout(() => sendMessage(preloadedQuestion), 350);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist chat to localStorage whenever messages update
  useEffect(() => {
    if (messages.length <= 1) return;
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify({
        messages,
        history: conversationHistory,
        timestamp: Date.now(),
      }));
    } catch {}
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClearChat = () => {
    try { localStorage.removeItem(chatStorageKey); } catch {}
    setMessages([{ role: 'assistant', content: isGeneral ? GENERAL_OPENING : MATCH_OPENING }]);
    setConversationHistory([]);
    setFollowUps([]);
    setShowFollowUps(false);
    if (isGeneral) setShowStarterPills(true);
  };

  const handleSend = () => sendMessage(input);

  const handleFollowUpTap = (question, i) => {
    setTappedIndex(i);
    setShowFollowUps(false);
    setFollowUps([]);
    setTappedIndex(null);
    sendMessage(question);
  };

  const handleDismissFollowUps = () => {
    setShowFollowUps(false);
    setFollowUps([]);
    setTappedIndex(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRating = async (messageIndex, rating, messageContent) => {
    if (ratings[messageIndex]) return;
    setRatings(prev => ({ ...prev, [messageIndex]: rating }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('response_ratings').insert({
        user_id: session?.user?.id || userId || null,
        message_content: messageContent.slice(0, 500),
        rating,
        match_id: currentMatchContext?.id || null,
        context: { matchState: currentMatchContext, signals: currentSignals },
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Rating save error:', err.message);
    }
  };

  useEffect(() => {
    if (!currentMatchContext?.events) return;
    const events = currentMatchContext.events || [];
    const signals = currentMatchContext.derivedSignals;
    if (!signals?.emotional_intensity?.includes('spike')) return;
    const latestEvent = events[events.length - 1];
    if (!latestEvent) return;
    const eventId = `${latestEvent.time?.elapsed}-${latestEvent.type}-${latestEvent.player?.name}`;
    if (eventId === lastEventIdRef.current) return;
    const dramaticTypes = ['Goal', 'Red Card', 'VAR', 'Missed Penalty'];
    if (!dramaticTypes.includes(latestEvent.type)) return;
    lastEventIdRef.current = eventId;
    setPivotalEvent(latestEvent);
    const timer = setTimeout(() => setPivotalEvent(null), 8000);
    return () => clearTimeout(timer);
  }, [currentMatchContext]);

  const chatProps = {
    messages, isLoading, input, setInput,
    onSend: handleSend, onKeyDown: handleKeyDown,
    ratings, onRating: handleRating,
    followUps, showFollowUps, tappedIndex,
    onFollowUpTap: handleFollowUpTap,
    onDismissFollowUps: handleDismissFollowUps,
  };

  // ── General mode (no match selected) ────────────────────
  if (isGeneral) {
    return (
      <div className="companion-chat">
        <div className="companion-hero companion-hero--general">
          <div className="hero-top-row">
            <button className="back-btn" onClick={onBack}>← Companion</button>
            <div className="hero-general-title">World Cup 2026</div>
            <button className="clear-chat-btn" onClick={handleClearChat} title="Clear chat">↺</button>
          </div>
        </div>

        <div className="companion-general-body">
          {showStarterPills && (
            <div className="starter-pills-container">
              <div className="starter-pills-label">Start here</div>
              <div className="starter-pills-grid">
                {GENERAL_STARTER_PILLS.map((q, i) => (
                  <button
                    key={i}
                    className="starter-pill"
                    onClick={() => {
                      setShowStarterPills(false);
                      sendMessage(q);
                    }}
                    disabled={isLoading}
                  >
                    <span className="starter-pill__icon">{getPillIcon(q)}</span>
                    <span className="starter-pill__text">{q}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <ChatPanel {...chatProps} />
        </div>
      </div>
    );
  }

  // ── Match mode ───────────────────────────────────────────
  return (
    <div className="companion-chat">

      <PivotalMomentAlert
        event={pivotalEvent}
        signals={currentMatchContext?.derivedSignals}
        userTeam={userContext?.team}
        onAskCompanion={(q) => sendMessage(q)}
        onDismiss={() => setPivotalEvent(null)}
      />

      <div className="companion-hero">
        <div className="hero-top-row">
          <button className="back-btn" onClick={onBack}>← Change match</button>
          <div className="hero-stage-tag">
            <div className="live-indicator" />
            {match.stage}{match.minute ? ` · ${match.minute}'` : ''}
          </div>
          <div className="hero-minute-badge">
            {match.minute ? `${match.minute}'` : match.status}
          </div>
        </div>
        <div className="hero-score-row">
          <div className="hero-team">
            <div className="hero-flag">{FLAGS[match.homeTeam] ?? '🌍'}</div>
            <div className="hero-name">{match.homeTeam}</div>
          </div>
          <div className="hero-scores">
            <span className="hero-score-n">{match.homeScore ?? '–'}</span>
            <span className="hero-score-div">–</span>
            <span className="hero-score-n">{match.awayScore ?? '–'}</span>
          </div>
          <div className="hero-team">
            <div className="hero-flag">{FLAGS[match.awayTeam] ?? '🌍'}</div>
            <div className="hero-name">{match.awayTeam}</div>
          </div>
        </div>
      </div>

      {/* Desktop split */}
      <div className="companion-split">
        <div className="split-left">
          <div className="split-panel-header">
            <div className="split-panel-title">Live formation</div>
            <div className="split-panel-tabs">
              <button className={mobileTab !== 'lineup' ? 'active' : ''} onClick={() => setMobileTab('formation')}>Pitch</button>
              <button className={mobileTab === 'lineup' ? 'active' : ''} onClick={() => setMobileTab('lineup')}>Lineup</button>
            </div>
          </div>
          <div className="split-left-content">
            {mobileTab === 'lineup'
              ? <LineupList {...match} userContext={userContext} />
              : <FormationPitch {...match} userContext={userContext} />}
          </div>
        </div>
        <div className="split-right">
          <div className="split-panel-header">
            <div className="split-panel-title">AI Companion</div>
            <button className="clear-chat-btn" onClick={handleClearChat} title="Clear chat">↺</button>
          </div>
          <ChatPanel {...chatProps} />
        </div>
      </div>

      {/* Mobile tabbed */}
      <div className="companion-mobile">
        <div className="mobile-panel-tabs">
          <div className={`mobile-tab ${mobileTab === 'formation' ? 'active' : ''}`} onClick={() => setMobileTab('formation')}>Formation</div>
          <div className={`mobile-tab ${mobileTab === 'lineup' ? 'active' : ''}`} onClick={() => setMobileTab('lineup')}>Lineup</div>
          <div className={`mobile-tab ${mobileTab === 'chat' ? 'active' : ''}`} onClick={() => setMobileTab('chat')}>Chat</div>
        </div>
        <div className="mobile-panel-content">
          {mobileTab === 'formation' && <div className="mobile-panel-scroll"><FormationPitch {...match} userContext={userContext} /></div>}
          {mobileTab === 'lineup' && <div className="mobile-panel-scroll"><LineupList {...match} userContext={userContext} /></div>}
          {mobileTab === 'chat' && <ChatPanel {...chatProps} />}
        </div>
      </div>

    </div>
  );
}

export default CompanionChat;
