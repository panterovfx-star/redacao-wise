-- Add column to track manual plan overrides by admin
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS manual_plan_override boolean DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.manual_plan_override IS 'When true, indicates that an admin manually set the plan and it should not be overwritten by Stripe sync';