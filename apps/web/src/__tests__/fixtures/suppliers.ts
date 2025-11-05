/**
 * Mock supplier data for testing
 */

export const mockSuppliers = [
  {
    supplier_id: 'supp-001',
    business_name_ar: 'مورد الأسمنت والحديد',
    business_name_en: 'Cement & Steel Supplier',
    owner_name: 'محمد أحمد',
    phone: '0795551111',
    email: 'cement@example.com',
    address: 'شارع الملك عبدالله، عمان',
    latitude: 31.9539,
    longitude: 35.9106,
    is_verified: true,
    is_active: true,
    zone_a_radius_km: 10,
    zone_b_radius_km: 20,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    supplier_id: 'supp-002',
    business_name_ar: 'مواد البناء الحديثة',
    business_name_en: 'Modern Building Materials',
    owner_name: 'خالد يوسف',
    phone: '0795552222',
    email: 'modern@example.com',
    address: 'شارع الجامعة، عمان',
    latitude: 31.9800,
    longitude: 35.8700,
    is_verified: true,
    is_active: true,
    zone_a_radius_km: 15,
    zone_b_radius_km: 30,
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    supplier_id: 'supp-003',
    business_name_ar: 'مورد الرمل والحصى',
    business_name_en: 'Sand & Gravel Supplier',
    owner_name: 'عبدالله محمود',
    phone: '0795553333',
    email: 'sand@example.com',
    address: 'طريق الزرقاء، عمان',
    latitude: 32.0500,
    longitude: 35.8800,
    is_verified: true,
    is_active: true,
    zone_a_radius_km: 12,
    zone_b_radius_km: 25,
    created_at: '2024-01-03T00:00:00Z',
  },
  {
    supplier_id: 'supp-004',
    business_name_ar: 'مورد غير مفعل',
    business_name_en: 'Inactive Supplier',
    owner_name: 'تجريبي',
    phone: '0795554444',
    email: 'inactive@example.com',
    address: 'عمان',
    latitude: 31.9700,
    longitude: 35.9200,
    is_verified: false,
    is_active: false,
    zone_a_radius_km: 10,
    zone_b_radius_km: 20,
    created_at: '2024-01-04T00:00:00Z',
  },
]

export const mockSupplier = mockSuppliers[0]

// Distance calculation mock data
export const mockDistanceData = {
  within_zone_a: {
    supplier_id: 'supp-001',
    distance_km: 5,
    zone: 'zone_a',
  },
  within_zone_b: {
    supplier_id: 'supp-001',
    distance_km: 15,
    zone: 'zone_b',
  },
  out_of_range: {
    supplier_id: 'supp-001',
    distance_km: 25,
    zone: null,
  },
}
