import Retell from 'retell-sdk';

interface RetellClientOptions {
  maxRetries?: number;
  timeout?: number;
  enableLogging?: boolean;
}

/**
 * Creates a Retell client with enhanced configuration
 * @param apiKey - Retell API key
 * @param options - Optional client configuration
 * @returns Configured Retell client instance
 */
export function createRetellClient(
  apiKey: string,
  options?: RetellClientOptions
) {
  const clientOptions: any = {
    apiKey,
  };

  // Configure retries (default: 2, can be overridden)
  if (options?.maxRetries !== undefined) {
    clientOptions.maxRetries = options.maxRetries;
  }

  // Configure timeout (default: 60 seconds, can be overridden)
  if (options?.timeout !== undefined) {
    clientOptions.timeout = options.timeout;
  }

  // Enable debug logging in development
  if (options?.enableLogging || process.env.NODE_ENV === 'development') {
    // SDK automatically logs when DEBUG=true is set
    if (process.env.DEBUG === 'true') {
      // Logging is handled automatically by the SDK
    }
  }

  return new Retell(clientOptions);
}

export interface RetellAgentConfig {
  llm_id?: string;
  llm_type?: 'retell-llm' | 'custom-llm';
  voice_id?: string;
  first_message?: string;
  language?: string;
  enable_transcription?: boolean;
  enable_recording?: boolean;
  enable_voicemail_detection?: boolean;
  voicemail_message?: string;
  enable_end_call_function_enabled?: boolean;
  end_call_function_id?: string;
  enable_transfer_call?: boolean;
  transfer_call_function_id?: string;
  enable_language_detection?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateRetellAgentParams {
  agent_name: string;
  llm_websocket_url?: string;
  voice_id: string;
  language?: string;
  enable_transcription?: boolean;
  enable_recording?: boolean;
  enable_voicemail_detection?: boolean;
  voicemail_message?: string;
  enable_end_call_function_enabled?: boolean;
  end_call_function_id?: string;
  enable_transfer_call?: boolean;
  transfer_call_function_id?: string;
  enable_language_detection?: boolean;
  metadata?: Record<string, any>;
}

