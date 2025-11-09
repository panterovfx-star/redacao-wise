-- Corrigir search_path da função update_updated_at_column para segurança
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Recriar triggers que usam essa função
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_essay_disputes_updated_at
  BEFORE UPDATE ON public.essay_disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();