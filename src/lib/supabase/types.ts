// Database types will be generated using:
// supabase gen types typescript --project-id your-project-ref > src/lib/supabase/types.ts
// Or for local: supabase gen types typescript --local > src/lib/supabase/types.ts

// Placeholder types - replace with generated types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          domain: string | null;
          subdomain: string | null;
          parent_id: string | null;
          tier: 'standard' | 'premium' | 'enterprise';
          settings: Json;
          branding: Json;
          features: Json;
          billing_email: string | null;
          billing_plan: 'pay_as_you_go' | 'monthly' | 'annual';
          balance: number;
          retell_api_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
      };
      user_tenants: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string;
          role: 'super_admin' | 'tenant_admin' | 'subtenant_admin' | 'agent' | 'viewer';
          permissions: Json;
          status: 'active' | 'inactive' | 'suspended';
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_tenants']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_tenants']['Insert']>;
      };
      agents: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          type: 'chat' | 'voice';
          description: string | null;
          retell_agent_id: string | null;
          retell_phone_number_id: string | null;
          configuration: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['agents']['Insert']>;
      };
      interactions: {
        Row: {
          id: string;
          tenant_id: string;
          agent_id: string;
          type: 'chat' | 'voice';
          status: 'in_progress' | 'completed' | 'failed';
          retell_call_id: string | null;
          retell_conversation_id: string | null;
          customer_phone: string | null;
          customer_email: string | null;
          duration: number | null;
          transcript: Json | null;
          metadata: Json;
          billed: boolean;
          billing_record_id: string | null;
          started_at: string;
          ended_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['interactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['interactions']['Insert']>;
      };
      billing_records: {
        Row: {
          id: string;
          tenant_id: string;
          amount: number;
          currency: string;
          description: string | null;
          period_start: string;
          period_end: string;
          interaction_count: number;
          status: 'pending' | 'paid' | 'failed';
          payment_method: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['billing_records']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['billing_records']['Insert']>;
      };
      api_keys: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          permissions: Json;
          is_active: boolean;
          last_used_at: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['api_keys']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['api_keys']['Insert']>;
      };
    };
  };
}

