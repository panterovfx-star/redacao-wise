import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, ArrowLeft, Loader2, Send } from "lucide-react";

const EssayCorrection = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [correction, setCorrection] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, escreva sua redação antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setCorrection(null);

    try {
      // First, create the essay record
      const { data: essayData, error: essayError } = await supabase
        .from("essays")
        .insert({
          user_id: user.id,
          title: title || `Redação ${type === 'enem' ? 'ENEM' : 'Vestibular'}`,
          content: content,
          essay_type: type,
          status: 'pending',
        })
        .select()
        .single();

      if (essayError) throw essayError;

      // Call the correction function
      const { data, error } = await supabase.functions.invoke('correct-essay', {
        body: {
          essayId: essayData.id,
          essayContent: content,
          essayType: type,
        },
      });

      if (error) {
        // Check if it's a limit error
        if (error.message?.includes('Daily limit reached')) {
          toast({
            title: "Limite diário atingido",
            description: data?.message || "Você atingiu o limite de correções do seu plano.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      setCorrection(data.correction);
      toast({
        title: "Correção concluída!",
        description: `Nota: ${data.score}/${type === 'enem' ? '1000' : '100'}`,
      });

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Erro ao corrigir",
        description: error.message || "Ocorreu um erro ao corrigir sua redação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderCorrection = () => {
    if (!correction) return null;

    if (type === 'enem') {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
              {correction.notaTotal}/1000
            </div>
            <p className="text-muted-foreground">Nota Total</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Competências</h3>
            {correction.competencias?.map((comp: any, idx: number) => (
              <Card key={idx} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">Competência {comp.numero}</h4>
                  <span className="text-lg font-bold text-primary">{comp.nota}/200</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{comp.comentario}</p>
                {comp.sugestoes && (
                  <p className="text-sm mt-2 p-2 bg-muted rounded">
                    <strong>Sugestões:</strong> {comp.sugestoes}
                  </p>
                )}
              </Card>
            ))}
          </div>

          {correction.pontosPositivos && correction.pontosPositivos.length > 0 && (
            <Card className="p-4 bg-success/5 border-success/20">
              <h4 className="font-semibold mb-2 text-success">Pontos Positivos</h4>
              <ul className="list-disc list-inside space-y-1">
                {correction.pontosPositivos.map((ponto: string, idx: number) => (
                  <li key={idx} className="text-sm">{ponto}</li>
                ))}
              </ul>
            </Card>
          )}

          {correction.conclusao && (
            <Card className="p-4">
              <h4 className="font-semibold mb-2">Conclusão</h4>
              <p className="text-sm text-muted-foreground">{correction.conclusao}</p>
            </Card>
          )}
        </div>
      );
    } else {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
              {correction.notaTotal}/100
            </div>
            <p className="text-muted-foreground">Nota Total</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Critérios</h3>
            {correction.criterios?.map((crit: any, idx: number) => (
              <Card key={idx} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">{crit.nome}</h4>
                  <span className="text-lg font-bold text-primary">{crit.nota}/25</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{crit.comentario}</p>
                {crit.sugestoes && (
                  <p className="text-sm mt-2 p-2 bg-muted rounded">
                    <strong>Sugestões:</strong> {crit.sugestoes}
                  </p>
                )}
              </Card>
            ))}
          </div>

          {correction.pontosPositivos && correction.pontosPositivos.length > 0 && (
            <Card className="p-4 bg-success/5 border-success/20">
              <h4 className="font-semibold mb-2 text-success">Pontos Positivos</h4>
              <ul className="list-disc list-inside space-y-1">
                {correction.pontosPositivos.map((ponto: string, idx: number) => (
                  <li key={idx} className="text-sm">{ponto}</li>
                ))}
              </ul>
            </Card>
          )}

          {correction.conclusao && (
            <Card className="p-4">
              <h4 className="font-semibold mb-2">Conclusão</h4>
              <p className="text-sm text-muted-foreground">{correction.conclusao}</p>
            </Card>
          )}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">
              Correção {type === 'enem' ? 'ENEM' : 'Vestibular'}
            </span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Left side - Essay input */}
          <div>
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Sua Redação</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Título (opcional)
                  </label>
                  <Input
                    placeholder="Ex: A importância da educação digital"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Texto da redação *
                  </label>
                  <Textarea
                    placeholder="Cole ou digite sua redação aqui..."
                    className="min-h-[400px] font-mono text-sm"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {content.length} caracteres
                  </p>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !content.trim()}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Corrigindo...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Enviar para Correção
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* Right side - Correction result */}
          <div>
            <Card className="p-6 min-h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="font-semibold mb-1">Analisando sua redação...</p>
                    <p className="text-sm text-muted-foreground">
                      Isso pode levar alguns segundos
                    </p>
                  </div>
                </div>
              ) : correction ? (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Resultado da Correção</h2>
                  {renderCorrection()}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <GraduationCap className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg">Aguardando redação...</p>
                  <p className="text-sm mt-2">
                    Digite ou cole sua redação ao lado e clique em enviar
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EssayCorrection;
