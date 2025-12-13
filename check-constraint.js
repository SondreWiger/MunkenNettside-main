#!/usr/bin/env node

/**
 * Check the current status constraint on ensemble_enrollments table
 * Run this to see what status values are currently allowed
 */

const { execSync } = require("child_process");

const query = `
  SELECT constraint_name, check_clause 
  FROM information_schema.check_constraints 
  WHERE table_name = 'ensemble_enrollments';
`;

console.log("To check the current constraint, run this SQL in Supabase SQL Editor:");
console.log(query);
console.log("\nTo fix the constraint, run:");
console.log(`
  ALTER TABLE public.ensemble_enrollments DROP CONSTRAINT IF EXISTS ensemble_enrollments_status_check;
  ALTER TABLE public.ensemble_enrollments ADD CONSTRAINT ensemble_enrollments_status_check 
    CHECK (status IN ('pending', 'yellow', 'blue', 'rejected', 'payment_pending', 'confirmed'));
`);
