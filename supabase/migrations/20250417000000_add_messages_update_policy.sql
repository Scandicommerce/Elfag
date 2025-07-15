/*
  # Add UPDATE policy for messages table

  1. Changes
    - Add UPDATE policy to allow users to update messages where they are the recipient
    - This enables updating read_at field and other message properties

  2. Security
    - Only allow updates to messages where the user's company is the recipient (to_company_id)
    - This is appropriate for marking messages as read
*/

-- Add UPDATE policy for messages table
CREATE POLICY "Users can update messages they received"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE user_id = auth.uid()
      AND id = to_company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE user_id = auth.uid()
      AND id = to_company_id
    )
  ); 