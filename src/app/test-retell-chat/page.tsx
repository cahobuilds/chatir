'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
}

interface ApiCall {
  method: string;
  url: string;
  request?: any;
  response?: any;
  error?: string;
  timestamp: string;
}

export default function RetellChatTestPage() {
  const [agentId, setAgentId] = useState<string>('');
  const [retellAgentId, setRetellAgentId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          setIsAuthenticated(false);
          setAuthError('You must be logged in to use this test page. Please log in first.');
        } else {
          setIsAuthenticated(true);
          setAuthError(null);
        }
      } catch (err: any) {
        setIsAuthenticated(false);
        setAuthError('Failed to check authentication status: ' + (err.message || 'Unknown error'));
      }
    };
    checkAuth();
  }, []);

  const addApiCall = (call: Omit<ApiCall, 'timestamp'>) => {
    setApiCalls(prev => [...prev, { ...call, timestamp: new Date().toISOString() }]);
  };

  const addMessage = (role: 'user' | 'agent', content: string) => {
    setMessages(prev => [...prev, {
      role,
      content,
      timestamp: new Date().toISOString(),
    }]);
  };

  const handleCreateChatSession = async () => {
    if (!retellAgentId.trim()) {
      setError('Please enter a Retell Agent ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      addApiCall({
        method: 'POST',
        url: '/api/test-retell-chat/create-session',
        request: { retell_agent_id: retellAgentId },
      });

      const response = await fetch('/api/test-retell-chat/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ retell_agent_id: retellAgentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }

      setChatId(data.chat_id);
      addApiCall({
        method: 'POST',
        url: '/api/test-retell-chat/create-session',
        response: data,
      });

      addMessage('agent', `Chat session created! Chat ID: ${data.chat_id}`);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create chat session';
      setError(errorMsg);
      addApiCall({
        method: 'POST',
        url: '/api/test-retell-chat/create-session',
        error: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (!chatId) {
      setError('Please create a chat session first');
      return;
    }

    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);
    setError(null);
    addMessage('user', userMessage);

    try {
      addApiCall({
        method: 'POST',
        url: '/api/test-retell-chat/send-message',
        request: { chat_id: chatId, message: userMessage },
      });

      const response = await fetch('/api/test-retell-chat/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ chat_id: chatId, message: userMessage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }

      addApiCall({
        method: 'POST',
        url: '/api/test-retell-chat/send-message',
        response: data,
      });

      if (data.response) {
        addMessage('agent', data.response);
      } else {
        addMessage('agent', 'No response received from agent');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to send message';
      setError(errorMsg);
      addApiCall({
        method: 'POST',
        url: '/api/test-retell-chat/send-message',
        error: errorMsg,
      });
      addMessage('agent', `Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestWithAgentId = async () => {
    if (!agentId.trim()) {
      setError('Please enter an Agent ID');
      return;
    }

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);
    setError(null);
    addMessage('user', userMessage);

    try {
      addApiCall({
        method: 'POST',
        url: `/api/agents/${agentId}/test`,
        request: { test_type: 'chat', message: userMessage },
      });

      const response = await fetch(`/api/agents/${agentId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_type: 'chat', message: userMessage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }

      addApiCall({
        method: 'POST',
        url: `/api/agents/${agentId}/test`,
        response: data,
      });

      if (data.response) {
        addMessage('agent', data.response);
      } else {
        addMessage('agent', 'No response received from agent');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to test agent';
      setError(errorMsg);
      addApiCall({
        method: 'POST',
        url: `/api/agents/${agentId}/test`,
        error: errorMsg,
      });
      addMessage('agent', `Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setApiCalls([]);
    setChatId(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Retell Chat API Test Page</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Direct connection to Retell Chat API for debugging connection issues
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 font-semibold">Error:</p>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Configuration */}
          <div className="space-y-6">
            {/* Method 1: Direct Retell API */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Method 1: Direct Retell API</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Retell Agent ID:
                  </label>
                  <input
                    type="text"
                    value={retellAgentId}
                    onChange={(e) => setRetellAgentId(e.target.value)}
                    placeholder="e.g., oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <button
                  onClick={handleCreateChatSession}
                  disabled={isLoading || !retellAgentId.trim()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Chat Session'}
                </button>
                {chatId && (
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                      Chat ID: <span className="font-mono">{chatId}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Method 2: Via Agent ID */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Method 2: Via Agent ID</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Agent ID (from database):
                  </label>
                  <input
                    type="text"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    placeholder="e.g., 8d1943ec-2406-4c67-85d5-acec82c07f05"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This uses the test endpoint which handles Retell integration automatically
                </p>
              </div>
            </div>

            {/* Message Input */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Send Message</h2>
              <div className="space-y-4">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message..."
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (chatId) {
                        handleSendMessage();
                      } else if (agentId) {
                        handleTestWithAgentId();
                      }
                    }
                  }}
                />
                <div className="flex gap-2">
                  {chatId && (
                    <button
                      onClick={handleSendMessage}
                      disabled={isLoading || !message.trim()}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Sending...' : 'Send (Direct API)'}
                    </button>
                  )}
                  {agentId && (
                    <button
                      onClick={handleTestWithAgentId}
                      disabled={isLoading || !message.trim()}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Testing...' : 'Test (Via Agent ID)'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleClear}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Clear All
            </button>
          </div>

          {/* Right Column: Chat & API Logs */}
          <div className="space-y-6">
            {/* Chat Messages */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Chat Messages</h2>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-[300px] max-h-[400px] overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No messages yet...</p>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        <p className="text-sm font-semibold mb-1">
                          {msg.role === 'user' ? 'You' : 'Agent'}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* API Calls Log */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">API Calls Log</h2>
              <div className="bg-gray-900 text-green-400 font-mono text-xs p-4 rounded-lg max-h-[400px] overflow-y-auto">
                {apiCalls.length === 0 ? (
                  <p className="text-gray-500">No API calls yet...</p>
                ) : (
                  apiCalls.map((call, idx) => (
                    <div key={idx} className="mb-4 border-b border-gray-700 pb-2">
                      <div className="text-yellow-400 mb-1">
                        [{call.timestamp}] {call.method} {call.url}
                      </div>
                      {call.request && (
                        <div className="text-blue-400 mb-1">
                          Request: <pre className="inline">{JSON.stringify(call.request, null, 2)}</pre>
                        </div>
                      )}
                      {call.response && (
                        <div className="text-green-400 mb-1">
                          Response: <pre className="inline">{JSON.stringify(call.response, null, 2)}</pre>
                        </div>
                      )}
                      {call.error && (
                        <div className="text-red-400">
                          Error: {call.error}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

