export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audio_tracks: {
        Row: {
          audio_quality: Json | null
          created_at: string
          error_message: string | null
          id: string
          original_filename: string
          selected_platform_preset:
            | Database["public"]["Enums"]["platform_preset"]
            | null
          status: Database["public"]["Enums"]["mastering_status"]
          storage_path_mastered: string | null
          storage_path_original: string
          storage_path_preview: string | null
          upload_timestamp: string
          user_id: string
        }
        Insert: {
          audio_quality?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          original_filename: string
          selected_platform_preset?:
            | Database["public"]["Enums"]["platform_preset"]
            | null
          status?: Database["public"]["Enums"]["mastering_status"]
          storage_path_mastered?: string | null
          storage_path_original: string
          storage_path_preview?: string | null
          upload_timestamp?: string
          user_id: string
        }
        Update: {
          audio_quality?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          original_filename?: string
          selected_platform_preset?:
            | Database["public"]["Enums"]["platform_preset"]
            | null
          status?: Database["public"]["Enums"]["mastering_status"]
          storage_path_mastered?: string | null
          storage_path_original?: string
          storage_path_preview?: string | null
          upload_timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          credits_purchased: number
          id: string
          metadata: Json | null
          payment_method: string
          payment_status: string
          transaction_date: string
          user_id: string
        }
        Insert: {
          amount: number
          credits_purchased: number
          id?: string
          metadata?: Json | null
          payment_method: string
          payment_status?: string
          transaction_date?: string
          user_id: string
        }
        Update: {
          amount?: number
          credits_purchased?: number
          id?: string
          metadata?: Json | null
          payment_method?: string
          payment_status?: string
          transaction_date?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          credits_remaining: number
          credits_reset_date: string
          id: string
          is_admin: boolean
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_remaining?: number
          credits_reset_date?: string
          id: string
          is_admin?: boolean
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_remaining?: number
          credits_reset_date?: string
          id?: string
          is_admin?: boolean
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      mastering_status:
        | "uploaded"
        | "processing"
        | "mastered"
        | "preview_ready"
        | "error"
      platform_preset: "Spotify" | "Apple Music" | "YouTube" | "SoundCloud"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      mastering_status: [
        "uploaded",
        "processing",
        "mastered",
        "preview_ready",
        "error",
      ],
      platform_preset: ["Spotify", "Apple Music", "YouTube", "SoundCloud"],
    },
  },
} as const
