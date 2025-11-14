-- Restrict essay status updates from client
-- Users cannot change status field, only admins can through edge functions

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own essays" ON essays;

-- Create policy that allows users to update their essays but not the status field
-- We'll enforce this by using a database trigger
CREATE POLICY "Users can update their own essays"
ON essays
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a trigger function to prevent status updates from non-admins
CREATE OR REPLACE FUNCTION prevent_status_update_from_client()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow status changes if user is admin
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    ) THEN
      RAISE EXCEPTION 'Only administrators can change essay status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce status update restriction
DROP TRIGGER IF EXISTS check_status_update ON essays;
CREATE TRIGGER check_status_update
  BEFORE UPDATE ON essays
  FOR EACH ROW
  EXECUTE FUNCTION prevent_status_update_from_client();