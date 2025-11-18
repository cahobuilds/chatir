import { NextRequest, NextResponse } from 'next/server';

// GET /api/widget/chat.js - Serves the embeddable chat widget script
// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agent_id');
  
  // Dynamically determine base URL from request
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  if (!agentId) {
    return new NextResponse('// Error: agent_id parameter is required', {
      status: 400,
      headers: { 
        'Content-Type': 'text/javascript; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  // Generate the widget script
  const widgetScript = `
(function() {
  'use strict';
  
  const agentId = '${agentId}';
  const apiUrl = '${baseUrl}/api/widget/chat/message';
  
  // Widget configuration
  const config = {
    position: 'bottom-right',
    primaryColor: '#3b82f6',
    textColor: '#ffffff',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    zIndex: 9999,
  };
  
  // Create widget container
  let widgetContainer = null;
  let chatWindow = null;
  let isOpen = false;
  let conversationId = null;
  
  function createWidget() {
    // Check if already created
    if (document.getElementById('chat-widget-button')) {
      console.log('Widget already exists');
      return;
    }
    
    console.log('Creating chat widget for agent:', agentId);
    
    // Create button
    const button = document.createElement('div');
    button.id = 'chat-widget-button';
    button.setAttribute('aria-label', 'Open chat');
    button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="currentColor"/></svg>';
    button.style.cssText = \`
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      width: 60px !important;
      height: 60px !important;
      background-color: \${config.primaryColor} !important;
      color: \${config.textColor} !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      z-index: 9999 !important;
      transition: transform 0.2s !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      box-sizing: border-box !important;
    \`;
    button.addEventListener('click', toggleChat);
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });
    
    // Create chat window
    chatWindow = document.createElement('div');
    chatWindow.id = 'chat-widget-window';
    chatWindow.style.cssText = \`
      position: fixed !important;
      bottom: 90px !important;
      right: 20px !important;
      width: 380px !important;
      height: 600px !important;
      max-height: calc(100vh - 120px) !important;
      background-color: \${config.backgroundColor} !important;
      border-radius: \${config.borderRadius} !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important;
      display: none !important;
      flex-direction: column !important;
      z-index: 9999 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      box-sizing: border-box !important;
    \`;
    
    // Header
    const header = document.createElement('div');
    header.style.cssText = \`
      background-color: \${config.primaryColor};
      color: \${config.textColor};
      padding: 16px;
      border-radius: \${config.borderRadius} \${config.borderRadius} 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    \`;
    header.innerHTML = \`
      <div>
        <div style="font-weight: 600; font-size: 16px;">Chat Support</div>
        <div style="font-size: 12px; opacity: 0.9;">We're here to help</div>
      </div>
      <button id="chat-widget-close" style="background: none; border: none; color: \${config.textColor}; cursor: pointer; font-size: 24px; line-height: 1;">&times;</button>
    \`;
    header.querySelector('#chat-widget-close').addEventListener('click', toggleChat);
    
    // Messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.id = 'chat-widget-messages';
    messagesContainer.style.cssText = \`
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    \`;
    
    // Input container
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = \`
      padding: 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    \`;
    
    const input = document.createElement('input');
    input.id = 'chat-widget-input';
    input.type = 'text';
    input.placeholder = 'Type your message...';
    input.style.cssText = \`
      flex: 1;
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
    \`;
    
    const sendButton = document.createElement('button');
    sendButton.innerHTML = 'Send';
    sendButton.style.cssText = \`
      padding: 12px 24px;
      background-color: \${config.primaryColor};
      color: \${config.textColor};
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    \`;
    
    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
    
    inputContainer.appendChild(input);
    inputContainer.appendChild(sendButton);
    
    chatWindow.appendChild(header);
    chatWindow.appendChild(messagesContainer);
    chatWindow.appendChild(inputContainer);
    
    widgetContainer = document.createElement('div');
    widgetContainer.id = 'chat-widget-container';
    widgetContainer.appendChild(button);
    widgetContainer.appendChild(chatWindow);
    
    // Append to body
    if (document.body) {
      document.body.appendChild(widgetContainer);
      console.log('Widget container appended to body');
    } else {
      console.error('Cannot append widget: document.body is null');
      return;
    }
    
    // Add welcome message
    addMessage('assistant', 'Hello! How can I help you today?');
    
    console.log('Chat widget created successfully');
  }
  
  function toggleChat() {
    isOpen = !isOpen;
    chatWindow.style.display = isOpen ? 'flex' : 'none';
    if (isOpen) {
      document.getElementById('chat-widget-input').focus();
    }
  }
  
  function addMessage(role, content) {
    const messagesContainer = document.getElementById('chat-widget-messages');
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = \`
      display: flex;
      justify-content: \${role === 'user' ? 'flex-end' : 'flex-start'};
      margin-bottom: 8px;
    \`;
    
    const bubble = document.createElement('div');
    bubble.style.cssText = \`
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
      \${role === 'user' 
        ? \`background-color: \${config.primaryColor}; color: \${config.textColor};\`
        : \`background-color: #f3f4f6; color: #1f2937;\`
      }
    \`;
    bubble.textContent = content;
    
    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  async function sendMessage() {
    const input = document.getElementById('chat-widget-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to UI
    addMessage('user', message);
    input.value = '';
    
    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typing-indicator';
    typingIndicator.style.cssText = \`
      display: flex;
      justify-content: flex-start;
      margin-bottom: 8px;
    \`;
    typingIndicator.innerHTML = \`
      <div style="background-color: #f3f4f6; padding: 10px 14px; border-radius: 18px;">
        <div style="display: flex; gap: 4px;">
          <div style="width: 8px; height: 8px; background-color: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite;"></div>
          <div style="width: 8px; height: 8px; background-color: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite 0.2s;"></div>
          <div style="width: 8px; height: 8px; background-color: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite 0.4s;"></div>
        </div>
      </div>
    \`;
    document.getElementById('chat-widget-messages').appendChild(typingIndicator);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          message: message,
          conversation_id: conversationId,
        }),
      });
      
      // Remove typing indicator
      typingIndicator.remove();
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Widget API error:', response.status, errorData);
        addMessage('assistant', 'Sorry, I encountered an error: ' + (errorData.error || errorData.message || 'Please try again.'));
        return;
      }
      
      const data = await response.json();
      
      if (data.response) {
        conversationId = data.conversation_id;
        addMessage('assistant', data.response);
      } else {
        addMessage('assistant', 'Sorry, I didn\'t receive a response. Please try again.');
      }
    } catch (error) {
      typingIndicator.remove();
      console.error('Widget fetch error:', error);
      addMessage('assistant', 'Sorry, I encountered a connection error. Please check your internet connection and try again.');
    }
  }
  
  // Initialize widget when DOM is ready
  function initWidget() {
    try {
      // Check if widget already exists
      if (document.getElementById('chat-widget-button')) {
        console.log('Chat widget already initialized');
        return;
      }
      
      // Ensure body exists
      if (!document.body) {
        console.log('Document body not found, retrying in 100ms...');
        setTimeout(initWidget, 100);
        return;
      }
      
      createWidget();
      console.log('Chat widget initialized successfully');
    } catch (error) {
      console.error('Error initializing chat widget:', error);
      // Retry after a delay if initialization fails
      setTimeout(() => {
        if (!document.getElementById('chat-widget-button')) {
          console.log('Retrying widget initialization...');
          initWidget();
        }
      }, 1000);
    }
  }
  
  // Multiple initialization strategies to handle different page load scenarios
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else if (document.readyState === 'interactive' || document.readyState === 'complete') {
    // DOM already loaded, initialize immediately
    initWidget();
  } else {
    // Fallback: wait a bit and try
    setTimeout(initWidget, 100);
  }
  
  // Also try on window load as a fallback
  window.addEventListener('load', () => {
    if (!document.getElementById('chat-widget-button')) {
      console.log('Window loaded, initializing widget...');
      initWidget();
    }
  });
  
  // Add CSS animation for typing indicator
  const style = document.createElement('style');
  style.textContent = \`
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    #chat-widget-button {
      position: fixed !important;
      z-index: 9999 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      box-sizing: border-box !important;
    }
    #chat-widget-window {
      position: fixed !important;
      z-index: 9999 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      box-sizing: border-box !important;
    }
    #chat-widget-container {
      position: fixed !important;
      z-index: 9999 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      box-sizing: border-box !important;
    }
  \`;
  
  // Ensure head exists before appending style
  if (document.head) {
    document.head.appendChild(style);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.head) {
        document.head.appendChild(style);
      }
    });
  }
})();
`;

  return new NextResponse(widgetScript, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  });
}

