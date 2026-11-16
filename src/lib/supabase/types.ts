import type { CategoryId, NeedTag } from "@/lib/domain/categories";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          last_room_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          last_room_id?: string | null;
        };
        Update: {
          display_name?: string;
          last_room_id?: string | null;
        };
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
        };
        Insert: { name: string; owner_id: string };
        Update: { name?: string };
      };
      room_members: {
        Row: { room_id: string; user_id: string; joined_at: string };
        Insert: { room_id: string; user_id: string };
        Update: Record<string, never>;
      };
      invites: {
        Row: {
          id: string;
          room_id: string;
          token: string;
          expires_at: string;
          used_at: string | null;
          created_by: string;
        };
        Insert: {
          room_id: string;
          token: string;
          expires_at: string;
          created_by: string;
        };
        Update: { used_at?: string | null };
      };
      expenses: {
        Row: {
          id: string;
          room_id: string;
          created_by: string;
          amount_idr: number;
          spent_on: string;
          store: string | null;
          note: string | null;
          category: CategoryId;
          tag: NeedTag;
          receipt_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          room_id: string;
          created_by: string;
          amount_idr: number;
          spent_on: string;
          store?: string | null;
          note?: string | null;
          category: CategoryId;
          tag: NeedTag;
          receipt_path?: string | null;
        };
        Update: {
          amount_idr?: number;
          spent_on?: string;
          store?: string | null;
          note?: string | null;
          category?: CategoryId;
          tag?: NeedTag;
        };
      };
      savings_movements: {
        Row: {
          id: string;
          room_id: string;
          created_by: string;
          kind: "setor" | "tarik";
          amount_idr: number;
          moved_on: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          room_id: string;
          created_by: string;
          kind: "setor" | "tarik";
          amount_idr: number;
          moved_on: string;
          note?: string | null;
        };
        Update: {
          amount_idr?: number;
          moved_on?: string;
          note?: string | null;
        };
      };
      savings_targets: {
        Row: {
          room_id: string;
          amount_idr: number;
          deadline: string;
          created_at: string;
          updated_at: string;
        };
        Insert: { room_id: string; amount_idr: number; deadline: string };
        Update: { amount_idr?: number; deadline?: string; updated_at?: string };
      };
    };
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: string };
      create_room: { Args: { p_name: string }; Returns: string };
      kick_member: { Args: { p_room: string; p_user: string }; Returns: null };
      savings_balance: { Args: { p_room: string }; Returns: number };
    };
  };
};
