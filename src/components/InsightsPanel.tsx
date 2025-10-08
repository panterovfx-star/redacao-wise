import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Sparkles, Target, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Insight {
  overall_performance: {
    average_score: number;
    trend: string;
    total_essays: number;
  };
  strengths: Array<{ area: string; description: string }>;
  weaknesses: Array<{ area: string; description: string; priority: string }>;
  recommendations: Array<{ title: string; action: string }>;
  next_steps: string;
}

export const InsightsPanel = () => {
  const [insights, setInsights] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insights');

      if (error) throw error;

      if (data?.insights) {
        setInsights(data.insights);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao gerar insights",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'bg-destructive/10 text-destructive';
      case 'média': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'melhorando') return '📈';
    if (trend === 'declinando') return '📉';
    return '➡️';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Insights de Desempenho</h3>
        </div>
        <Button 
          onClick={generateInsights} 
          disabled={loading}
          size="sm"
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {loading ? 'Gerando...' : insights ? 'Atualizar' : 'Gerar Insights'}
        </Button>
      </div>

      {!insights && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Clique em "Gerar Insights" para ver uma análise completa do seu desempenho</p>
          <p className="text-sm mt-2">Disponível para planos Standard e Pro</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Analisando suas redações...</p>
        </div>
      )}

      {insights && (
        <div className="space-y-6">
          {/* Overall Performance */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Desempenho Geral</span>
              <span className="text-2xl">{getTrendIcon(insights.overall_performance.trend)}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {insights.overall_performance.average_score.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Média</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {insights.overall_performance.total_essays}
                </div>
                <div className="text-xs text-muted-foreground">Redações</div>
              </div>
              <div>
                <div className="text-lg font-semibold capitalize">
                  {insights.overall_performance.trend}
                </div>
                <div className="text-xs text-muted-foreground">Tendência</div>
              </div>
            </div>
          </div>

          {/* Strengths */}
          {insights.strengths.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2 text-green-600 dark:text-green-400">
                <span>✓</span> Seus Pontos Fortes
              </h4>
              <div className="space-y-2">
                {insights.strengths.map((strength, i) => (
                  <div key={i} className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                    <div className="font-medium text-sm">{strength.area}</div>
                    <div className="text-sm text-muted-foreground mt-1">{strength.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weaknesses */}
          {insights.weaknesses.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" /> Áreas para Melhorar
              </h4>
              <div className="space-y-2">
                {insights.weaknesses.map((weakness, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="font-medium text-sm">{weakness.area}</div>
                      <Badge className={getPriorityColor(weakness.priority)} variant="secondary">
                        {weakness.priority}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{weakness.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {insights.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" /> Recomendações
              </h4>
              <div className="space-y-2">
                {insights.recommendations.map((rec, i) => (
                  <div key={i} className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="font-medium text-sm text-primary">{rec.title}</div>
                    <div className="text-sm mt-1">{rec.action}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {insights.next_steps && (
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
              <h4 className="font-medium mb-2">Próximos Passos</h4>
              <p className="text-sm">{insights.next_steps}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
