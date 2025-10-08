import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, ArrowLeft, Loader2, Send, Upload, FileImage, Crown, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";

const EssayCorrection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { type } = useParams<{ type: string }>();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [correction, setCorrection] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractingText, setExtractingText] = useState(false);
  const [textExtracted, setTextExtracted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { status: subscriptionStatus } = useSubscription();

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    };

    loadUserData();

    // Check if there's essay data passed from Dashboard or practice mode
    const state = location.state as any;
    if (state?.essayData && state?.correction) {
      setTitle(state.essayData.title || "");
      setTheme(state.essayData.theme || "");
      setContent(state.essayData.content || "");
      setCorrection(state.correction);
    } else if (state?.practiceMode && state?.theme) {
      // Pre-fill practice theme
      setTheme(state.theme);
      if (state.context) {
        toast({
          title: "Tema de Treino Carregado",
          description: "Leia a contextualização e comece a escrever!",
        });
      }
    }
  }, [navigate, location]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (subscriptionStatus.plan !== "pro") {
      toast({
        title: "Recurso Pro",
        description: "A leitura de imagens e PDFs está disponível apenas para usuários Pro.",
        variant: "destructive",
      });
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Por favor, envie uma imagem (JPG, PNG, WEBP) ou PDF.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setExtractingText(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        toast({
          title: "Processando arquivo...",
          description: "Extraindo o texto do arquivo. Isso pode levar alguns segundos.",
        });

        const { data, error } = await supabase.functions.invoke('extract-text', {
          body: { file: base64, fileType: file.type }
        });

        if (error) throw error;

        if (data?.text) {
          setContent(data.text);
          setTextExtracted(true);
          
          // Focus no textarea após extração
          setTimeout(() => {
            textareaRef.current?.focus();
            textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
          
          toast({
            title: "✅ Texto extraído com sucesso!",
            description: `${data.text.length} caracteres extraídos. Você pode editar o texto abaixo antes de enviar.`,
          });
        } else {
          throw new Error("Nenhum texto encontrado no arquivo");
        }
      };

      reader.onerror = () => {
        throw new Error("Erro ao ler o arquivo");
      };
    } catch (error: any) {
      console.error('Error extracting text:', error);
      toast({
        title: "Erro ao extrair texto",
        description: error.message || "Não foi possível extrair o texto do arquivo. Tente novamente.",
        variant: "destructive",
      });
      setUploadedFile(null);
    } finally {
      setExtractingText(false);
    }
  };

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
          theme: theme || null,
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
          theme: theme || null,
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Sua Redação</h2>
                {subscriptionStatus.plan === "pro" && (
                  <Badge variant="default" className="gap-1">
                    <Crown className="w-3 h-3" />
                    Pro
                  </Badge>
                )}
              </div>
              <div className="space-y-4">
                {subscriptionStatus.plan === "pro" && (
                  <Card className="p-4 bg-gradient-card border-primary/20">
                    <div className="flex items-start gap-3">
                      <FileImage className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1">Recurso Pro: Upload de Imagem/PDF</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Tire uma foto da sua redação ou envie um PDF. Nossa IA extrairá o texto automaticamente com alta precisão.
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={extractingText || loading}
                          >
                            {extractingText ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Extraindo texto...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                {uploadedFile ? 'Trocar arquivo' : 'Enviar arquivo'}
                              </>
                            )}
                          </Button>
                          {uploadedFile && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setUploadedFile(null);
                                setContent("");
                                setTextExtracted(false);
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = "";
                                }
                              }}
                              disabled={extractingText || loading}
                            >
                              Limpar
                            </Button>
                          )}
                        </div>
                        {uploadedFile && !extractingText && (
                          <div className="mt-3 p-2 bg-muted rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground">
                              📄 {uploadedFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(uploadedFile.size / 1024).toFixed(2)} KB • {uploadedFile.type.split('/')[1].toUpperCase()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
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
                    Tema da redação (opcional)
                  </label>
                  <Input
                    placeholder="Ex: Impactos da tecnologia na educação"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">
                      Texto da redação *
                    </label>
                    {textExtracted && (
                      <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Texto extraído
                      </Badge>
                    )}
                  </div>
                  <Textarea
                    ref={textareaRef}
                    placeholder={subscriptionStatus.plan === "pro" 
                      ? "Cole, digite sua redação ou faça upload de uma imagem/PDF acima..." 
                      : "Cole ou digite sua redação aqui..."}
                    className="min-h-[400px] font-mono text-sm"
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      if (textExtracted && e.target.value !== content) {
                        setTextExtracted(false);
                      }
                    }}
                    disabled={loading || extractingText}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {content.length} caracteres
                    </p>
                    {textExtracted && content.length > 0 && (
                      <p className="text-xs text-success">
                        ✓ Pronto para enviar
                      </p>
                    )}
                  </div>
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
