export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      application_outcomes: {
        Row: {
          id: string
          user_id: string
          application_id: string
          outcome: string
          ats_score_at_apply: number | null
          interview_invited: boolean
          offer_received: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          application_id: string
          outcome?: string
          ats_score_at_apply?: number | null
          interview_invited?: boolean
          offer_received?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          application_id?: string
          outcome?: string
          ats_score_at_apply?: number | null
          interview_invited?: boolean
          offer_received?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          acceptance_score: number | null
          company: string
          created_at: string
          generated_proposal: string | null
          id: string
          job_description: string | null
          job_title: string
          job_url: string | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acceptance_score?: number | null
          company?: string
          created_at?: string
          generated_proposal?: string | null
          id?: string
          job_description?: string | null
          job_title: string
          job_url?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acceptance_score?: number | null
          company?: string
          created_at?: string
          generated_proposal?: string | null
          id?: string
          job_description?: string | null
          job_title?: string
          job_url?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      apply_queue: {
        Row: {
          acceptance_probability: number
          batch_id: string | null
          budget: string | null
          client_quality_score: number | null
          company: string
          competition_level: string
          created_at: string
          generated_proposal: string
          id: string
          job_description: string
          job_title: string
          job_url: string | null
          match_reasoning: Json | null
          match_score: number
          platform: string
          rejection_reason: string | null
          scanned_at: string
          skills_matched: string[] | null
          status: string
          updated_at: string
          urgency: string
          user_id: string
          user_notes: string | null
        }
        Insert: {
          acceptance_probability?: number
          batch_id?: string | null
          budget?: string | null
          client_quality_score?: number | null
          company?: string
          competition_level?: string
          created_at?: string
          generated_proposal?: string
          id?: string
          job_description?: string
          job_title: string
          job_url?: string | null
          match_reasoning?: Json | null
          match_score?: number
          platform?: string
          rejection_reason?: string | null
          scanned_at?: string
          skills_matched?: string[] | null
          status?: string
          updated_at?: string
          urgency?: string
          user_id: string
          user_notes?: string | null
        }
        Update: {
          acceptance_probability?: number
          batch_id?: string | null
          budget?: string | null
          client_quality_score?: number | null
          company?: string
          competition_level?: string
          created_at?: string
          generated_proposal?: string
          id?: string
          job_description?: string
          job_title?: string
          job_url?: string | null
          match_reasoning?: Json | null
          match_score?: number
          platform?: string
          rejection_reason?: string | null
          scanned_at?: string
          skills_matched?: string[] | null
          status?: string
          updated_at?: string
          urgency?: string
          user_id?: string
          user_notes?: string | null
        }
        Relationships: []
      }
      credit_packages: {
        Row: {
          checkout_url: string | null
          created_at: string
          credits: number
          id: string
          is_active: boolean
          name: string
          package_key: string
          price_usd: number
          updated_at: string
        }
        Insert: {
          checkout_url?: string | null
          created_at?: string
          credits: number
          id?: string
          is_active?: boolean
          name: string
          package_key: string
          price_usd: number
          updated_at?: string
        }
        Update: {
          checkout_url?: string | null
          created_at?: string
          credits?: number
          id?: string
          is_active?: boolean
          name?: string
          package_key?: string
          price_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          gdpr_consent: boolean
          id: string
          source: string
          sync_error: string | null
          sync_failed: boolean | null
          synced_at: string | null
          tag: string
        }
        Insert: {
          created_at?: string
          email: string
          gdpr_consent?: boolean
          id?: string
          source?: string
          sync_error?: string | null
          sync_failed?: boolean | null
          synced_at?: string | null
          tag?: string
        }
        Update: {
          created_at?: string
          email?: string
          gdpr_consent?: boolean
          id?: string
          source?: string
          sync_error?: string | null
          sync_failed?: boolean | null
          synced_at?: string | null
          tag?: string
        }
        Relationships: []
      }
      outcome_tracking: {
        Row: {
          application_id: string | null
          client_replied: boolean | null
          created_at: string
          id: string
          job_category: string | null
          job_platform: string | null
          lessons_learned: string | null
          match_score_at_apply: number | null
          outcome: string | null
          proposal_style_tags: string[] | null
          queue_item_id: string | null
          updated_at: string
          user_id: string
          was_viewed: boolean | null
        }
        Insert: {
          application_id?: string | null
          client_replied?: boolean | null
          created_at?: string
          id?: string
          job_category?: string | null
          job_platform?: string | null
          lessons_learned?: string | null
          match_score_at_apply?: number | null
          outcome?: string | null
          proposal_style_tags?: string[] | null
          queue_item_id?: string | null
          updated_at?: string
          user_id: string
          was_viewed?: boolean | null
        }
        Update: {
          application_id?: string | null
          client_replied?: boolean | null
          created_at?: string
          id?: string
          job_category?: string | null
          job_platform?: string | null
          lessons_learned?: string | null
          match_score_at_apply?: number | null
          outcome?: string | null
          proposal_style_tags?: string[] | null
          queue_item_id?: string | null
          updated_at?: string
          user_id?: string
          was_viewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "outcome_tracking_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_tracking_queue_item_id_fkey"
            columns: ["queue_item_id"]
            isOneToOne: false
            referencedRelation: "apply_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_upgrades: {
        Row: {
          created_at: string
          email: string
          id: string
          payment_data: Json | null
          plan: string
          processed: boolean | null
          processed_at: string | null
          sale_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          payment_data?: Json | null
          plan: string
          processed?: boolean | null
          processed_at?: string | null
          sale_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          payment_data?: Json | null
          plan?: string
          processed?: boolean | null
          processed_at?: string | null
          sale_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          billing_period: string | null
          bio: string | null
          bonus_credits: number
          career_roadmap: Json | null
          created_at: string
          credits_balance: number
          daily_proposals_used: number
          experience: string | null
          free_credits_granted: boolean
          full_name: string | null
          hourly_rate: number | null
          id: string
          last_usage_reset: string
          onboarding_completed: boolean | null
          onboarding_experience: string | null
          onboarding_goal: string | null
          onboarding_role: string | null
          onboarding_volume: string | null
          platform_type: string | null
          portfolio_projects: Json | null
          profession_cluster: string | null
          referral_code: string | null
          skills: string[] | null
          subscription_expires_at: string | null
          subscription_plan: string
          trial_claimed: boolean | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
          user_segment: string | null
          plan_type: string
          referred_by: string | null
          org_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          billing_period?: string | null
          bio?: string | null
          bonus_credits?: number
          career_roadmap?: Json | null
          created_at?: string
          credits_balance?: number
          daily_proposals_used?: number
          experience?: string | null
          free_credits_granted?: boolean
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          last_usage_reset?: string
          onboarding_completed?: boolean | null
          onboarding_experience?: string | null
          onboarding_goal?: string | null
          onboarding_role?: string | null
          onboarding_volume?: string | null
          platform_type?: string | null
          portfolio_projects?: Json | null
          profession_cluster?: string | null
          referral_code?: string | null
          skills?: string[] | null
          subscription_expires_at?: string | null
          subscription_plan?: string
          trial_claimed?: boolean | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
          user_segment?: string | null
          plan_type?: string
          referred_by?: string | null
          org_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          billing_period?: string | null
          bio?: string | null
          bonus_credits?: number
          career_roadmap?: Json | null
          created_at?: string
          credits_balance?: number
          daily_proposals_used?: number
          experience?: string | null
          free_credits_granted?: boolean
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          last_usage_reset?: string
          onboarding_completed?: boolean | null
          onboarding_experience?: string | null
          onboarding_goal?: string | null
          onboarding_role?: string | null
          onboarding_volume?: string | null
          platform_type?: string | null
          portfolio_projects?: Json | null
          profession_cluster?: string | null
          referral_code?: string | null
          skills?: string[] | null
          subscription_expires_at?: string | null
          subscription_plan?: string
          trial_claimed?: boolean | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
          user_segment?: string | null
          plan_type?: string
          referred_by?: string | null
          org_id?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          created_at: string
          generated_proposal: string
          id: string
          job_description: string
          share_token: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_proposal: string
          id?: string
          job_description: string
          share_token?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          generated_proposal?: string
          id?: string
          job_description?: string
          share_token?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          credits_awarded: number
          id: string
          referred_subscribed: boolean
          referred_subscribed_at: string | null
          referred_user_id: string
          referrer_user_id: string
        }
        Insert: {
          created_at?: string
          credits_awarded?: number
          id?: string
          referred_subscribed?: boolean
          referred_subscribed_at?: string | null
          referred_user_id: string
          referrer_user_id: string
        }
        Update: {
          created_at?: string
          credits_awarded?: number
          id?: string
          referred_subscribed?: boolean
          referred_subscribed_at?: string | null
          referred_user_id?: string
          referrer_user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          avatar_url: string | null
          company: string | null
          content: string
          created_at: string
          id: string
          is_approved: boolean | null
          name: string
          rating: number
          role: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          name: string
          rating: number
          role?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          name?: string
          rating?: number
          role?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      trial_claims: {
        Row: {
          claimed_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          invited_at: string
          joined_at: string | null
          invited_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: string
          invited_at?: string
          joined_at?: string | null
          invited_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: string
          invited_at?: string
          joined_at?: string | null
          invited_by?: string | null
        }
        Relationships: []
      }
      job_postings: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string
          required_skills: Json
          nice_to_have_skills: Json
          seniority_level: string
          employment_type: string
          location: string | null
          salary_range: Json | null
          created_by: string
          is_active: boolean
          candidate_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description: string
          required_skills?: Json
          nice_to_have_skills?: Json
          seniority_level?: string
          employment_type?: string
          location?: string | null
          salary_range?: Json | null
          created_by: string
          is_active?: boolean
          candidate_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string
          required_skills?: Json
          nice_to_have_skills?: Json
          seniority_level?: string
          employment_type?: string
          location?: string | null
          salary_range?: Json | null
          created_by?: string
          is_active?: boolean
          candidate_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      candidate_evaluations: {
        Row: {
          id: string
          job_posting_id: string
          organization_id: string
          candidate_name: string
          candidate_email: string | null
          cv_storage_path: string | null
          cv_text_extracted: string | null
          match_score_percentage: number | null
          confidence_score: number | null
          statistical_metrics: Json | null
          ai_analysis: Json | null
          processing_status: string
          error_message: string | null
          evaluated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_posting_id: string
          organization_id: string
          candidate_name?: string
          candidate_email?: string | null
          cv_storage_path?: string | null
          cv_text_extracted?: string | null
          match_score_percentage?: number | null
          confidence_score?: number | null
          statistical_metrics?: Json | null
          ai_analysis?: Json | null
          processing_status?: string
          error_message?: string | null
          evaluated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_posting_id?: string
          organization_id?: string
          candidate_name?: string
          candidate_email?: string | null
          cv_storage_path?: string | null
          cv_text_extracted?: string | null
          match_score_percentage?: number | null
          confidence_score?: number | null
          statistical_metrics?: Json | null
          ai_analysis?: Json | null
          processing_status?: string
          error_message?: string | null
          evaluated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_credit_change: {
        Args: {
          _amount: number
          _description?: string
          _reference_id?: string
          _reference_type?: string
          _transaction_type: string
          _user_id: string
        }
        Returns: number
      }
      can_claim_trial: { Args: { _user_id: string }; Returns: boolean }
      get_trial_claims_count: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
