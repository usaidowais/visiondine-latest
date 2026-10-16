export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  RESTAURANT_OWNER = 'RESTAURANT_OWNER',
  PUBLIC_USER = 'PUBLIC_USER'
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string; // For the URL
  logo_url?: string;
  banner_url?: string;
  status: 'active' | 'onboarding' | 'suspended';
  owner_id: string;
  contact_number?: string;
  location?: string;
  custom_qr_url?: string;
  // preset_id removed
  theme_settings?: Partial<ThemeConfig> | null;
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  headingFont: string;
  bodyFont: string;
  textColor: string;
}

export interface UIPreset extends ThemeConfig {
  id: string;
  restaurant_id: string;
  // Legacy mappings if needed, but we extend ThemeConfig now
}


export interface Dish {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  currency?: string;
  image_url: string;
  glb_url?: string; // For Android/Web
  usdz_url?: string; // For iOS AR Quick Look
  ar_scale?: number; // Scaling factor for AR models
  category: string;
}

export interface AnalyticsEvent {
  id: string;
  restaurant_id: string;
  dish_id?: string;
  event_type: 'qr_scan' | 'view_ar' | 'click_dish';
  created_at: string;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  trend: number;
  icon: string;
  color: string;
}
