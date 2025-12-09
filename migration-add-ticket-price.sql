-- Migration: Add default_ticket_price_nok to ensembles table
-- Run this after deploying the updated schema

ALTER TABLE public.ensembles 
ADD COLUMN IF NOT EXISTS default_ticket_price_nok DECIMAL(10,2) DEFAULT 250;

-- Update existing ensembles to have a default ticket price
UPDATE public.ensembles 
SET default_ticket_price_nok = 250 
WHERE default_ticket_price_nok IS NULL;