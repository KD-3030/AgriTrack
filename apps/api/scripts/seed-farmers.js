/**
 * Seed Script: Complete Farmer Data
 * Run with: node scripts/seed-farmers.js
 */

require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Complete farmer profiles for testing
const farmers = [
  {
    full_name: 'Ranjit Singh',
    phone: '+919876543210',
    alternate_phone: '+919876543200',
    email: 'ranjit.singh@example.com',
    address_line1: 'House No. 45, Main Road',
    address_line2: 'Near Gurudwara Sahib',
    village: 'Khanna',
    district: 'Ludhiana',
    state: 'Punjab',
    pincode: '141401',
    aadhaar_number: '1234',
    farming_experience_years: 15,
    primary_crops: ['wheat', 'rice', 'cotton'],
    preferred_language: 'punjabi',
    notification_language: 'punjabi',
    is_verified: true,
    fields: [
      {
        name: 'Main Field',
        area_acres: 12.5,
        soil_type: 'alluvial',
        irrigation_type: 'tubewell',
        current_crop: 'wheat',
        latitude: 30.8990,
        longitude: 75.8573
      },
      {
        name: 'West Plot',
        area_acres: 8.0,
        soil_type: 'alluvial',
        irrigation_type: 'canal',
        current_crop: 'rice',
        latitude: 30.8950,
        longitude: 75.8510
      }
    ]
  },
  {
    full_name: 'Gurpreet Kaur',
    phone: '+919876543211',
    alternate_phone: null,
    email: 'gurpreet.kaur@example.com',
    address_line1: 'Village Ajnala',
    address_line2: 'Post Office Road',
    village: 'Ajnala',
    district: 'Amritsar',
    state: 'Punjab',
    pincode: '143102',
    aadhaar_number: '5678',
    farming_experience_years: 10,
    primary_crops: ['wheat', 'paddy'],
    preferred_language: 'punjabi',
    notification_language: 'punjabi',
    is_verified: true,
    fields: [
      {
        name: 'North Plot',
        area_acres: 8.0,
        soil_type: 'alluvial',
        irrigation_type: 'canal',
        current_crop: 'paddy',
        latitude: 31.6340,
        longitude: 74.8723
      }
    ]
  },
  {
    full_name: 'Harinder Pal',
    phone: '+919876543212',
    alternate_phone: '+919876543222',
    email: 'harinder.pal@example.com',
    address_line1: 'Gali No. 3, Nissing',
    address_line2: null,
    village: 'Nissing',
    district: 'Karnal',
    state: 'Haryana',
    pincode: '132024',
    aadhaar_number: '9012',
    farming_experience_years: 8,
    primary_crops: ['wheat', 'sugarcane'],
    preferred_language: 'hindi',
    notification_language: 'hindi',
    is_verified: true,
    fields: [
      {
        name: 'Sugar Field',
        area_acres: 15.0,
        soil_type: 'alluvial',
        irrigation_type: 'tubewell',
        current_crop: 'sugarcane',
        latitude: 29.6857,
        longitude: 76.8367
      }
    ]
  },
  {
    full_name: 'Pritim Mondal',
    phone: '+917029214041',
    alternate_phone: '+919674063935',
    email: 'pritim.mondal@example.com',
    address_line1: 'Flat 12, Green Residency',
    address_line2: 'Salt Lake Sector V',
    village: 'Salt Lake',
    district: 'Kolkata',
    state: 'West Bengal',
    pincode: '700091',
    aadhaar_number: '3456',
    farming_experience_years: 5,
    primary_crops: ['rice', 'jute', 'potato'],
    preferred_language: 'bengali',
    notification_language: 'bengali',
    is_verified: true,
    fields: [
      {
        name: 'Test Field',
        area_acres: 5.0,
        soil_type: 'alluvial',
        irrigation_type: 'rainfed',
        current_crop: 'rice',
        latitude: 22.5726,
        longitude: 88.3639
      }
    ]
  },
  {
    full_name: 'Sukhdev Singh',
    phone: '+919888123456',
    alternate_phone: null,
    email: 'sukhdev@example.com',
    address_line1: 'Main Bazar',
    address_line2: 'Near Bus Stand',
    village: 'Bathinda',
    district: 'Bathinda',
    state: 'Punjab',
    pincode: '151001',
    aadhaar_number: '7890',
    farming_experience_years: 20,
    primary_crops: ['cotton', 'wheat', 'mustard'],
    preferred_language: 'punjabi',
    notification_language: 'punjabi',
    is_verified: true,
    fields: [
      {
        name: 'Cotton Field',
        area_acres: 25.0,
        soil_type: 'black',
        irrigation_type: 'drip',
        current_crop: 'cotton',
        latitude: 30.2110,
        longitude: 74.9455
      },
      {
        name: 'Wheat Field',
        area_acres: 18.0,
        soil_type: 'alluvial',
        irrigation_type: 'tubewell',
        current_crop: 'wheat',
        latitude: 30.2150,
        longitude: 74.9500
      }
    ]
  }
];

async function cleanupAndSeed() {
  console.log('🧹 Cleaning up existing data...');
  
  // Delete in order to respect foreign keys
  await supabase.from('farmer_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('farmer_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('farmer_service_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('booking_otps').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('sms_booking_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('farmer_fields').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('farmer_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('✅ Cleanup complete\n');
  
  console.log('🌱 Seeding farmer data...\n');
  
  for (const farmer of farmers) {
    const { fields, ...farmerData } = farmer;
    
    // Insert farmer profile
    const { data: farmerProfile, error: farmerError } = await supabase
      .from('farmer_profiles')
      .insert(farmerData)
      .select()
      .single();
    
    if (farmerError) {
      console.error(`❌ Error inserting ${farmer.full_name}:`, farmerError.message);
      continue;
    }
    
    console.log(`✅ Created farmer: ${farmer.full_name} (${farmer.phone})`);
    
    // Insert fields for this farmer
    for (const field of fields) {
      const fieldData = {
        farmer_id: farmerProfile.id,
        name: field.name,
        area_acres: field.area_acres,
        village: farmer.village,
        district: farmer.district,
        state: farmer.state,
        latitude: field.latitude,
        longitude: field.longitude,
        soil_type: field.soil_type,
        irrigation_type: field.irrigation_type,
        current_crop: field.current_crop,
        is_active: true
      };
      
      const { error: fieldError } = await supabase
        .from('farmer_fields')
        .insert(fieldData);
      
      if (fieldError) {
        console.error(`  ❌ Error inserting field ${field.name}:`, fieldError.message);
      } else {
        console.log(`  📍 Added field: ${field.name} (${field.area_acres} acres)`);
      }
    }
    
    console.log('');
  }
  
  console.log('🎉 Seeding complete!\n');
  
  // Verify
  const { data: count } = await supabase
    .from('farmer_profiles')
    .select('id', { count: 'exact' });
  
  const { data: fieldCount } = await supabase
    .from('farmer_fields')
    .select('id', { count: 'exact' });
  
  console.log(`📊 Summary:`);
  console.log(`   Farmers: ${count?.length || 0}`);
  console.log(`   Fields: ${fieldCount?.length || 0}`);
}

cleanupAndSeed().catch(console.error);
