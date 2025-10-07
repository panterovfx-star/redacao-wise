-- Add RLS policies for admins to manage users

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage user roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all essays for training purposes
CREATE POLICY "Admins can view all essays"
ON public.essays
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create table for AI training feedback
CREATE TABLE IF NOT EXISTS public.ai_training_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID REFERENCES public.essays(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID NOT NULL,
  original_score INTEGER NOT NULL,
  corrected_score INTEGER NOT NULL,
  feedback_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.ai_training_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage training feedback"
ON public.ai_training_feedback
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add index for better performance
CREATE INDEX idx_training_feedback_essay ON public.ai_training_feedback(essay_id);
CREATE INDEX idx_training_feedback_admin ON public.ai_training_feedback(admin_id);