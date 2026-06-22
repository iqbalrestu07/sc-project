export interface CmsHero {
  id: string;
  tagline: string;
  description: string;
  cta_primary_text: string;
  cta_secondary_text: string;
  whatsapp_url: string;
  background_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsAbout {
  id: string;
  title: string;
  introduction: string;
  vision: string | null;
  mission: string | null;
  why_choose_us: string[] | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsServiceOverview {
  id: string;
  name: string;
  short_description: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsPromotion {
  id: string;
  title: string;
  description: string | null;
  banner_image_url: string | null;
  start_date: string;
  end_date: string;
  terms_conditions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsGallery {
  id: string;
  before_image_url: string;
  after_image_url: string;
  caption: string | null;
  category: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsTestimonial {
  id: string;
  patient_name: string;
  testimonial_text: string;
  rating: number | null;
  patient_photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsCta {
  id: string;
  headline: string;
  subtext: string;
  cta_primary_text: string;
  cta_secondary_text: string;
  whatsapp_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsContact {
  id: string;
  address: string | null;
  whatsapp_number: string;
  email: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  google_maps_embed: string | null;
  business_hours: Record<string, string> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
