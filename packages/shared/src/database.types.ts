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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      availability: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          provider_profile_id: string
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          provider_profile_id: string
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          provider_profile_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "public_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_overrides: {
        Row: {
          date: string
          end_time: string | null
          id: string
          is_blocked: boolean
          provider_profile_id: string
          reason: string | null
          start_time: string | null
        }
        Insert: {
          date: string
          end_time?: string | null
          id?: string
          is_blocked?: boolean
          provider_profile_id: string
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          date?: string
          end_time?: string | null
          id?: string
          is_blocked?: boolean
          provider_profile_id?: string
          reason?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_overrides_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_overrides_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "public_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_id: string
          created_at: string
          end_time: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          notes: string | null
          provider_profile_id: string
          service_id: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id: string | null
          total_price_in_cents: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          end_time: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          notes?: string | null
          provider_profile_id: string
          service_id: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          total_price_in_cents: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          end_time?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          notes?: string | null
          provider_profile_id?: string
          service_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          total_price_in_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "public_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          access_token: string | null
          created_at: string
          external_id: string | null
          feed_url: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          provider: Database["public"]["Enums"]["calendar_provider"]
          refresh_token: string | null
          sync_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          external_id?: string | null
          feed_url?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          provider: Database["public"]["Enums"]["calendar_provider"]
          refresh_token?: string | null
          sync_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          external_id?: string | null
          feed_url?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          provider?: Database["public"]["Enums"]["calendar_provider"]
          refresh_token?: string | null
          sync_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_a_id: string
          participant_b_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_a_id: string
          participant_b_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_a_id?: string
          participant_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_a_id_fkey"
            columns: ["participant_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_b_id_fkey"
            columns: ["participant_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      external_events: {
        Row: {
          calendar_connection_id: string
          created_at: string
          end_time: string
          external_id: string
          id: string
          is_all_day: boolean
          start_time: string
          title: string | null
          updated_at: string
        }
        Insert: {
          calendar_connection_id: string
          created_at?: string
          end_time: string
          external_id: string
          id?: string
          is_all_day?: boolean
          start_time: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          calendar_connection_id?: string
          created_at?: string
          end_time?: string
          external_id?: string
          id?: string
          is_all_day?: boolean
          start_time?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_events_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_events_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          read_at: string | null
          sender_id: string
          text: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id: string
          text: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_in_cents: number
          booking_id: string
          created_at: string
          id: string
          platform_fee_in_cents: number
          provider_payout_in_cents: number
          refunded_amount_in_cents: number
          status: Database["public"]["Enums"]["payment_status"]
          stripe_event_id: string | null
          stripe_payment_intent_id: string
          updated_at: string
        }
        Insert: {
          amount_in_cents: number
          booking_id: string
          created_at?: string
          id?: string
          platform_fee_in_cents: number
          provider_payout_in_cents: number
          refunded_amount_in_cents?: number
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_event_id?: string | null
          stripe_payment_intent_id: string
          updated_at?: string
        }
        Update: {
          amount_in_cents?: number
          booking_id?: string
          created_at?: string
          id?: string
          platform_fee_in_cents?: number
          provider_payout_in_cents?: number
          refunded_amount_in_cents?: number
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_event_id?: string | null
          stripe_payment_intent_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          provider_profile_id: string
          service_id: string | null
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          provider_profile_id: string
          service_id?: string | null
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          provider_profile_id?: string
          service_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "public_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          category: Database["public"]["Enums"]["post_category"]
          comments_count: number
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          category?: Database["public"]["Enums"]["post_category"]
          comments_count?: number
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          category?: Database["public"]["Enums"]["post_category"]
          comments_count?: number
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          neighbourhood: string | null
          notification_newsletter: boolean
          notification_rebooking: boolean
          notification_reminders: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          street_address: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name: string
          id: string
          is_active?: boolean
          last_name: string
          neighbourhood?: string | null
          notification_newsletter?: boolean
          notification_rebooking?: boolean
          notification_reminders?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          street_address?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          neighbourhood?: string | null
          notification_newsletter?: boolean
          notification_rebooking?: boolean
          notification_reminders?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          street_address?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_profiles: {
        Row: {
          address: string | null
          average_rating: number
          bio: string | null
          business_name: string | null
          created_at: string
          id: string
          is_verified: boolean
          latitude: number | null
          longitude: number | null
          service_radius: number
          slug: string
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean
          total_reviews: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          average_rating?: number
          bio?: string | null
          business_name?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          service_radius?: number
          slug: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          total_reviews?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          average_rating?: number
          bio?: string | null
          business_name?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          service_radius?: number
          slug?: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          total_reviews?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount_in_cents: number
          created_at: string
          id: string
          initiated_by_user_id: string
          payment_id: string
          reason: string | null
          stripe_refund_id: string
        }
        Insert: {
          amount_in_cents: number
          created_at?: string
          id?: string
          initiated_by_user_id: string
          payment_id: string
          reason?: string | null
          stripe_refund_id: string
        }
        Update: {
          amount_in_cents?: number
          created_at?: string
          id?: string
          initiated_by_user_id?: string
          payment_id?: string
          reason?: string | null
          stripe_refund_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_initiated_by_user_id_fkey"
            columns: ["initiated_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          client_id: string
          created_at: string
          id: string
          photos: string[]
          provider_profile_id: string
          rating: number
          text: string | null
        }
        Insert: {
          booking_id: string
          client_id: string
          created_at?: string
          id?: string
          photos?: string[]
          provider_profile_id: string
          rating: number
          text?: string | null
        }
        Update: {
          booking_id?: string
          client_id?: string
          created_at?: string
          id?: string
          photos?: string[]
          provider_profile_id?: string
          rating?: number
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "public_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: Database["public"]["Enums"]["service_category"]
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price_in_cents: number
          provider_profile_id: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["service_category"]
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price_in_cents: number
          provider_profile_id: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price_in_cents?: number
          provider_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_provider_profile_id_fkey"
            columns: ["provider_profile_id"]
            isOneToOne: false
            referencedRelation: "public_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          referrer: string | null
          source: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      calendar_connections_safe: {
        Row: {
          created_at: string | null
          external_event_count: number | null
          external_id: string | null
          feed_url: string | null
          id: string | null
          is_active: boolean | null
          last_synced_at: string | null
          provider: Database["public"]["Enums"]["calendar_provider"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          external_event_count?: never
          external_id?: string | null
          feed_url?: string | null
          id?: string | null
          is_active?: boolean | null
          last_synced_at?: string | null
          provider?: Database["public"]["Enums"]["calendar_provider"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          external_event_count?: never
          external_id?: string | null
          feed_url?: string | null
          id?: string | null
          is_active?: boolean | null
          last_synced_at?: string | null
          provider?: Database["public"]["Enums"]["calendar_provider"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_provider_profiles: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          business_name: string | null
          first_name: string | null
          id: string | null
          is_verified: boolean | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          service_radius: number | null
          slug: string | null
          total_reviews: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_booking: {
        Args: {
          p_latitude?: number
          p_location?: string
          p_longitude?: number
          p_notes?: string
          p_service_id: string
          p_start_time: string
        }
        Returns: {
          client_id: string
          created_at: string
          end_time: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          notes: string | null
          provider_profile_id: string
          service_id: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id: string | null
          total_price_in_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_review: {
        Args: {
          p_booking_id: string
          p_photos?: string[]
          p_rating: number
          p_text?: string
        }
        Returns: {
          booking_id: string
          client_id: string
          created_at: string
          id: string
          photos: string[]
          provider_profile_id: string
          rating: number
          text: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_provider_busy_intervals: {
        Args: { p_from: string; p_provider_profile_id: string; p_to: string }
        Returns: {
          end_time: string
          start_time: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_public_provider: {
        Args: { p_provider_profile_id: string }
        Returns: boolean
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: number
      }
      my_provider_profile_id: { Args: never; Returns: string }
      replace_my_availability: { Args: { p_slots: Json }; Returns: undefined }
      search_providers: {
        Args: {
          p_category?: Database["public"]["Enums"]["service_category"]
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_offset?: number
          p_radius_km?: number
          p_text?: string
        }
        Returns: {
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          business_name: string | null
          first_name: string | null
          id: string | null
          is_verified: boolean | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          service_radius: number | null
          slug: string | null
          total_reviews: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "public_provider_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      send_message: {
        Args: { p_image_url?: string; p_recipient_id: string; p_text: string }
        Returns: {
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          read_at: string | null
          sender_id: string
          text: string
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      shares_booking_or_convo: { Args: { other: string }; Returns: boolean }
      update_booking_status: {
        Args: {
          p_booking_id: string
          p_new_status: Database["public"]["Enums"]["booking_status"]
        }
        Returns: {
          client_id: string
          created_at: string
          end_time: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          notes: string | null
          provider_profile_id: string
          service_id: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id: string | null
          total_price_in_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      booking_status:
        | "PENDING"
        | "CONFIRMED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELLED"
        | "NO_SHOW"
      calendar_provider: "GOOGLE" | "ICS_FEED"
      payment_status:
        | "PENDING"
        | "PROCESSING"
        | "SUCCEEDED"
        | "FAILED"
        | "REFUNDED"
      post_category:
        | "GENERAL"
        | "FOR_SALE"
        | "TIPS"
        | "COLLABORATION"
        | "RECOMMENDATION"
      service_category:
        | "HAIRCUT"
        | "FADE"
        | "BEARD"
        | "BRAIDS"
        | "LOCS"
        | "COLOR"
        | "NAILS"
        | "BROWS"
        | "LASHES"
        | "MAKEUP"
        | "FACIAL"
        | "WAXING"
        | "OTHER"
      user_role: "CLIENT" | "PROVIDER" | "ADMIN"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_status: [
        "PENDING",
        "CONFIRMED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
      ],
      calendar_provider: ["GOOGLE", "ICS_FEED"],
      payment_status: [
        "PENDING",
        "PROCESSING",
        "SUCCEEDED",
        "FAILED",
        "REFUNDED",
      ],
      post_category: [
        "GENERAL",
        "FOR_SALE",
        "TIPS",
        "COLLABORATION",
        "RECOMMENDATION",
      ],
      service_category: [
        "HAIRCUT",
        "FADE",
        "BEARD",
        "BRAIDS",
        "LOCS",
        "COLOR",
        "NAILS",
        "BROWS",
        "LASHES",
        "MAKEUP",
        "FACIAL",
        "WAXING",
        "OTHER",
      ],
      user_role: ["CLIENT", "PROVIDER", "ADMIN"],
    },
  },
} as const

