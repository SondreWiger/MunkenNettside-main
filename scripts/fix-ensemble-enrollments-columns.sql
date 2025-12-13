-- Fix ensemble_enrollments table to match schema
-- Add missing columns if they don't exist

-- Check and add participation_price_nok to ensembles table if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ensembles' 
    AND column_name = 'participation_price_nok'
  ) THEN
    ALTER TABLE public.ensembles 
    ADD COLUMN participation_price_nok DECIMAL(10,2) DEFAULT 0;
    RAISE NOTICE 'Added participation_price_nok column to ensembles';
  ELSE
    RAISE NOTICE 'participation_price_nok column already exists in ensembles';
  END IF;
END $$;

-- Check and add amount_paid_nok if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ensemble_enrollments' 
    AND column_name = 'amount_paid_nok'
  ) THEN
    ALTER TABLE public.ensemble_enrollments 
    ADD COLUMN amount_paid_nok DECIMAL(10,2);
    RAISE NOTICE 'Added amount_paid_nok column';
  ELSE
    RAISE NOTICE 'amount_paid_nok column already exists';
  END IF;
END $$;

-- Check and add enrollment_reference if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ensemble_enrollments' 
    AND column_name = 'enrollment_reference'
  ) THEN
    ALTER TABLE public.ensemble_enrollments 
    ADD COLUMN enrollment_reference TEXT UNIQUE;
    RAISE NOTICE 'Added enrollment_reference column';
  ELSE
    RAISE NOTICE 'enrollment_reference column already exists';
  END IF;
END $$;

-- Check and add payment_completed_at if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ensemble_enrollments' 
    AND column_name = 'payment_completed_at'
  ) THEN
    ALTER TABLE public.ensemble_enrollments 
    ADD COLUMN payment_completed_at TIMESTAMPTZ;
    RAISE NOTICE 'Added payment_completed_at column';
  ELSE
    RAISE NOTICE 'payment_completed_at column already exists';
  END IF;
END $$;

-- Check and add notification_read if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ensemble_enrollments' 
    AND column_name = 'notification_read'
  ) THEN
    ALTER TABLE public.ensemble_enrollments 
    ADD COLUMN notification_read BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added notification_read column';
  ELSE
    RAISE NOTICE 'notification_read column already exists';
  END IF;
END $$;
