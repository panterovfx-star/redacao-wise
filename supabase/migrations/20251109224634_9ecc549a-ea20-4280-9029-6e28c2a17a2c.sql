-- Criar tabela para disputas de correções
CREATE TABLE public.essay_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id uuid NOT NULL REFERENCES public.essays(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_id uuid,
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.essay_disputes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own disputes"
  ON public.essay_disputes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create disputes for their own essays"
  ON public.essay_disputes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.essays WHERE id = essay_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can view all disputes"
  ON public.essay_disputes FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update disputes"
  ON public.essay_disputes FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_essay_disputes_updated_at
  BEFORE UPDATE ON public.essay_disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentário explicativo
COMMENT ON TABLE public.essay_disputes IS 'Armazena disputas de correções de redações. Permite que alunos contestem correções e admins revisem.';