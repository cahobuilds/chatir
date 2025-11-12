import Retell from 'retell-sdk';

export function createRetellClient(apiKey: string) {
  return new Retell({
    apiKey,
  });
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

