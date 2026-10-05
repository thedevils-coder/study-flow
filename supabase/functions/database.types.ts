export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<
  Row extends Record<string, unknown>,
  Insert extends Record<string, unknown> = Partial<Row>,
  Update extends Record<string, unknown> = Partial<Row>,
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationship[];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          display_name: string;
          role: string;
          language: string;
          created_at: string;
        },
        {
          id: string;
          display_name?: string;
          role?: string;
          language?: string;
          created_at?: string;
        }
      >;
      subscriptions: Table<
        {
          user_id: string;
          provider: string;
          entitlement_id: string | null;
          entitlement_ids: string[];
          product_id: string | null;
          state: string;
          expires_at: string | null;
          will_renew: boolean;
          updated_at: string;
        },
        {
          user_id: string;
          provider?: string;
          entitlement_id?: string | null;
          entitlement_ids?: string[];
          product_id?: string | null;
          state?: string;
          expires_at?: string | null;
          will_renew?: boolean;
          updated_at?: string;
        }
      >;
      ai_generations: Table<
        {
          id: string;
          user_id: string;
          kind: string;
          prompt: string;
          result_text: string | null;
          result_meta: Json;
          model: string | null;
          tokens_used: number | null;
          status: string;
          provider: string | null;
          grounded: boolean;
          latency_ms: number | null;
          created_at: string;
        },
        {
          user_id: string;
          kind: string;
          prompt: string;
          result_text?: string | null;
          result_meta?: Json;
          model?: string | null;
          tokens_used?: number | null;
          status?: string;
          provider?: string | null;
          grounded?: boolean;
          latency_ms?: number | null;
        }
      >;
      user_achievements: Table<
        {
          user_id: string;
          achievement_id: string;
          earned_at: string;
        },
        {
          user_id: string;
          achievement_id: string;
          earned_at?: string;
        }
      >;
      focus_sessions: Table<{
        id: string;
        user_id: string;
        started_at: string;
        ended_at: string;
        duration_seconds: number;
        session_type: string;
        created_at: string;
      }>;
      study_goals: Table<{
        id: string;
        user_id: string;
        title: string;
        target_value: number;
        current_value: number;
        unit: string;
        due_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      study_tasks: Table<{
        id: string;
        user_id: string;
        title: string;
        scheduled_at: string | null;
        duration_minutes: number | null;
        category: string;
        completed_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      user_settings: Table<{
        user_id: string;
        language: string;
        theme: string;
        focus_mode: string;
        reminders: Json;
        notifications_enabled: boolean;
        study_reminders: boolean;
        goal_reminders: boolean;
        task_reminders: boolean;
        ai_context_enabled: boolean;
        focus_minutes: number;
        updated_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
