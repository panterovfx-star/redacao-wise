import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PracticeTheme {
  theme: string;
  context: string;
  instructions: string;
  keywords: string[];
}

export const PracticeThemeGenerator = () => {
  const [practiceTheme, setPracticeTheme] = useState<PracticeTheme | null>(null);
  const [loading, setLoading] = useState(false);
  const [essayType, setEssayType] = useState<'enem' | 'vestibular'>('enem');
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateTheme = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-practice-theme', {
        body: { essayType }
      });

      if (error) throw error;

      if (data?.practiceTheme) {
        setPracticeTheme(data.practiceTheme);
        toast({
          title: "Tema gerado!",
          description: "Comece a escrever sua redação simulada",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao gerar tema",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startPractice = () => {
    if (practiceTheme) {
      navigate(`/correcao/${essayType}`, {
        state: { 
          practiceMode: true,
          theme: practiceTheme.theme,
          context: practiceTheme.context
        }
      });
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Simulados de Treino</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-3">
          <Select value={essayType} onValueChange={(v: 'enem' | 'vestibular') => setEssayType(v)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enem">ENEM</SelectItem>
              <SelectItem value="vestibular">Vestibular</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={generateTheme} 
            disabled={loading}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Gerando...' : 'Gerar Tema'}
          </Button>
        </div>

        {!practiceTheme && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Gere um tema de redação para praticar</p>
            <p className="text-sm mt-2">Temas únicos e atualizados para seu treino</p>
            <p className="text-xs mt-1 text-primary">Disponível para planos Standard e Pro</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">Criando tema de redação...</p>
          </div>
        )}

        {practiceTheme && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
              <h4 className="font-bold text-lg mb-3">{practiceTheme.theme}</h4>
              
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Contextualização
                  </div>
                  <p className="text-sm whitespace-pre-line">{practiceTheme.context}</p>
                </div>

                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Instruções
                  </div>
                  <p className="text-sm">{practiceTheme.instructions}</p>
                </div>

                {practiceTheme.keywords.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Palavras-chave
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {practiceTheme.keywords.map((keyword, i) => (
                        <span 
                          key={i} 
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={startPractice} className="flex-1">
                Começar Redação
              </Button>
              <Button onClick={generateTheme} variant="outline">
                Outro Tema
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
