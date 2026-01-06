-- Migration: Add description and images columns
-- Date: January 5, 2026
-- Database: Neon PostgreSQL

-- Add description column to Route table
ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Add description column to Location table
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Add images array column to Location table
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT '{}';

-- Verify migration
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('Route', 'Location')
ORDER BY table_name, ordinal_position;
