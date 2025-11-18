'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function TestWidgetPage() {
  const searchParams = useSearchParams();
  const [agentId, setAgentId] = useState<string>('');
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get agent_id from URL params or use default
    const urlAgentId = searchParams.get('agent_id');
    if (urlAgentId) {
      setAgentId(urlAgentId);
    }
  }, [searchParams]);

  const loadWidget = () => {
    if (!agentId.trim()) {
      setError('Please enter an agent ID');
      return;
    }

    // Remove existing widget if any
    const existingScript = document.getElementById('chat-widget-script');
    if (existingScript) {
      existingScript.remove();
    }

    const existingContainer = document.getElementById('chat-widget-container');
    if (existingContainer) {
      existingContainer.remove();
    }

    setError(null);
    setWidgetLoaded(false);

    // Create and load the widget script
    const script = document.createElement('script');
    script.id = 'chat-widget-script';
    script.src = `/api/widget/chat.js?agent_id=${encodeURIComponent(agentId.trim())}`;
    script.async = true;
    
    script.onload = () => {
      console.log('[Test Widget Page] Widget script loaded successfully');
      setWidgetLoaded(true);
      
      // Check if widget button appears after a short delay
      setTimeout(() => {
        const widgetButton = document.getElementById('chat-widget-button');
        if (widgetButton) {
          console.log('[Test Widget Page] Widget button found in DOM');
        } else {
          console.warn('[Test Widget Page] Widget button not found after load');
          setError('Widget script loaded but widget button not found. Check console for errors.');
        }
      }, 1000);
    };
    
    script.onerror = () => {
      console.error('[Test Widget Page] Failed to load widget script');
      setError('Failed to load widget script. Check console for errors.');
      setWidgetLoaded(false);
    };

    document.head.appendChild(script);
  };

  const removeWidget = () => {
    const script = document.getElementById('chat-widget-script');
    if (script) {
      script.remove();
    }

    const container = document.getElementById('chat-widget-container');
    if (container) {
      container.remove();
    }

    setWidgetLoaded(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Chat Widget Test Page</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Test the embeddable chat widget with your agent
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 font-semibold">Error:</p>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Widget Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Agent ID (Database UUID):
              </label>
              <input
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="e.g., 3f75ab81-4244-4b6c-960d-5c9632c846a0"
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter the database UUID of your chat agent. You can find this in the Chat Agents list.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadWidget}
                disabled={!agentId.trim() || widgetLoaded}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {widgetLoaded ? 'Widget Loaded' : 'Load Widget'}
              </button>
              
              {widgetLoaded && (
                <button
                  onClick={removeWidget}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Remove Widget
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Embed Code</h2>
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm">
            <code>
              {`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/widget/chat.js?agent_id=${agentId || 'YOUR_AGENT_ID'}"></script>`}
            </code>
          </div>
          <button
            onClick={() => {
              const code = `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/widget/chat.js?agent_id=${agentId}"></script>`;
              navigator.clipboard.writeText(code);
              alert('Embed code copied to clipboard!');
            }}
            disabled={!agentId.trim()}
            className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Copy Embed Code
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Enter your agent's database UUID (found in the Chat Agents list)</li>
            <li>Click "Load Widget" to load the chat widget</li>
            <li>Look for the chat button in the bottom-right corner of the page</li>
            <li>Click the button to open the chat window</li>
            <li>Send a test message to verify the widget is working</li>
            <li>Check the browser console (F12) for any errors or logs</li>
          </ol>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> The widget requires the agent to be:
            </p>
            <ul className="list-disc list-inside mt-2 text-sm text-blue-700 dark:text-blue-300">
              <li>Linked to a Retell agent (has a retell_agent_id)</li>
              <li>Published in Retell AI (use the publish button in Chat Agents list)</li>
              <li>Active in your database</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Test Content</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            This is some sample content on the page. Scroll down to see more. The chat widget should appear as a floating button in the bottom-right corner.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold mb-2">Section 1</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
            
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold mb-2">Section 2</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
            </div>
            
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold mb-2">Section 3</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
