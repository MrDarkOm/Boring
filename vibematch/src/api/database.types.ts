export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          avatar: string;
          context: {
            mood: string | null;
            people: string | null;
            time: string | null;
            genres: string[];
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      saved_items: {
        Row: {
          id: string;
          user_id: string;
          card_id: number;
          card_data: Record<string, unknown>;
          comment: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["saved_items"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["saved_items"]["Insert"]>;
      };
      swipe_history: {
        Row: {
          id: string;
          user_id: string;
          card_id: number;
          card_data: Record<string, unknown>;
          direction: "left" | "right" | "up";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["swipe_history"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["swipe_history"]["Insert"]>;
      };
      coop_sessions: {
        Row: {
          id: string;
          code: string;
          host_id: string;
          guest_id: string | null;
          status: "waiting" | "active" | "done";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["coop_sessions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["coop_sessions"]["Insert"]>;
      };
      coop_swipes: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          card_id: number;
          direction: "left" | "right" | "up";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["coop_swipes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["coop_swipes"]["Insert"]>;
      };
    };
  };
}
