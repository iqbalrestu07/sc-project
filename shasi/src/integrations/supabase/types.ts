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
      appointments: {
        Row: {
          created_at: string | null
          created_by: string | null
          doctor_id: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          patient_id: string
          scheduled_at: string
          service_id: string
          status: string
          therapist_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          doctor_id?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          scheduled_at: string
          service_id: string
          status?: string
          therapist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          doctor_id?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          scheduled_at?: string
          service_id?: string
          status?: string
          therapist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          address: string | null
          appointment_reminders: boolean | null
          clinic_name: string | null
          created_at: string | null
          email: string | null
          email_reminder_enabled: boolean | null
          expiry_warnings: boolean | null
          id: string
          invoice_footer_text: string | null
          invoice_header_description: string | null
          invoice_header_title: string | null
          low_stock_alerts: boolean | null
          phone: string | null
          reminder_hours_before: number | null
          tax_inclusive: boolean | null
          tax_rate: number | null
          updated_at: string | null
          whatsapp_business_phone_id: string | null
          whatsapp_reminder_enabled: boolean | null
        }
        Insert: {
          address?: string | null
          appointment_reminders?: boolean | null
          clinic_name?: string | null
          created_at?: string | null
          email?: string | null
          email_reminder_enabled?: boolean | null
          expiry_warnings?: boolean | null
          id?: string
          invoice_footer_text?: string | null
          invoice_header_description?: string | null
          invoice_header_title?: string | null
          low_stock_alerts?: boolean | null
          phone?: string | null
          reminder_hours_before?: number | null
          tax_inclusive?: boolean | null
          tax_rate?: number | null
          updated_at?: string | null
          whatsapp_business_phone_id?: string | null
          whatsapp_reminder_enabled?: boolean | null
        }
        Update: {
          address?: string | null
          appointment_reminders?: boolean | null
          clinic_name?: string | null
          created_at?: string | null
          email?: string | null
          email_reminder_enabled?: boolean | null
          expiry_warnings?: boolean | null
          id?: string
          invoice_footer_text?: string | null
          invoice_header_description?: string | null
          invoice_header_title?: string | null
          low_stock_alerts?: boolean | null
          phone?: string | null
          reminder_hours_before?: number | null
          tax_inclusive?: boolean | null
          tax_rate?: number | null
          updated_at?: string | null
          whatsapp_business_phone_id?: string | null
          whatsapp_reminder_enabled?: boolean | null
        }
        Relationships: []
      }
      cms_about: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          introduction: string
          is_active: boolean | null
          mission: string | null
          title: string
          updated_at: string | null
          vision: string | null
          why_choose_us: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          introduction?: string
          is_active?: boolean | null
          mission?: string | null
          title?: string
          updated_at?: string | null
          vision?: string | null
          why_choose_us?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          introduction?: string
          is_active?: boolean | null
          mission?: string | null
          title?: string
          updated_at?: string | null
          vision?: string | null
          why_choose_us?: string[] | null
        }
        Relationships: []
      }
      cms_contact: {
        Row: {
          address: string | null
          business_hours: Json | null
          created_at: string | null
          email: string | null
          facebook_url: string | null
          google_maps_embed: string | null
          id: string
          instagram_url: string | null
          is_active: boolean | null
          tiktok_url: string | null
          updated_at: string | null
          whatsapp_number: string
        }
        Insert: {
          address?: string | null
          business_hours?: Json | null
          created_at?: string | null
          email?: string | null
          facebook_url?: string | null
          google_maps_embed?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          tiktok_url?: string | null
          updated_at?: string | null
          whatsapp_number?: string
        }
        Update: {
          address?: string | null
          business_hours?: Json | null
          created_at?: string | null
          email?: string | null
          facebook_url?: string | null
          google_maps_embed?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean | null
          tiktok_url?: string | null
          updated_at?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      cms_cta: {
        Row: {
          created_at: string | null
          cta_primary_text: string
          cta_secondary_text: string
          headline: string
          id: string
          is_active: boolean | null
          subtext: string
          updated_at: string | null
          whatsapp_url: string
        }
        Insert: {
          created_at?: string | null
          cta_primary_text?: string
          cta_secondary_text?: string
          headline?: string
          id?: string
          is_active?: boolean | null
          subtext?: string
          updated_at?: string | null
          whatsapp_url?: string
        }
        Update: {
          created_at?: string | null
          cta_primary_text?: string
          cta_secondary_text?: string
          headline?: string
          id?: string
          is_active?: boolean | null
          subtext?: string
          updated_at?: string | null
          whatsapp_url?: string
        }
        Relationships: []
      }
      cms_gallery: {
        Row: {
          after_image_url: string
          before_image_url: string
          caption: string | null
          category: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          after_image_url: string
          before_image_url: string
          caption?: string | null
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          after_image_url?: string
          before_image_url?: string
          caption?: string | null
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cms_hero: {
        Row: {
          background_image_url: string | null
          created_at: string | null
          cta_primary_text: string
          cta_secondary_text: string
          description: string
          id: string
          is_active: boolean | null
          tagline: string
          updated_at: string | null
          whatsapp_url: string
        }
        Insert: {
          background_image_url?: string | null
          created_at?: string | null
          cta_primary_text?: string
          cta_secondary_text?: string
          description?: string
          id?: string
          is_active?: boolean | null
          tagline?: string
          updated_at?: string | null
          whatsapp_url?: string
        }
        Update: {
          background_image_url?: string | null
          created_at?: string | null
          cta_primary_text?: string
          cta_secondary_text?: string
          description?: string
          id?: string
          is_active?: boolean | null
          tagline?: string
          updated_at?: string | null
          whatsapp_url?: string
        }
        Relationships: []
      }
      cms_promotions: {
        Row: {
          banner_image_url: string | null
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          start_date: string
          terms_conditions: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          banner_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          start_date: string
          terms_conditions?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          banner_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
          terms_conditions?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cms_services_overview: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          short_description: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          short_description: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          short_description?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cms_testimonials: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          patient_name: string
          patient_photo_url: string | null
          rating: number | null
          testimonial_text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          patient_name: string
          patient_photo_url?: string | null
          rating?: number | null
          testimonial_text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          patient_name?: string
          patient_photo_url?: string | null
          rating?: number | null
          testimonial_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          base_amount: number
          commission_amount: number
          commission_type: string
          commission_value: number
          created_at: string | null
          id: string
          staff_id: string
          staff_role: string
          status: string
          transaction_id: string
          transaction_item_id: string
        }
        Insert: {
          base_amount: number
          commission_amount: number
          commission_type: string
          commission_value: number
          created_at?: string | null
          id?: string
          staff_id: string
          staff_role: string
          status?: string
          transaction_id: string
          transaction_item_id: string
        }
        Update: {
          base_amount?: number
          commission_amount?: number
          commission_type?: string
          commission_value?: number
          created_at?: string | null
          id?: string
          staff_id?: string
          staff_role?: string
          status?: string
          transaction_id?: string
          transaction_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_transaction_item_id_fkey"
            columns: ["transaction_item_id"]
            isOneToOne: false
            referencedRelation: "transaction_items"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergy_history: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean | null
          medical_conditions: string | null
          notes: string | null
          patient_code: string
          phone: string | null
          photo_url: string | null
          reminder_opt_in: boolean | null
          skin_type: string | null
          tags: string[] | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          allergy_history?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          medical_conditions?: string | null
          notes?: string | null
          patient_code: string
          phone?: string | null
          photo_url?: string | null
          reminder_opt_in?: boolean | null
          skin_type?: string | null
          tags?: string[] | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          allergy_history?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          medical_conditions?: string | null
          notes?: string | null
          patient_code?: string
          phone?: string | null
          photo_url?: string | null
          reminder_opt_in?: boolean | null
          skin_type?: string | null
          tags?: string[] | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          current_stock: number | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          minimum_stock: number | null
          name: string
          purchase_price: number | null
          selling_price: number | null
          sku: string | null
          supplier: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          current_stock?: number | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          minimum_stock?: number | null
          name: string
          purchase_price?: number | null
          selling_price?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          current_stock?: number | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          minimum_stock?: number | null
          name?: string
          purchase_price?: number | null
          selling_price?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_consumables: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity_used: number
          service_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity_used?: number
          service_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity_used?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_consumables_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_consumables_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number
          category_id: string | null
          created_at: string | null
          description: string | null
          doctor_commission_type: string | null
          doctor_commission_value: number | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          requires_doctor: boolean | null
          therapist_commission_type: string | null
          therapist_commission_value: number | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          doctor_commission_type?: string | null
          doctor_commission_value?: number | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_doctor?: boolean | null
          therapist_commission_type?: string | null
          therapist_commission_value?: number | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          doctor_commission_type?: string | null
          doctor_commission_value?: number | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_doctor?: boolean | null
          therapist_commission_type?: string | null
          therapist_commission_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          role: string
          specialization: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role: string
          specialization?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: string
          specialization?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_items: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          doctor_id: string | null
          id: string
          item_type: string
          product_id: string | null
          quantity: number
          service_id: string | null
          therapist_id: string | null
          total_price: number
          transaction_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          doctor_id?: string | null
          id?: string
          item_type: string
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          therapist_id?: string | null
          total_price: number
          transaction_id: string
          unit_price: number
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          doctor_id?: string | null
          id?: string
          item_type?: string
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          therapist_id?: string | null
          total_price?: number
          transaction_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          discount_type: string | null
          id: string
          notes: string | null
          paid_at: string | null
          patient_id: string | null
          payment_method: string | null
          payment_status: string
          subtotal: number
          tax_amount: number | null
          total_amount: number
          transaction_code: string
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          patient_id?: string | null
          payment_method?: string | null
          payment_status?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          transaction_code: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          patient_id?: string | null
          payment_method?: string | null
          payment_status?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          transaction_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "doctor" | "therapist" | "cashier"
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
      app_role: ["admin", "doctor", "therapist", "cashier"],
    },
  },
} as const
