/**
 * Mapbox Configuration
 * =====================
 * Centralized configuration for Mapbox GL JS
 * Handles environment variable injection at build time
 */

// This gets replaced at build time by Next.js
export const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

// Validate token exists
export const isMapboxConfigured = () => {
  return MAPBOX_ACCESS_TOKEN && MAPBOX_ACCESS_TOKEN !== '';
};

// Log configuration status (always log for debugging)
if (typeof window !== 'undefined') {
  console.log('🗺️ Mapbox Configuration:', {
    tokenExists: isMapboxConfigured(),
    tokenLength: MAPBOX_ACCESS_TOKEN?.length || 0,
    tokenPrefix: MAPBOX_ACCESS_TOKEN?.substring(0, 20) + '...',
    fullToken: MAPBOX_ACCESS_TOKEN,
    env: process.env.NODE_ENV
  });
}

// Mapbox default settings
export const MAPBOX_DEFAULTS = {
  // Default center: Amman, Jordan
  defaultCenter: [35.9106, 31.9454] as [number, number],
  defaultZoom: 10,
  userLocationZoom: 12,
  maxZoom: 18,
  minZoom: 8,
  style: 'mapbox://styles/mapbox/streets-v12',
  // Arabic/RTL support
  language: 'ar',
  rtl: true,
};

// Zone colors for consistency
export const ZONE_COLORS = {
  zoneA: {
    fill: '#10B981',
    fillOpacity: 0.1,
    stroke: '#10B981',
    strokeOpacity: 0.5,
  },
  zoneB: {
    fill: '#F59E0B',
    fillOpacity: 0.05,
    stroke: '#F59E0B',
    strokeOpacity: 0.3,
  },
  outOfRange: {
    fill: '#6B7280',
    fillOpacity: 0.05,
    stroke: '#6B7280',
    strokeOpacity: 0.3,
  },
};

// Error messages (bilingual)
export const MAPBOX_ERRORS = {
  missingToken: {
    ar: '⚠️ خريطة غير متوفرة - الرجاء التواصل مع الدعم الفني',
    en: '⚠️ Map unavailable - Please contact support',
  },
  loadFailed: {
    ar: '❌ فشل تحميل الخريطة - الرجاء المحاولة لاحقاً',
    en: '❌ Failed to load map - Please try again later',
  },
  locationDenied: {
    ar: '📍 لم يتم السماح بالوصول إلى موقعك',
    en: '📍 Location access was denied',
  },
};