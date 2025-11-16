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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "admin_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_conversations: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          order_id: string | null
          priority: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          priority?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_conversations_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_messages: {
        Row: {
          attachments: string[] | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_internal: boolean
          is_read: boolean
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_internal?: boolean
          is_read?: boolean
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          is_read?: boolean
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "admin_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name_ar: string
          name_en: string
          parent_id: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name_ar: string
          name_en: string
          parent_id?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string
          name_en?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          address_line: string | null
          apartment_number: string | null
          building_number: string | null
          city: string | null
          completed_at: string | null
          confirmation_pin: string | null
          contractor_confirmed: boolean | null
          contractor_confirmed_at: string | null
          coordinates: Json | null
          created_at: string | null
          delivery_id: string
          delivery_pin: string | null
          delivery_started_at: string | null
          driver_id: string | null
          driver_name: string | null
          driver_phone: string | null
          floor_number: string | null
          neighborhood: string | null
          notes: string | null
          order_id: string
          phone: string | null
          photo_uploaded_at: string | null
          photo_url: string | null
          pin_attempts: number | null
          pin_verified: boolean | null
          pin_verified_at: string | null
          proof_photo_url: string | null
          recipient_name: string | null
          recipient_phone: string | null
          scheduled_date: string | null
          scheduled_time_slot: string | null
          started_at: string | null
          supplier_confirmed: boolean | null
          supplier_confirmed_at: string | null
          updated_at: string | null
          vehicle_plate_number: string | null
        }
        Insert: {
          address_line?: string | null
          apartment_number?: string | null
          building_number?: string | null
          city?: string | null
          completed_at?: string | null
          confirmation_pin?: string | null
          contractor_confirmed?: boolean | null
          contractor_confirmed_at?: string | null
          coordinates?: Json | null
          created_at?: string | null
          delivery_id?: string
          delivery_pin?: string | null
          delivery_started_at?: string | null
          driver_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          floor_number?: string | null
          neighborhood?: string | null
          notes?: string | null
          order_id: string
          phone?: string | null
          photo_uploaded_at?: string | null
          photo_url?: string | null
          pin_attempts?: number | null
          pin_verified?: boolean | null
          pin_verified_at?: string | null
          proof_photo_url?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          scheduled_date?: string | null
          scheduled_time_slot?: string | null
          started_at?: string | null
          supplier_confirmed?: boolean | null
          supplier_confirmed_at?: string | null
          updated_at?: string | null
          vehicle_plate_number?: string | null
        }
        Update: {
          address_line?: string | null
          apartment_number?: string | null
          building_number?: string | null
          city?: string | null
          completed_at?: string | null
          confirmation_pin?: string | null
          contractor_confirmed?: boolean | null
          contractor_confirmed_at?: string | null
          coordinates?: Json | null
          created_at?: string | null
          delivery_id?: string
          delivery_pin?: string | null
          delivery_started_at?: string | null
          driver_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          floor_number?: string | null
          neighborhood?: string | null
          notes?: string | null
          order_id?: string
          phone?: string | null
          photo_uploaded_at?: string | null
          photo_url?: string | null
          pin_attempts?: number | null
          pin_verified?: boolean | null
          pin_verified_at?: string | null
          proof_photo_url?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          scheduled_date?: string | null
          scheduled_time_slot?: string | null
          started_at?: string | null
          supplier_confirmed?: boolean | null
          supplier_confirmed_at?: string | null
          updated_at?: string | null
          vehicle_plate_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          opened_by: string
          order_id: string
          qc_action: string | null
          qc_notes: string | null
          reason: string
          resolution: string | null
          resolved_at: string | null
          site_visit_completed: boolean | null
          site_visit_required: boolean | null
          status: Database["public"]["Enums"]["dispute_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          opened_by: string
          order_id: string
          qc_action?: string | null
          qc_notes?: string | null
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          site_visit_completed?: boolean | null
          site_visit_required?: boolean | null
          status?: Database["public"]["Enums"]["dispute_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          opened_by?: string
          order_id?: string
          qc_action?: string | null
          qc_notes?: string | null
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          site_visit_completed?: boolean | null
          site_visit_required?: boolean | null
          status?: Database["public"]["Enums"]["dispute_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_ar: string
          body_en: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          subject_ar: string
          subject_en: string
          updated_at: string
          updated_by: string | null
          variables: Json
        }
        Insert: {
          body_ar: string
          body_en: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject_ar: string
          subject_en: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Update: {
          body_ar?: string
          body_en?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject_ar?: string
          subject_en?: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          activity_classification: string | null
          created_at: string
          description: string
          discount_jod: number | null
          general_tax_amount_jod: number | null
          general_tax_rate: number | null
          id: string
          invoice_id: string
          item_type: Database["public"]["Enums"]["invoice_item_type"]
          line_total_jod: number
          product_id: string | null
          quantity: number
          special_tax_value_jod: number | null
          subtotal_jod: number
          unit_price_jod: number
        }
        Insert: {
          activity_classification?: string | null
          created_at?: string
          description: string
          discount_jod?: number | null
          general_tax_amount_jod?: number | null
          general_tax_rate?: number | null
          id?: string
          invoice_id: string
          item_type: Database["public"]["Enums"]["invoice_item_type"]
          line_total_jod: number
          product_id?: string | null
          quantity: number
          special_tax_value_jod?: number | null
          subtotal_jod: number
          unit_price_jod: number
        }
        Update: {
          activity_classification?: string | null
          created_at?: string
          description?: string
          discount_jod?: number | null
          general_tax_amount_jod?: number | null
          general_tax_rate?: number | null
          id?: string
          invoice_id?: string
          item_type?: Database["public"]["Enums"]["invoice_item_type"]
          line_total_jod?: number
          product_id?: string | null
          quantity?: number
          special_tax_value_jod?: number | null
          subtotal_jod?: number
          unit_price_jod?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          buyer_city: string | null
          buyer_id_number: string | null
          buyer_id_type: Database["public"]["Enums"]["buyer_id_type"] | null
          buyer_name: string
          buyer_phone: string | null
          buyer_postal_code: string | null
          contractor_id: string
          created_at: string
          created_by: string
          currency: string
          discount_total_jod: number
          electronic_invoice_number: string | null
          general_tax_total_jod: number
          grand_total_jod: number
          id: string
          invoice_category: Database["public"]["Enums"]["invoice_category"]
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["invoice_type"]
          is_return: boolean
          issue_date: string
          notes: string | null
          order_id: string
          original_invoice_id: string | null
          pdf_url: string | null
          return_reason: string | null
          seller_address: string | null
          seller_city: string | null
          seller_name: string
          seller_name_en: string | null
          seller_phone: string | null
          seller_tax_number: string
          special_tax_total_jod: number
          status: Database["public"]["Enums"]["invoice_status"]
          submission_error: string | null
          submission_status:
            | Database["public"]["Enums"]["submission_status"]
            | null
          submitted_at: string | null
          subtotal_jod: number
          supplier_id: string
          updated_at: string
        }
        Insert: {
          buyer_city?: string | null
          buyer_id_number?: string | null
          buyer_id_type?: Database["public"]["Enums"]["buyer_id_type"] | null
          buyer_name: string
          buyer_phone?: string | null
          buyer_postal_code?: string | null
          contractor_id: string
          created_at?: string
          created_by: string
          currency?: string
          discount_total_jod?: number
          electronic_invoice_number?: string | null
          general_tax_total_jod?: number
          grand_total_jod: number
          id?: string
          invoice_category?: Database["public"]["Enums"]["invoice_category"]
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["invoice_type"]
          is_return?: boolean
          issue_date?: string
          notes?: string | null
          order_id: string
          original_invoice_id?: string | null
          pdf_url?: string | null
          return_reason?: string | null
          seller_address?: string | null
          seller_city?: string | null
          seller_name: string
          seller_name_en?: string | null
          seller_phone?: string | null
          seller_tax_number: string
          special_tax_total_jod?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          submission_error?: string | null
          submission_status?:
            | Database["public"]["Enums"]["submission_status"]
            | null
          submitted_at?: string | null
          subtotal_jod: number
          supplier_id: string
          updated_at?: string
        }
        Update: {
          buyer_city?: string | null
          buyer_id_number?: string | null
          buyer_id_type?: Database["public"]["Enums"]["buyer_id_type"] | null
          buyer_name?: string
          buyer_phone?: string | null
          buyer_postal_code?: string | null
          contractor_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          discount_total_jod?: number
          electronic_invoice_number?: string | null
          general_tax_total_jod?: number
          grand_total_jod?: number
          id?: string
          invoice_category?: Database["public"]["Enums"]["invoice_category"]
          invoice_number?: string
          invoice_type?: Database["public"]["Enums"]["invoice_type"]
          is_return?: boolean
          issue_date?: string
          notes?: string | null
          order_id?: string
          original_invoice_id?: string | null
          pdf_url?: string | null
          return_reason?: string | null
          seller_address?: string | null
          seller_city?: string | null
          seller_name?: string
          seller_name_en?: string | null
          seller_phone?: string | null
          seller_tax_number?: string
          special_tax_total_jod?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          submission_error?: string | null
          submission_status?:
            | Database["public"]["Enums"]["submission_status"]
            | null
          submitted_at?: string | null
          subtotal_jod?: number
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          order_id: string
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          order_id: string
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          order_id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      notification_preferences: {
        Row: {
          app_low_stock: boolean | null
          app_messages: boolean | null
          app_new_order: boolean | null
          app_status_updates: boolean | null
          email_daily_summary: boolean | null
          email_low_stock: boolean | null
          email_messages: boolean | null
          email_new_order: boolean | null
          email_status_updates: boolean | null
          email_weekly_report: boolean | null
          id: string
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_low_stock?: boolean | null
          app_messages?: boolean | null
          app_new_order?: boolean | null
          app_status_updates?: boolean | null
          email_daily_summary?: boolean | null
          email_low_stock?: boolean | null
          email_messages?: boolean | null
          email_new_order?: boolean | null
          email_status_updates?: boolean | null
          email_weekly_report?: boolean | null
          id?: string
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_low_stock?: boolean | null
          app_messages?: boolean | null
          app_new_order?: boolean | null
          app_status_updates?: boolean | null
          email_daily_summary?: boolean | null
          email_low_stock?: boolean | null
          email_messages?: boolean | null
          email_new_order?: boolean | null
          email_status_updates?: boolean | null
          email_weekly_report?: boolean | null
          id?: string
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          metadata: Json | null
          order_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          metadata?: Json | null
          order_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activities_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          item_id: string
          order_id: string
          product_id: string
          product_name: string | null
          quantity: number
          total_jod: number | null
          total_price: number
          unit: string | null
          unit_price: number
          unit_price_jod: number | null
          volume_m3: number | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          item_id?: string
          order_id: string
          product_id: string
          product_name?: string | null
          quantity: number
          total_jod?: number | null
          total_price: number
          unit?: string | null
          unit_price: number
          unit_price_jod?: number | null
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          item_id?: string
          order_id?: string
          product_id?: string
          product_name?: string | null
          quantity?: number
          total_jod?: number | null
          total_price?: number
          unit?: string | null
          unit_price?: number
          unit_price_jod?: number | null
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_internal: boolean | null
          note: string
          order_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_internal?: boolean | null
          note: string
          order_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_internal?: boolean | null
          note?: string
          order_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tag_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          order_id: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          order_id: string
          tag_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          order_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tag_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "order_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tags: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_tags_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          contractor_id: string
          created_at: string | null
          delivery_address: string
          delivery_apartment: string | null
          delivery_building: string | null
          delivery_city: string | null
          delivery_coordinates: Json | null
          delivery_date: string | null
          delivery_fee_jod: number
          delivery_floor: string | null
          delivery_instructions: string | null
          delivery_latitude: number
          delivery_longitude: number
          delivery_neighborhood: string | null
          delivery_notes: string | null
          delivery_phone: string | null
          delivery_time_slot: string | null
          delivery_zone: Database["public"]["Enums"]["delivery_zone"] | null
          dispute_reason: string | null
          disputed_at: string | null
          id: string
          internal_reference: string | null
          notes: string | null
          order_number: string
          project_id: string | null
          rejection_reason: string | null
          scheduled_delivery_date: string
          scheduled_delivery_time: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal_jod: number
          supplier_id: string
          total_jod: number
          updated_at: string | null
          vehicle_class_id: string | null
          vehicle_type: string | null
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          delivery_address: string
          delivery_apartment?: string | null
          delivery_building?: string | null
          delivery_city?: string | null
          delivery_coordinates?: Json | null
          delivery_date?: string | null
          delivery_fee_jod: number
          delivery_floor?: string | null
          delivery_instructions?: string | null
          delivery_latitude: number
          delivery_longitude: number
          delivery_neighborhood?: string | null
          delivery_notes?: string | null
          delivery_phone?: string | null
          delivery_time_slot?: string | null
          delivery_zone?: Database["public"]["Enums"]["delivery_zone"] | null
          dispute_reason?: string | null
          disputed_at?: string | null
          id?: string
          internal_reference?: string | null
          notes?: string | null
          order_number: string
          project_id?: string | null
          rejection_reason?: string | null
          scheduled_delivery_date: string
          scheduled_delivery_time?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal_jod: number
          supplier_id: string
          total_jod: number
          updated_at?: string | null
          vehicle_class_id?: string | null
          vehicle_type?: string | null
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          delivery_address?: string
          delivery_apartment?: string | null
          delivery_building?: string | null
          delivery_city?: string | null
          delivery_coordinates?: Json | null
          delivery_date?: string | null
          delivery_fee_jod?: number
          delivery_floor?: string | null
          delivery_instructions?: string | null
          delivery_latitude?: number
          delivery_longitude?: number
          delivery_neighborhood?: string | null
          delivery_notes?: string | null
          delivery_phone?: string | null
          delivery_time_slot?: string | null
          delivery_zone?: Database["public"]["Enums"]["delivery_zone"] | null
          dispute_reason?: string | null
          disputed_at?: string | null
          id?: string
          internal_reference?: string | null
          notes?: string | null
          order_number?: string
          project_id?: string | null
          rejection_reason?: string | null
          scheduled_delivery_date?: string
          scheduled_delivery_time?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal_jod?: number
          supplier_id?: string
          total_jod?: number
          updated_at?: string | null
          vehicle_class_id?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vehicle_class_id_fkey"
            columns: ["vehicle_class_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string | null
          event_data: Json
          event_type: string
          id: string
          payment_id: string
        }
        Insert: {
          created_at?: string | null
          event_data: Json
          event_type: string
          id?: string
          payment_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_jod: number
          created_at: string | null
          held_at: string | null
          id: string
          metadata: Json | null
          order_id: string
          payment_intent_id: string | null
          payment_method: string | null
          refunded_at: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount_jod: number
          created_at?: string | null
          held_at?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          payment_intent_id?: string | null
          payment_method?: string | null
          refunded_at?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount_jod?: number
          created_at?: string | null
          held_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          payment_intent_id?: string | null
          payment_method?: string | null
          refunded_at?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          id: string
          is_available: boolean | null
          length_m_per_unit: number | null
          min_order_quantity: number | null
          name_ar: string
          name_en: string
          price_per_unit: number
          requires_open_bed: boolean | null
          sku: string
          stock_quantity: number | null
          supplier_id: string
          unit_ar: string
          unit_en: string
          updated_at: string | null
          volume_m3_per_unit: number | null
          weight_kg_per_unit: number | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_available?: boolean | null
          length_m_per_unit?: number | null
          min_order_quantity?: number | null
          name_ar: string
          name_en: string
          price_per_unit: number
          requires_open_bed?: boolean | null
          sku: string
          stock_quantity?: number | null
          supplier_id: string
          unit_ar: string
          unit_en: string
          updated_at?: string | null
          volume_m3_per_unit?: number | null
          weight_kg_per_unit?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_available?: boolean | null
          length_m_per_unit?: number | null
          min_order_quantity?: number | null
          name_ar?: string
          name_en?: string
          price_per_unit?: number
          requires_open_bed?: boolean | null
          sku?: string
          stock_quantity?: number | null
          supplier_id?: string
          unit_ar?: string
          unit_en?: string
          updated_at?: string | null
          volume_m3_per_unit?: number | null
          weight_kg_per_unit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          email_verified: boolean | null
          email_verified_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          preferred_language: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          email_verified_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          email_verified_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          address: string | null
          budget_estimate: number | null
          contractor_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          budget_estimate?: number | null
          contractor_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          budget_estimate?: number | null
          contractor_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          contractor_id: string
          created_at: string | null
          id: string
          order_id: string
          rating: number | null
          supplier_id: string
        }
        Insert: {
          comment?: string | null
          contractor_id: string
          created_at?: string | null
          id?: string
          order_id: string
          rating?: number | null
          supplier_id: string
        }
        Update: {
          comment?: string | null
          contractor_id?: string
          created_at?: string | null
          id?: string
          order_id?: string
          rating?: number | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      supplier_registrations: {
        Row: {
          building: string | null
          business_name: string
          business_name_en: string | null
          city: string
          created_at: string
          district: string
          email: string | null
          id: string
          license_number: string
          phone: string
          street: string
          tax_number: string | null
          user_id: string
          zone_a_radius: number
          zone_b_radius: number
        }
        Insert: {
          building?: string | null
          business_name: string
          business_name_en?: string | null
          city: string
          created_at?: string
          district: string
          email?: string | null
          id?: string
          license_number: string
          phone: string
          street: string
          tax_number?: string | null
          user_id: string
          zone_a_radius?: number
          zone_b_radius?: number
        }
        Update: {
          building?: string | null
          business_name?: string
          business_name_en?: string | null
          city?: string
          created_at?: string
          district?: string
          email?: string | null
          id?: string
          license_number?: string
          phone?: string
          street?: string
          tax_number?: string | null
          user_id?: string
          zone_a_radius?: number
          zone_b_radius?: number
        }
        Relationships: []
      }
      supplier_zone_fees: {
        Row: {
          base_fee_jod: number
          created_at: string | null
          id: string
          supplier_id: string
          updated_at: string | null
          zone: Database["public"]["Enums"]["delivery_zone"]
        }
        Insert: {
          base_fee_jod: number
          created_at?: string | null
          id?: string
          supplier_id: string
          updated_at?: string | null
          zone: Database["public"]["Enums"]["delivery_zone"]
        }
        Update: {
          base_fee_jod?: number
          created_at?: string | null
          id?: string
          supplier_id?: string
          updated_at?: string | null
          zone?: Database["public"]["Enums"]["delivery_zone"]
        }
        Relationships: [
          {
            foreignKeyName: "supplier_zone_fees_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string
          building: string | null
          business_name: string
          business_name_en: string | null
          city: string | null
          created_at: string | null
          district: string | null
          email: string | null
          id: string
          is_verified: boolean | null
          latitude: number
          license_number: string | null
          location: unknown
          longitude: number
          owner_id: string
          phone: string
          portal_api_configured_at: string | null
          portal_api_enabled: boolean | null
          portal_api_key: string | null
          portal_username: string | null
          radius_km_zone_a: number | null
          radius_km_zone_b: number | null
          rating_average: number | null
          rating_count: number | null
          street: string | null
          tax_number: string | null
          tax_registration_name: string | null
          tax_registration_name_en: string | null
          updated_at: string | null
          verified_at: string | null
          wallet_available: number | null
          wallet_balance: number | null
          wallet_pending: number | null
        }
        Insert: {
          address: string
          building?: string | null
          business_name: string
          business_name_en?: string | null
          city?: string | null
          created_at?: string | null
          district?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          latitude: number
          license_number?: string | null
          location?: unknown
          longitude: number
          owner_id: string
          phone: string
          portal_api_configured_at?: string | null
          portal_api_enabled?: boolean | null
          portal_api_key?: string | null
          portal_username?: string | null
          radius_km_zone_a?: number | null
          radius_km_zone_b?: number | null
          rating_average?: number | null
          rating_count?: number | null
          street?: string | null
          tax_number?: string | null
          tax_registration_name?: string | null
          tax_registration_name_en?: string | null
          updated_at?: string | null
          verified_at?: string | null
          wallet_available?: number | null
          wallet_balance?: number | null
          wallet_pending?: number | null
        }
        Update: {
          address?: string
          building?: string | null
          business_name?: string
          business_name_en?: string | null
          city?: string | null
          created_at?: string | null
          district?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          latitude?: number
          license_number?: string | null
          location?: unknown
          longitude?: number
          owner_id?: string
          phone?: string
          portal_api_configured_at?: string | null
          portal_api_enabled?: boolean | null
          portal_api_key?: string | null
          portal_username?: string | null
          radius_km_zone_a?: number | null
          radius_km_zone_b?: number | null
          rating_average?: number | null
          rating_count?: number | null
          street?: string | null
          tax_number?: string | null
          tax_registration_name?: string | null
          tax_registration_name_en?: string | null
          updated_at?: string | null
          verified_at?: string | null
          wallet_available?: number | null
          wallet_balance?: number | null
          wallet_pending?: number | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          class_code: string
          created_at: string | null
          display_order: number | null
          has_open_bed: boolean | null
          id: string
          is_active: boolean | null
          max_length_m: number
          max_volume_m3: number
          max_weight_kg: number
          name_ar: string
          name_en: string
          updated_at: string | null
        }
        Insert: {
          class_code: string
          created_at?: string | null
          display_order?: number | null
          has_open_bed?: boolean | null
          id?: string
          is_active?: boolean | null
          max_length_m: number
          max_volume_m3: number
          max_weight_kg: number
          name_ar: string
          name_en: string
          updated_at?: string | null
        }
        Update: {
          class_code?: string
          created_at?: string | null
          display_order?: number | null
          has_open_bed?: boolean | null
          id?: string
          is_active?: boolean | null
          max_length_m?: number
          max_volume_m3?: number
          max_weight_kg?: number
          name_ar?: string
          name_en?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_activity_feed: {
        Row: {
          created_at: string | null
          event_time: string | null
          event_type: string | null
          metadata: Json | null
          reference_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
      customer_order_stats: {
        Row: {
          average_order_value: number | null
          contractor_id: string | null
          first_order_date: string | null
          last_order_date: string | null
          supplier_id: string | null
          total_orders: number | null
          total_spent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_confirmation_status: {
        Row: {
          completed_at: string | null
          confirmation_status: string | null
          contractor_confirmed: boolean | null
          contractor_confirmed_at: string | null
          delivery_id: string | null
          delivery_started_at: string | null
          minutes_awaiting_contractor: number | null
          order_id: string | null
          order_number: string | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          supplier_confirmed: boolean | null
          supplier_confirmed_at: string | null
          total_jod: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      check_delivery_confirmation_status: {
        Args: { p_order_id: string }
        Returns: {
          can_contractor_update: boolean
          contractor_confirmed: boolean
          order_number: string
          order_status: Database["public"]["Enums"]["order_status"]
          payment_status: string
          supplier_confirmed: boolean
        }[]
      }
      check_site_visit_requirement: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      dropgeometrytable:
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      fn_calculate_delivery_fee: {
        Args: {
          p_delivery_lat: number
          p_delivery_lng: number
          p_supplier_id: string
        }
        Returns: {
          delivery_fee_jod: number
          distance_km: number
          zone: Database["public"]["Enums"]["delivery_zone"]
        }[]
      }
      fn_estimate_vehicle: {
        Args: {
          p_delivery_lat: number
          p_delivery_lng: number
          p_items_json: Json
          p_supplier_id: string
        }
        Returns: {
          capacity_headroom: Json
          delivery_fee_jod: number
          distance_km: number
          vehicle_class_id: string
          vehicle_name_ar: string
          vehicle_name_en: string
          zone: Database["public"]["Enums"]["delivery_zone"]
        }[]
      }
      fn_visible_suppliers: {
        Args: {
          p_category_id?: string
          p_delivery_lat: number
          p_delivery_lng: number
        }
        Returns: {
          business_name: string
          business_name_en: string
          distance_km: number
          min_delivery_fee: number
          products_count: number
          rating_average: number
          rating_count: number
          supplier_id: string
          zone: Database["public"]["Enums"]["delivery_zone"]
        }[]
      }
      generate_invoice_number: {
        Args: { p_supplier_id: string }
        Returns: string
      }
      generate_order_number: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_delivery_approval_method: {
        Args: { p_order_total: number }
        Returns: string
      }
      get_storage_url: {
        Args: { p_bucket: string; p_path: string }
        Returns: string
      }
      get_unread_messages_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      gettransactionid: { Args: never; Returns: unknown }
      is_supplier_admin: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mark_conversation_read: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      populate_geometry_columns:
        | { Args: { use_typmod?: boolean }; Returns: string }
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      profile_exists: { Args: { user_id: string }; Returns: boolean }
      send_phone_verification: { Args: { p_user_id: string }; Returns: Json }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_askml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geom: unknown }; Returns: number }
        | { Args: { geog: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_profile: {
        Args: {
          user_email?: string
          user_full_name?: string
          user_id: string
          user_language?: string
          user_phone?: string
          user_role?: string
        }
        Returns: {
          created_at: string
          email: string | null
          email_verified: boolean | null
          email_verified_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          preferred_language: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_phone_number: {
        Args: { p_user_id: string; p_verification_code: string }
        Returns: Json
      }
    }
    Enums: {
      buyer_id_type: "national_id" | "tax_number" | "personal_number"
      delivery_zone: "zone_a" | "zone_b"
      dispute_status: "opened" | "investigating" | "resolved" | "escalated"
      invoice_category: "local" | "export" | "development_zone"
      invoice_item_type: "product" | "service" | "service_allowance"
      invoice_status: "draft" | "issued" | "submitted_to_portal" | "cancelled"
      invoice_type: "income" | "sales_tax" | "special_tax"
      language: "ar" | "en"
      order_status:
        | "pending"
        | "confirmed"
        | "in_delivery"
        | "delivered"
        | "completed"
        | "cancelled"
        | "rejected"
        | "awaiting_contractor_confirmation"
        | "disputed"
      payment_status:
        | "pending"
        | "held"
        | "released"
        | "refunded"
        | "failed"
        | "frozen"
      preferred_language: "ar" | "en"
      submission_status: "pending" | "success" | "failed"
      user_role: "contractor" | "supplier_admin" | "driver" | "admin"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      buyer_id_type: ["national_id", "tax_number", "personal_number"],
      delivery_zone: ["zone_a", "zone_b"],
      dispute_status: ["opened", "investigating", "resolved", "escalated"],
      invoice_category: ["local", "export", "development_zone"],
      invoice_item_type: ["product", "service", "service_allowance"],
      invoice_status: ["draft", "issued", "submitted_to_portal", "cancelled"],
      invoice_type: ["income", "sales_tax", "special_tax"],
      language: ["ar", "en"],
      order_status: [
        "pending",
        "confirmed",
        "in_delivery",
        "delivered",
        "completed",
        "cancelled",
        "rejected",
        "awaiting_contractor_confirmation",
        "disputed",
      ],
      payment_status: [
        "pending",
        "held",
        "released",
        "refunded",
        "failed",
        "frozen",
      ],
      preferred_language: ["ar", "en"],
      submission_status: ["pending", "success", "failed"],
      user_role: ["contractor", "supplier_admin", "driver", "admin"],
    },
  },
} as const
