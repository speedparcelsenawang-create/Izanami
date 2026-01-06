-- Migration: Add extended location fields
-- Date: January 5, 2026
-- Database: Neon PostgreSQL
-- Purpose: Add missing columns for location enhancements

-- Add missing columns to Location table if they don't exist
ALTER TABLE "Location" 
  ADD COLUMN IF NOT EXISTS "websiteLink" TEXT,
  ADD COLUMN IF NOT EXISTS "qrCodeImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "qrCodeDestinationUrl" TEXT;

-- Verify the columns exist
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'Location'
ORDER BY ordinal_position;
