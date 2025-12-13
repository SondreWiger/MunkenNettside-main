#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Make sure these are set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  try {
    console.log('🚀 Starting family accounts migration...\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'scripts', '006-add-family-accounts.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 SQL file loaded. Attempting migration...\n');
    console.log('⚠️  To run migrations, use Supabase SQL Editor:');
    console.log('    https://app.supabase.com -> SQL Editor\n');
    console.log('Copy and paste the following SQL:\n');
    console.log('---');
    console.log(sqlContent);
    console.log('---\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runMigration();
