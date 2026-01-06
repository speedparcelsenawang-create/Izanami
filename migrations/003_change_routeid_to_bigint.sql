-- Migration: Change routeId from INTEGER to BIGINT
-- Date: January 6, 2026
-- Database: Neon PostgreSQL
-- Purpose: Support larger routeId values (e.g., timestamps) that exceed INTEGER range

-- Change the routeId column type in Location table
ALTER TABLE "Location" 
  ALTER COLUMN "routeId" TYPE BIGINT;

-- Change the id column type in Route table to match
ALTER TABLE "Route" 
  ALTER COLUMN "id" TYPE BIGINT;

-- Verify the changes
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('Route', 'Location')
  AND column_name IN ('id', 'routeId')
ORDER BY table_name, column_name;
