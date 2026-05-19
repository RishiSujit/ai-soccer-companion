import { useState, useEffect, useRef } from 'react';
import { sendCompanionMessage } from '../../services/api';
import RatingButtons from './RatingButtons';

const MATCH_CONTEXT = {
  homeTeam: 'Argentina',
  awayTeam: 'France',
  homeScore: 2,
  awayScore: 1,
  minute: 67,
  stage: 'Group Stage',
};

const OPENING_MESSAGE = "I'm your match companion for this game. Ask me anything — rules, players, what just happened. I'll explain it in plain English.";

function CompanionChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: OPENING_MESSAGE, rated: null },
  ]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: trimmed, rated: null }]);
    setInput('');
    setIsLoading(true);

    const updatedHistory = [...conversationHistory, { role: 'user', content: trimmed }];

    try {
      const data = await sendCompanionMessage(trimmed, conversationHistory, MATCH_CONTEXT);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, rated: null }]);
      setConversationHistory([...updatedHistory, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, something went wrong. Try again?", rated: null },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRate = (index, rating) => {
    setMessages(prev =>
      prev.map((msg, i) => (i === index ? { ...msg, rated: rating } : msg))
    );
  };

  return (
    <div className="companion-chat">
      <div className="match-pill">
        <div>
          <div className="match-teams">
            {MATCH_CONTEXT.homeTeam} vs {MATCH_CONTEXT.awayTeam}
          </div>
          <div className="match-min">{MATCH_CONTEXT.minute}' · {MATCH_CONTEXT.stage}</div>
        </div>
        <div className="match-score">
          {MATCH_CONTEXT.homeScore} — {MATCH_CONTEXT.awayScore}
        </div>
      </div>

      <div className="onboarding-chat__messages">
        {messages.map((msg, i) => (
          <div key={i} className="companion-message">
            <div className={`onboarding-chat__bubble onboarding-chat__bubble--${msg.role}`}>
              {msg.content}
            </div>
            {msg.role === 'assistant' && (
              <RatingButtons onRate={(rating) => handleRate(i, rating)} rated={msg.rated} />
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
        <div ref={bottomRef} />
      </div>

      <div className="onboarding-chat__input-row">
        <input
          className="onboarding-chat__input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          disabled={isLoading}
        />
        <button
          className="onboarding-chat__send"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
        />
      </div>
    </div>
  );
}

export default CompanionChat;
