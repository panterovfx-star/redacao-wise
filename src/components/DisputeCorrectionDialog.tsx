import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Send } from "lucide-react";

interface DisputeCorrectionDialogProps {
  essayId: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DisputeCorrectionDialog = ({
  essayId,
  userId,
  open,
  onOpenChange,
}: DisputeCorrectionDialogProps) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    // Validate input length
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, explique o motivo da contestação.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedReason.length < 20) {
      toast({
        title: "Motivo muito curto",
        description: "Por favor, forneça uma explicação mais detalhada (mínimo 20 caracteres).",
        variant: "destructive",
      });
      return;
    }

    if (trimmedReason.length > 1000) {
      toast({
        title: "Motivo muito longo",
        description: "Por favor, seja mais conciso (máximo 1000 caracteres).",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Check if essay exists and is corrected
      const { data: essay, error: essayFetchError } = await supabase
        .from("essays")
        .select("status, user_id")
        .eq("id", essayId)
        .single();

      if (essayFetchError || !essay) {
        toast({
          title: "Erro",
          description: "Redação não encontrada.",
          variant: "destructive",
        });
        return;
      }

      if (essay.status !== "corrected") {
        toast({
          title: "Erro",
          description: "Só é possível contestar redações já corrigidas.",
          variant: "destructive",
        });
        return;
      }

      // Check for existing disputes
      const { data: existingDisputes, error: disputeCheckError } = await supabase
        .from("essay_disputes")
        .select("status")
        .eq("essay_id", essayId)
        .in("status", ["pending", "approved"]);

      if (disputeCheckError) throw disputeCheckError;

      if (existingDisputes && existingDisputes.length > 0) {
        toast({
          title: "Contestação já existe",
          description: "Já existe uma contestação pendente para esta redação.",
          variant: "destructive",
        });
        return;
      }

      // Create the dispute (essay status will be updated by admin on approval)
      const { error } = await supabase.from("essay_disputes").insert({
        essay_id: essayId,
        user_id: userId,
        reason: trimmedReason,
      });

      if (error) throw error;

      toast({
        title: "Contestação enviada!",
        description: "Sua contestação será revisada pelos administradores.",
      });

      setReason("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar contestação",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Contestar Correção
          </DialogTitle>
          <DialogDescription>
            Explique detalhadamente por que você discorda desta correção. Um administrador irá revisar sua solicitação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Descreva os pontos com os quais você discorda e por quê. Seja específico e objetivo (mínimo 20 caracteres)."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[150px]"
            maxLength={1000}
          />
          <div className="text-sm text-muted-foreground text-right">
            {reason.length}/1000 caracteres
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Send className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Contestação
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
