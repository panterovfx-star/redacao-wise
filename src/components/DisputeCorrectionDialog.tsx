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
    if (!reason.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, explique o motivo da contestação.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update essay status to pending when dispute is created
      const { error: essayError } = await supabase
        .from("essays")
        .update({ status: "pending" })
        .eq("id", essayId);

      if (essayError) throw essayError;

      // Create the dispute
      const { error } = await supabase.from("essay_disputes").insert({
        essay_id: essayId,
        user_id: userId,
        reason: reason.trim(),
      });

      if (error) throw error;

      toast({
        title: "Contestação enviada!",
        description: "Sua redação está pendente de revisão pelos administradores.",
      });

      setReason("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating dispute:", error);
      toast({
        title: "Erro ao enviar contestação",
        description: error.message,
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
            placeholder="Descreva os pontos com os quais você discorda e por quê. Seja específico e objetivo."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[150px]"
          />
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
