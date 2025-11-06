export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Export Profile type for easier use
export type Profile = Database['public']['Tables']['profiles']['Row']

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'contractor' | 'supplier_admin' | 'driver' | 'admin'
          phone: string | null
          email: string | null
          full_name: string
          preferred_language: string  // Changed to string to match DB TEXT type
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'contractor' | 'supplier_admin' | 'driver' | 'admin'
          phone?: string | null
          email?: string | null
          full_name: string
          preferred_language?: string  // Changed to string to match DB TEXT type
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'contractor' | 'supplier_admin' | 'driver' | 'admin'
          phone?: string | null
          email?: string | null
          full_name?: string
          preferred_language?: string  // Changed to string to match DB TEXT type
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          owner_id: string
          business_name: string
          business_name_en: string | null
          latitude: number
          longitude: number
          location: unknown
          radius_km_zone_a: number
          radius_km_zone_b: number
          base_delivery_fee_zone_a: number
          base_delivery_fee_zone_b: number
          is_verified: boolean
          wallet_balance: number
          rating_average: number
          rating_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          business_name: string
          business_name_en?: string | null
          latitude: number
          longitude: number
          location?: unknown
          radius_km_zone_a?: number
          radius_km_zone_b?: number
          base_delivery_fee_zone_a?: number
          base_delivery_fee_zone_b?: number
          is_verified?: boolean
          wallet_balance?: number
          rating_average?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          business_name?: string
          business_name_en?: string | null
          latitude?: number
          longitude?: number
          location?: unknown
          radius_km_zone_a?: number
          radius_km_zone_b?: number
          base_delivery_fee_zone_a?: number
          base_delivery_fee_zone_b?: number
          is_verified?: boolean
          wallet_balance?: number
          rating_average?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'contractor' | 'supplier_admin' | 'driver' | 'admin'
      language: 'ar' | 'en'
      order_status: 'draft' | 'pending_payment' | 'payment_held' | 'confirmed' | 'ready' | 'out_for_delivery' | 'delivered' | 'disputed' | 'cancelled' | 'refunded'
      payment_status: 'pending' | 'held' | 'released' | 'refunded' | 'failed'
      dispute_status: 'open' | 'under_review' | 'resolved' | 'escalated'
    }
  }
}