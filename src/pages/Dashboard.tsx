import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, LogOut, FileText, TrendingUp, History, Shield, Settings, Crown, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { useSubscription } from "@/hooks/use-subscription";
import { Badge } from "@/components/ui/badge";
import { InsightsPanel } from "@/components/InsightsPanel";
import { PracticeThemeGenerator } from "@/components/PracticeThemeGenerator";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [essays, setEssays] = useState<Tables<"essays">[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const { status: subscriptionStatus, loading: subscriptionLoading } = useSubscription();

  useEffect(() => {
    // Check for checkout success/cancel
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success') {
      toast({
        title: "Assinatura realizada!",
        description: "Seu pagamento foi processado com sucesso. Aproveite seu novo plano!",
      });
      // Remove query param
      setSearchParams({});
    } else if (checkoutStatus === 'canceled') {
      toast({
        title: "Checkout cancelado",
        description: "Você cancelou o processo de checkout.",
        variant: "destructive",
      });
      // Remove query param
      setSearchParams({});
    }

    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        setLoading(false);
        return;
      }
      
      setUser(session.user);

      // Check if user is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);
      
      setIsAdmin(roles?.some(r => r.role === 'admin') || false);

      // Load profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Load user's essays
      const { data: essaysData } = await supabase
        .from('essays')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (essaysData) {
        setEssays(essaysData);
      }

      setLoading(false);
    };

    loadUserData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadUserData();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Redator
            </span>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button onClick={() => navigate("/admin")} variant="secondary" size="sm">
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button onClick={() => navigate("/settings")} variant="ghost" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Bem-vindo de volta, {user?.email?.split("@")[0]}!
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Escolha um tipo de correção para começar
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl">
          <Card className="p-4 sm:p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary group">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">ENEM</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Correção baseada nos critérios do ENEM com análise das 5 competências
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => navigate("/correcao/enem")}
              >
                Corrigir Redação ENEM
              </Button>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-secondary group">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary/10 rounded-xl flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Vestibular Tradicional</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Correção focada em critérios de vestibulares tradicionais e dissertação
                </p>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate("/correcao/vestibular")}
              >
                Corrigir Redação Vestibular
              </Button>
            </div>
          </Card>
        </div>

        <Card className="mt-8 p-4 sm:p-6 bg-gradient-card border-2">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{
              background: subscriptionStatus.plan === 'pro' ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' : 
                         subscriptionStatus.plan === 'standard' ? 'hsl(var(--primary) / 0.1)' : 
                         'hsl(var(--warning) / 0.1)'
            }}>
              {subscriptionStatus.plan === 'pro' ? (
                <Crown className="w-5 h-5 text-primary-foreground" />
              ) : subscriptionStatus.plan === 'standard' ? (
                <Zap className="w-5 h-5 text-primary" />
              ) : (
                <span className="text-2xl">✨</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-base sm:text-lg">
                  {subscriptionStatus.plan === 'pro' ? 'Plano Pro' : 
                   subscriptionStatus.plan === 'standard' ? 'Plano Standard' : 
                   'Plano Gratuito'}
                </h3>
                <Badge variant={subscriptionStatus.plan === 'pro' ? 'default' : subscriptionStatus.plan === 'standard' ? 'secondary' : 'outline'} className="text-xs">
                  {subscriptionStatus.plan === 'pro' ? 'Premium' : 
                   subscriptionStatus.plan === 'standard' ? 'Ativo' : 
                   'Free'}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                {subscriptionStatus.plan === 'pro' ? (
                  <>✨ Correções ilimitadas • Análise avançada com IA • Leitura de PDFs • Suporte VIP 24/7</>
                ) : subscriptionStatus.plan === 'standard' ? (
                  <>⚡ 10 correções por dia • Análise detalhada • Histórico completo • Suporte prioritário</>
                ) : (
                  <>Você tem 1 correção gratuita por dia. Atualize para ter mais correções e recursos exclusivos!</>
                )}
              </p>
              {profile && (
                <p className="text-xs text-muted-foreground mb-3">
                  <span className="font-medium">{profile.daily_corrections_used || 0}</span> correções usadas hoje
                  {subscriptionStatus.plan === 'free' && ` • ${Math.max(0, 1 - (profile.daily_corrections_used || 0))} restante`}
                  {subscriptionStatus.plan === 'standard' && ` • ${Math.max(0, 10 - (profile.daily_corrections_used || 0))} restantes`}
                  {subscriptionStatus.plan === 'pro' && ' • ilimitadas'}
                </p>
              )}
              {subscriptionStatus.subscription_end && (
                <p className="text-xs text-muted-foreground mb-3">
                  Renovação: {new Date(subscriptionStatus.subscription_end).toLocaleDateString('pt-BR')}
                </p>
              )}
              {subscriptionStatus.plan === 'free' ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate("/settings?tab=plan")}
                >
                  Ver Planos
                </Button>
              ) : subscriptionStatus.subscribed ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/settings?tab=plan")}
                >
                  Gerenciar Assinatura
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Plano atribuído pelo administrador
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Premium Features: Insights and Practice Themes */}
        {(subscriptionStatus.plan === 'standard' || subscriptionStatus.plan === 'pro') && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <InsightsPanel />
            <PracticeThemeGenerator />
          </div>
        )}

        {essays.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">Redações Anteriores</h2>
            </div>
            <div className="grid gap-4">
              {essays.map((essay) => (
                <Card key={essay.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{essay.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${
                          essay.status === 'corrected' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {essay.status === 'corrected' ? 'Corrigida' : 'Pendente'}
                        </span>
                      </div>
                      {essay.theme && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Tema: {essay.theme}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {essay.essay_type === 'enem' ? 'ENEM' : 'Vestibular'} • {
                          new Date(essay.created_at!).toLocaleDateString('pt-BR')
                        }
                      </p>
                      {essay.score && (
                        <p className="text-sm font-semibold text-primary mt-2">
                          Nota: {essay.score}/{essay.essay_type === 'enem' ? '1000' : '100'}
                        </p>
                      )}
                    </div>
                    {essay.status === 'corrected' && essay.correction_result && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Navigate to correction page with pre-loaded data
                          navigate(`/correcao/${essay.essay_type}`, { 
                            state: { 
                              essayData: essay,
                              correction: essay.correction_result 
                            } 
                          });
                        }}
                      >
                        Ver Correção
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
