-- Add new resource type system and remove price fields
-- Migration: Add resource types and special competencies

-- Add new columns to resources table
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS resource_type text DEFAULT 'available_staffing',
ADD COLUMN IF NOT EXISTS special_competencies text[] DEFAULT '{}';

-- Remove price-related columns if they exist
ALTER TABLE resources 
DROP COLUMN IF EXISTS price,
DROP COLUMN IF EXISTS price_type,
DROP COLUMN IF EXISTS is_special;

-- Add constraint for resource_type
ALTER TABLE resources 
DROP CONSTRAINT IF EXISTS resources_resource_type_check;

ALTER TABLE resources 
ADD CONSTRAINT resources_resource_type_check 
CHECK (resource_type IN ('available_staffing', 'want_staffing', 'special_competence', 'special_tools'));

-- Update existing resources to use the new type system
UPDATE resources 
SET resource_type = 'available_staffing'
WHERE resource_type IS NULL OR resource_type = '';

-- Create index for resource_type for better performance
CREATE INDEX IF NOT EXISTS idx_resources_resource_type ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_is_taken ON resources(is_taken);
CREATE INDEX IF NOT EXISTS idx_resources_period ON resources(period_from, period_to);

-- Update the RLS policies to work with new structure
-- (existing policies should continue to work) 