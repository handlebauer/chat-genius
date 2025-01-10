export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      attachments: {
        Row: {
          id: string
          message_id: string
          file_name: string
          file_size: number
          file_type: string
          storage_path: string
          content_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          message_id: string
          file_name: string
          file_size: number
          file_type: string
          storage_path: string
          content_type: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          storage_path?: string
          content_type?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          name: string | null
          email: string
          avatar_url: string | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          email: string
          avatar_url?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string
          avatar_url?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      channels: {
        Row: {
          id: string
          name: string
          is_private: boolean
          channel_type: 'channel' | 'direct_message'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          is_private?: boolean
          channel_type?: 'channel' | 'direct_message'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_private?: boolean
          channel_type?: 'channel' | 'direct_message'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          channel_id: string
          thread_id: string | null
          content: string
          created_at: string
          updated_at: string
          sender_name: string | null
          search_vector: unknown
        }
        Insert: {
          id?: string
          sender_id: string
          channel_id: string
          thread_id?: string | null
          content: string
          created_at?: string
          updated_at?: string
          sender_name?: string | null
        }
        Update: {
          id?: string
          sender_id?: string
          channel_id?: string
          thread_id?: string | null
          content?: string
          created_at?: string
          updated_at?: string
          sender_name?: string | null
        }
      }
      threads: {
        Row: {
          id: string
          channel_id: string
          parent_message_id: string
          created_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          parent_message_id: string
          created_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          parent_message_id?: string
          created_at?: string
        }
      }
      reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
      }
    }
  }
}
