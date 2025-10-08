-- Recriar políticas RLS da tabela essays para garantir proteção adequada
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own essays" ON essays;
DROP POLICY IF EXISTS "Users can insert their own essays" ON essays;
DROP POLICY IF EXISTS "Users can update their own essays" ON essays;
DROP POLICY IF EXISTS "Users can delete their own essays" ON essays;
DROP POLICY IF EXISTS "Admins can view all essays" ON essays;

-- Create new permissive policies with explicit authentication checks
CREATE POLICY "Users can view their own essays"
  ON essays FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all essays"
  ON essays FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own essays"
  ON essays FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own essays"
  ON essays FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own essays"
  ON essays FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add comment to document security measures
COMMENT ON TABLE essays IS 'Contains user essay submissions. RLS policies ensure users can only access their own essays, while admins (verified via has_role function) can access all essays for moderation purposes.';