#!/usr/bin/env node

/**
 * Regenerate QR Signatures
 * 
 * This script regenerates QR code signatures for all existing bookings
 * to fix the issue where old bookings have invalid signatures.
 * 
 * Usage: node scripts/regenerate-qr-signatures.mjs
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QR_SECRET = process.env.QR_SIGNING_SECRET || 'default-secret-change-in-production';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function generateQRSignature(data) {
  const payload = JSON.stringify(data);
  return crypto.createHmac('sha256', QR_SECRET).update(payload).digest('hex');
}

async function regenerateQRSignatures() {
  console.log('🔄 Starting QR signature regeneration...\n');

  try {
    // Fetch all bookings with QR data
    const { data: bookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, qr_code_data')
      .not('qr_code_data', 'is', null);

    if (fetchError) {
      console.error('❌ Error fetching bookings:', fetchError.message);
      process.exit(1);
    }

    console.log(`📚 Found ${bookings?.length || 0} bookings with QR data\n`);

    if (!bookings || bookings.length === 0) {
      console.log('✅ No bookings to regenerate');
      process.exit(0);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const booking of bookings) {
      try {
        const qrData = booking.qr_code_data;

        if (typeof qrData === 'string') {
          const parsed = JSON.parse(qrData);

          // Remove old signature
          const { signature: oldSignature, ...dataWithoutSignature } = parsed;

          // Generate new signature
          const newSignature = generateQRSignature(dataWithoutSignature);

          // Skip if signature hasn't changed
          if (oldSignature === newSignature) {
            console.log(`⏭️  ${booking.id}: Signature already correct`);
            continue;
          }

          // Create new QR data with new signature
          const newQrData = {
            ...dataWithoutSignature,
            signature: newSignature,
          };

          // Update booking
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ qr_code_data: JSON.stringify(newQrData) })
            .eq('id', booking.id);

          if (updateError) {
            console.error(`❌ ${booking.id}: Update failed -`, updateError.message);
            errorCount++;
          } else {
            console.log(`✅ ${booking.id}: Signature regenerated`);
            successCount++;
          }
        }
      } catch (err) {
        console.error(`❌ ${booking.id}: Error -`, err.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`  ✅ Updated: ${successCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  ⏭️  Skipped (already correct): ${bookings.length - successCount - errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 All signatures regenerated successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some signatures failed to regenerate');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

regenerateQRSignatures();
