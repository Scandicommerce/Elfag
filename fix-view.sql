-- Fix anonymized_resources view
-- This script fixes the 406 "Not Acceptable" error by ensuring the view has all required columns

-- First, let's check what columns currently exist in the resources table
-- (You can run this to see what's available)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'resources';

-- Drop the existing view if it exists
DROP VIEW IF EXISTS anonymized_resources;

-- Recreate the view with all required columns
CREATE VIEW anonymized_resources AS
SELECT 
  r.id,
  r.company_id,
  c.anonymous_id,
  r.competence,
  r.period_from,
  r.period_to,
  r.location,
  r.comments,
  CASE 
    WHEN c.user_id = auth.uid() THEN r.contact_info
    ELSE 'Kontakt via meldingssystem'
  END as contact_info,
  r.is_special,
  r.created_at,
  r.is_taken,
  r.price,
  r.price_type,
  r.accepted_by_company_id
FROM resources r
JOIN companies c ON c.id = r.company_id;

-- Grant necessary permissions
GRANT SELECT ON anonymized_resources TO authenticated;

-- Test the view (optional - uncomment to test)
-- SELECT * FROM anonymized_resources LIMIT 1; 