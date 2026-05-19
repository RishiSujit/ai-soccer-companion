import { useState } from 'react';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const clearMessages = () => setMessages([]);

  // TODO: Phase 4 — wire to sendChatMessage, manage sessionId, handle streaming
  return { messages, isLoading, addMessage, clearMessages, setIsLoading };
}
