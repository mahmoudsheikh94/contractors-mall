import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const getEnv = (name) => envContent.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]?.trim();

const supabase = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
);

// Try to insert a test row to see what columns exist
const testData = {
  supplier_id: '00000000-0000-0000-0000-000000000000', // fake UUID
  zone: 'zone_a',
  base_fee_jod: 5.0
};

console.log('Testing supplier_zone_fees structure...\n');

const { error } = await supabase
  .from('supplier_zone_fees')
  .insert(testData);

if (error) {
  console.log('Insert error (expected):');
  console.log('  Message:', error.message);
  console.log('  Code:', error.code);
  
  if (error.message.includes('vehicle_class_id')) {
    console.log('\n❌ CONTRADICTION CONFIRMED: vehicle_class_id column STILL EXISTS!');
    console.log('   The hotfix migration may not have been applied to production.');
  } else if (error.message.includes('violates foreign key')) {
    console.log('\n✅ Column structure correct (error is about fake supplier_id)');
  } else {
    console.log('\n⚠️  Different error - needs investigation');
  }
}
