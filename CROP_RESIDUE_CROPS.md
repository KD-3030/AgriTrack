# Crop Residue Management (CRM) - Eligible Crops

## Overview
The farmer booking portal now shows **only the top 5 major crops that generate significant crop residue** requiring Custom Hiring Center (CHC) machinery for management. This focuses on the most critical crops causing stubble burning issues in India.

## Eligible Crops (5 crops)

### Major Residue-Generating Crops

#### Kharif Season (Monsoon - June to October)
1. **Rice (धान / ਝੋਨਾ)** 🌾
   - **#1 Stubble burning issue in Punjab, Haryana, UP**
   - Machines: Combine Harvester, Happy Seeder, Straw Baler, Rotavator
   - Residue: Rice straw, stubble (6-8 tonnes/hectare)
   - Critical for air pollution prevention

2. **Maize (मक्का / ਮੱਕੀ)** 🌽
   - Large stalks need shredding
   - Machines: Maize Harvester, Seed Drill, Shredder, Rotavator
   - Residue: Maize stalks, cobs (5-7 tonnes/hectare)
   - Used for food and fodder

3. **Cotton (कपास / ਨਰਮਾ)** ☁️
   - Cotton stalks require management
   - Machines: Cotton Picker, Stalk Shredder, Rotavator
   - Residue: Cotton stalks (3-4 tonnes/hectare)
   - Major fiber crop

#### Rabi Season (Winter - November to March)
4. **Wheat (गेहूं / ਕਣਕ)** 🌾
   - **#2 Major straw residue producer**
   - Machines: Combine Harvester, Seed Drill, Rotavator, Thresher
   - Residue: Wheat straw, stubble (5-6 tonnes/hectare)
   - Requires Happy Seeder for next crop

#### Annual Crops
5. **Sugarcane (गन्ना / ਗੰਨਾ)** 🎋
   - **Massive residue from stalks**
   - Machines: Sugarcane Harvester, Trench Digger, Ratoon Manager
   - Residue: Sugarcane tops, leaves, trash (10-15 tonnes/hectare)
   - Highest residue volume per hectare

## Why These 5 Crops?

### Government Priority
- **Rice & Wheat**: Targeted in National Policy on Crop Residue Management
- **Cotton**: Focus in Maharashtra, Gujarat, Telangana
- **Sugarcane**: UP, Maharashtra high residue volume states
- **Maize**: Growing concern in Bihar, Karnataka

### Residue Volume
1. Sugarcane: 10-15 tonnes/ha
2. Rice: 6-8 tonnes/ha  
3. Maize: 5-7 tonnes/ha
4. Wheat: 5-6 tonnes/ha
5. Cotton: 3-4 tonnes/ha

### Environmental Impact
- **Rice + Wheat**: 90% of stubble burning cases in North India
- Combined area: 25+ million hectares
- Air quality crisis in Delhi-NCR primarily from these two crops

## Crops Removed

### Previously Included (Now Removed)
- Soybean, Mustard, Groundnut, Bajra, Jowar
- Chickpea, Jute, Sunflower, Barley, Sesame
- Potato, Onion, Tomato, Vegetables

### Reason for Removal
- **Focus on Top Priority**: Limited to 5 most critical crops
- **Government Focus**: Aligns with national policies
- **Stubble Burning**: These 5 cause majority of burning incidents
- **Residue Volume**: Highest biomass generators
- **Machinery Relevance**: Most CHC usage for these crops

## Impact on System

### Files Updated
1. ✅ `apps/web/src/data/crop-machines.json` - Now contains only 5 crops
2. ✅ `apps/web/src/app/farmer/book/page.tsx` - Bengali mappings reduced to 5
3. ✅ `CROP_RESIDUE_CROPS.md` - Documentation updated

### Features Affected
- **Farmer Booking Portal**: Shows only 5 core CRM crops
- **Voice Recognition**: Recognizes only these 5 + Bengali names
- **Machine Recommendations**: Focused on most critical machinery
- **Crop Selection**: Simplified dropdown with 5 options

### User Benefits
1. **Simpler Choice**: 5 options instead of 15+
2. **Clear Focus**: Only crops that truly need CRM
3. **Faster Booking**: Less scrolling, quicker selection
4. **Better Targeting**: Resources focused on priority crops

## Multi-Language Support

All 5 crops have names in:
- **English** (en): Rice, Wheat, Maize, Sugarcane, Cotton
- **Hindi** (hi): धान, गेहूं, मक्का, गन्ना, कपास
- **Punjabi** (pa): ਝੋਨਾ, ਕਣਕ, ਮੱਕੀ, ਗੰਨਾ, ਨਰਮਾ
- **Bengali** (bn): ধান, গম, ভুট্টা, আখ, তুলা

## Seasonal Distribution

| Season | Crops |
|--------|-------|
| **Kharif** (Jun-Oct) | Rice, Maize, Cotton (3 crops) |
| **Rabi** (Nov-Mar) | Wheat (1 crop) |
| **Annual** | Sugarcane (1 crop) |

## Machinery Focus

### Core Machines for These 5 Crops
1. **Combine Harvester** - Rice, Wheat
2. **Happy Seeder** - Rice stubble to Wheat
3. **Straw Baler** - Rice, Wheat
4. **Shredder** - Cotton, Maize, Sugarcane
5. **Rotavator** - All crops
6. **Sugarcane Harvester** - Sugarcane
7. **Cotton Picker** - Cotton
8. **Maize Harvester** - Maize

---

**Last Updated**: December 9, 2025  
**Focus**: Top 5 Critical CRM Crops for AgriTrack SIH 2025  
**Priority**: Stubble Burning Prevention in Punjab, Haryana, UP
