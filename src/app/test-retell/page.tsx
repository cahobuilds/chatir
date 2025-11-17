'use client';

import { useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';

export default function RetellTestPage() {
  const [status, setStatus] = useState<string>('Ready');
  const [callId, setCallId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const retellClientRef = useRef<RetellWebClient | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const handleStartCall = async () => {
    if (!agentId.trim()) {
      addLog('ERROR: Please enter an agent ID');
      return;
    }

    try {
      setStatus('Creating web call...');
      addLog('Requesting web call from API...');

      // Get access token from API
      const response = await fetch(`/api/agents/${agentId}/test/web-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `API error: ${response.status}`);
      }

      const { access_token, call_id } = await response.json();
      setCallId(call_id);
      addLog(`Web call created: ${call_id}`);
      addLog(`Access token received (length: ${access_token.length})`);

      // Request microphone access BEFORE creating client
      addLog('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      addLog('Microphone access granted');

      // Create Retell client
      const retellClient = new RetellWebClient();
      retellClientRef.current = retellClient;

      // Set up ALL event listeners BEFORE startCall
      retellClient.on('call_started', () => {
        addLog('✅ call_started event fired');
        setStatus('Call started - initializing...');
      });

      retellClient.on('call_ready', () => {
        addLog('✅✅ call_ready event fired - ENGINE IS READY!');
        setStatus('Call ready - connected!');
      });

      retellClient.on('call_ended', (data: any) => {
        addLog(`❌ call_ended event fired: ${JSON.stringify(data)}`);
        setStatus('Call ended');
        cleanup();
      });

      retellClient.on('error', (error: any) => {
        addLog(`❌ ERROR event: ${error?.message || JSON.stringify(error)}`);
        setStatus(`Error: ${error?.message || 'Unknown error'}`);
      });

      retellClient.on('update', (data: any) => {
        if (data.transcript) {
          addLog(`📝 Transcript: ${data.transcript}`);
        }
        if (data.response) {
          addLog(`🤖 Agent: ${data.response}`);
        }
      });

      retellClient.on('agent_start_talking', () => {
        addLog('🎤 Agent started talking');
      });

      retellClient.on('agent_stop_talking', () => {
        addLog('🔇 Agent stopped talking');
      });

      // Start the call - NO MUTING, let SDK handle everything
      addLog('Starting Retell call...');
      setStatus('Starting call...');
      
      await retellClient.startCall({
        accessToken: access_token,
      });

      addLog('startCall() completed - waiting for events...');
      setStatus('Call initiated - waiting for connection...');

    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      setStatus(`Error: ${error.message}`);
      cleanup();
    }
  };

  const handleEndCall = () => {
    if (retellClientRef.current) {
      addLog('Ending call...');
      retellClientRef.current.stopCall();
      cleanup();
    }
  };

  const cleanup = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    retellClientRef.current = null;
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Retell SDK Test Page</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Agent ID:
            </label>
            <input
              type="text"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="Enter agent ID"
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="flex gap-4 mb-4">
            <button
              onClick={handleStartCall}
              disabled={status.startsWith('Call') || status === 'Starting call...'}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Start Call
            </button>
            <button
              onClick={handleEndCall}
              disabled={!retellClientRef.current}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              End Call
            </button>
            <button
              onClick={() => setLogs([])}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Clear Logs
            </button>
          </div>

          <div className="mb-4">
            <div className="text-lg font-semibold">Status: <span className="text-blue-600">{status}</span></div>
            {callId && <div className="text-sm text-gray-600">Call ID: {callId}</div>}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Event Logs</h2>
          <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

