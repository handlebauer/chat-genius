export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    graphql_public: {
        Tables: {
            [_ in never]: never
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            graphql: {
                Args: {
                    operationName?: string
                    query?: string
                    variables?: Json
                    extensions?: Json
                }
                Returns: Json
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
    public: {
        Tables: {
            active_channels: {
                Row: {
                    channel_id: string
                    created_at: string
                    id: string
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    channel_id: string
                    created_at?: string
                    id?: string
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    channel_id?: string
                    created_at?: string
                    id?: string
                    updated_at?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: 'active_channels_channel_id_fkey'
                        columns: ['channel_id']
                        isOneToOne: false
                        referencedRelation: 'channels'
                        referencedColumns: ['id']
                    },
                ]
            }
            attachments: {
                Row: {
                    content_type: string
                    created_at: string | null
                    file_name: string
                    file_size: number
                    file_type: string
                    id: string
                    message_id: string | null
                    storage_path: string
                    updated_at: string | null
                }
                Insert: {
                    content_type: string
                    created_at?: string | null
                    file_name: string
                    file_size: number
                    file_type: string
                    id?: string
                    message_id?: string | null
                    storage_path: string
                    updated_at?: string | null
                }
                Update: {
                    content_type?: string
                    created_at?: string | null
                    file_name?: string
                    file_size?: number
                    file_type?: string
                    id?: string
                    message_id?: string | null
                    storage_path?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: 'attachments_message_id_fkey'
                        columns: ['message_id']
                        isOneToOne: false
                        referencedRelation: 'messages'
                        referencedColumns: ['id']
                    },
                ]
            }
            channel_members: {
                Row: {
                    channel_id: string | null
                    created_at: string | null
                    id: string
                    joined_at: string | null
                    role: Database['public']['Enums']['channel_member_role']
                    updated_at: string | null
                    user_id: string | null
                }
                Insert: {
                    channel_id?: string | null
                    created_at?: string | null
                    id?: string
                    joined_at?: string | null
                    role?: Database['public']['Enums']['channel_member_role']
                    updated_at?: string | null
                    user_id?: string | null
                }
                Update: {
                    channel_id?: string | null
                    created_at?: string | null
                    id?: string
                    joined_at?: string | null
                    role?: Database['public']['Enums']['channel_member_role']
                    updated_at?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: 'channel_members_channel_id_fkey'
                        columns: ['channel_id']
                        isOneToOne: false
                        referencedRelation: 'channels'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'channel_members_user_id_fkey'
                        columns: ['user_id']
                        isOneToOne: false
                        referencedRelation: 'users'
                        referencedColumns: ['id']
                    },
                ]
            }
            channels: {
                Row: {
                    channel_type: Database['public']['Enums']['channel_type']
                    created_at: string | null
                    created_by: string | null
                    id: string
                    is_private: boolean | null
                    name: string
                    password_hash: string | null
                    updated_at: string | null
                }
                Insert: {
                    channel_type?: Database['public']['Enums']['channel_type']
                    created_at?: string | null
                    created_by?: string | null
                    id?: string
                    is_private?: boolean | null
                    name: string
                    password_hash?: string | null
                    updated_at?: string | null
                }
                Update: {
                    channel_type?: Database['public']['Enums']['channel_type']
                    created_at?: string | null
                    created_by?: string | null
                    id?: string
                    is_private?: boolean | null
                    name?: string
                    password_hash?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: 'channels_created_by_fkey'
                        columns: ['created_by']
                        isOneToOne: false
                        referencedRelation: 'users'
                        referencedColumns: ['id']
                    },
                ]
            }
            messages: {
                Row: {
                    channel_id: string | null
                    content: string
                    created_at: string | null
                    embedding_vector: string | null
                    id: string
                    search_vector: unknown | null
                    sender_id: string | null
                    thread_id: string | null
                    updated_at: string | null
                }
                Insert: {
                    channel_id?: string | null
                    content: string
                    created_at?: string | null
                    embedding_vector?: string | null
                    id?: string
                    search_vector?: unknown | null
                    sender_id?: string | null
                    thread_id?: string | null
                    updated_at?: string | null
                }
                Update: {
                    channel_id?: string | null
                    content?: string
                    created_at?: string | null
                    embedding_vector?: string | null
                    id?: string
                    search_vector?: unknown | null
                    sender_id?: string | null
                    thread_id?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: 'fk_thread'
                        columns: ['thread_id']
                        isOneToOne: false
                        referencedRelation: 'threads'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'messages_channel_id_fkey'
                        columns: ['channel_id']
                        isOneToOne: false
                        referencedRelation: 'channels'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'messages_sender_id_fkey'
                        columns: ['sender_id']
                        isOneToOne: false
                        referencedRelation: 'users'
                        referencedColumns: ['id']
                    },
                ]
            }
            reactions: {
                Row: {
                    created_at: string | null
                    emoji: string
                    id: string
                    message_id: string | null
                    user_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    emoji: string
                    id?: string
                    message_id?: string | null
                    user_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    emoji?: string
                    id?: string
                    message_id?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: 'reactions_message_id_fkey'
                        columns: ['message_id']
                        isOneToOne: false
                        referencedRelation: 'messages'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'reactions_user_id_fkey'
                        columns: ['user_id']
                        isOneToOne: false
                        referencedRelation: 'users'
                        referencedColumns: ['id']
                    },
                ]
            }
            threads: {
                Row: {
                    channel_id: string | null
                    created_at: string | null
                    id: string
                    parent_message_id: string | null
                }
                Insert: {
                    channel_id?: string | null
                    created_at?: string | null
                    id?: string
                    parent_message_id?: string | null
                }
                Update: {
                    channel_id?: string | null
                    created_at?: string | null
                    id?: string
                    parent_message_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: 'threads_channel_id_fkey'
                        columns: ['channel_id']
                        isOneToOne: false
                        referencedRelation: 'channels'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'threads_parent_message_id_fkey'
                        columns: ['parent_message_id']
                        isOneToOne: false
                        referencedRelation: 'messages'
                        referencedColumns: ['id']
                    },
                ]
            }
            unread_messages: {
                Row: {
                    channel_id: string
                    created_at: string
                    id: string
                    last_read_at: string
                    unread_count: number
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    channel_id: string
                    created_at?: string
                    id?: string
                    last_read_at?: string
                    unread_count?: number
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    channel_id?: string
                    created_at?: string
                    id?: string
                    last_read_at?: string
                    unread_count?: number
                    updated_at?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: 'unread_messages_channel_id_fkey'
                        columns: ['channel_id']
                        isOneToOne: false
                        referencedRelation: 'channels'
                        referencedColumns: ['id']
                    },
                ]
            }
            users: {
                Row: {
                    avatar_url: string | null
                    created_at: string | null
                    email: string
                    id: string
                    name: string | null
                    status: string | null
                    updated_at: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string | null
                    email: string
                    id?: string
                    name?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string | null
                    email?: string
                    id?: string
                    name?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            binary_quantize:
                | {
                      Args: {
                          '': string
                      }
                      Returns: unknown
                  }
                | {
                      Args: {
                          '': unknown
                      }
                      Returns: unknown
                  }
            crypt_password: {
                Args: {
                    password: string
                }
                Returns: string
            }
            gen_ulid: {
                Args: Record<PropertyKey, never>
                Returns: string
            }
            halfvec_avg: {
                Args: {
                    '': number[]
                }
                Returns: unknown
            }
            halfvec_out: {
                Args: {
                    '': unknown
                }
                Returns: unknown
            }
            halfvec_send: {
                Args: {
                    '': unknown
                }
                Returns: string
            }
            halfvec_typmod_in: {
                Args: {
                    '': unknown[]
                }
                Returns: number
            }
            hnsw_bit_support: {
                Args: {
                    '': unknown
                }
                Returns: unknown
            }
            hnsw_halfvec_support: {
                Args: {
                    '': unknown
                }
                Returns: unknown
            }
            hnsw_sparsevec_support: {
                Args: {
                    '': unknown
                }
                Returns: unknown
            }
            hnswhandler: {
                Args: {
                    '': unknown
                }
                Returns: unknown
            }
            is_channel_admin: {
                Args: {
                    channel_id: string
                    user_id: string
                }
                Returns: boolean
            }
            is_channel_member: {
                Args: {
                    channel_id: string
                    user_id: string
                }
                Returns: boolean
            }
            ivfflat_bit_support: {
                Args: {
                    '': unknown
                }
                Returns: unknown
            }
            ivfflat_halfvec_support: {
                Args: {
                    '': unknown
                }
                Returns: unknown
            }
            ivfflathandler: {
                Args: {
                    '': unknown
                }
                Returns: unknown
            }
            l2_norm:
                | {
                      Args: {
                          '': unknown
                      }
                      Returns: number
                  }
                | {
                      Args: {
                          '': unknown
                      }
                      Returns: number
                  }
            l2_normalize:
                | {
                      Args: {
                          '': string
                      }
                      Returns: string
                  }
                | {
                      Args: {
                          '': unknown
                      }
                      Returns: unknown
                  }
                | {
                      Args: {
                          '': unknown
                      }
                      Returns: unknown
                  }
            match_messages: {
                Args: {
                    query_embedding: string
                    match_threshold?: number
                    match_count?: number
                }
                Returns: {
                    id: string
                    content: string
                    channel_id: string
                    sender_id: string
                    created_at: string
                    similarity: number
                }[]
            }
            reset_unread_count: {
                Args: {
                    p_channel_id: string
                    p_user_id: string
                }
                Returns: undefined
            }
            set_active_channel: {
                Args: {
                    p_channel_id: string
                }
                Returns: undefined
            }
            sparsevec_out: {
                Args: {
                    '': unknown
                }
                Returns: unknown
            }
            sparsevec_send: {
                Args: {
                    '': unknown
                }
                Returns: string
            }
            sparsevec_typmod_in: {
                Args: {
                    '': unknown[]
                }
                Returns: number
            }
            vector_avg: {
                Args: {
                    '': number[]
                }
                Returns: string
            }
            vector_dims:
                | {
                      Args: {
                          '': string
                      }
                      Returns: number
                  }
                | {
                      Args: {
                          '': unknown
                      }
                      Returns: number
                  }
            vector_norm: {
                Args: {
                    '': string
                }
                Returns: number
            }
            vector_out: {
                Args: {
                    '': string
                }
                Returns: unknown
            }
            vector_send: {
                Args: {
                    '': string
                }
                Returns: string
            }
            vector_typmod_in: {
                Args: {
                    '': unknown[]
                }
                Returns: number
            }
            verify_channel_password: {
                Args: {
                    p_channel_id: string
                    p_password: string
                }
                Returns: boolean
            }
        }
        Enums: {
            channel_member_role: 'owner' | 'admin' | 'member'
            channel_type: 'channel' | 'direct_message'
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type PublicSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
    PublicTableNameOrOptions extends
        | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
        | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends {
        schema: keyof Database
    }
        ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
              Database[PublicTableNameOrOptions['schema']]['Views'])
        : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
          Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
          Row: infer R
      }
        ? R
        : never
    : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
            PublicSchema['Views'])
      ? (PublicSchema['Tables'] &
            PublicSchema['Views'])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
          ? R
          : never
      : never

export type TablesInsert<
    PublicTableNameOrOptions extends
        | keyof PublicSchema['Tables']
        | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends {
        schema: keyof Database
    }
        ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
        : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Insert: infer I
      }
        ? I
        : never
    : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
      ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
            Insert: infer I
        }
          ? I
          : never
      : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
        | keyof PublicSchema['Tables']
        | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends {
        schema: keyof Database
    }
        ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
        : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Update: infer U
      }
        ? U
        : never
    : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
      ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
            Update: infer U
        }
          ? U
          : never
      : never

export type Enums<
    PublicEnumNameOrOptions extends
        | keyof PublicSchema['Enums']
        | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
        ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
        : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
      ? PublicSchema['Enums'][PublicEnumNameOrOptions]
      : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof PublicSchema['CompositeTypes']
        | { schema: keyof Database },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof Database
    }
        ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
        : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
      ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
      : never
