#!/usr/bin/env node

/**
 * GDPR Compliance Cron Job Setup
 * 
 * This script should be run daily to maintain GDPR compliance
 * by cleaning up expired data and enforcing retention policies.
 * 
 * Setup instructions:
 * 1. Make executable: chmod +x scripts/gdpr-cron.mjs
 * 2. Add to crontab: 0 2 * * * /path/to/project/scripts/gdpr-cron.mjs
 * 3. Or run via GitHub Actions/Vercel Cron
 */

import { cleanupExpiredData } from './gdpr-cleanup.mjs'

async function runCleanup() {
  console.log(`🕐 Starting scheduled GDPR cleanup at ${new Date().toISOString()}`)
  
  try {
    await cleanupExpiredData()
    console.log('✅ Scheduled cleanup completed successfully')
  } catch (error) {
    console.error('❌ Scheduled cleanup failed:', error)
    process.exit(1)
  }
}

runCleanup()