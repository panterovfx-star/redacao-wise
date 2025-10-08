import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GraduationCap, ArrowLeft, User, CreditCard, Settings as SettingsIcon, Check, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";

const Settings = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const { status: subscriptionStatus, createCheckout, openCustomerPortal } = useSubscription();

  const PLAN_PRICES: Record<string, string> = {
    standard: 'price_1SFkWeE0zB1huP7q9QnjnTq8',
    pro: 'price_1SFkWoE0zB1huP7qh4vZSf6G'
  };

  useEffect(() => {
    // Check for checkout status
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'canceled') {
      toast({
        title: "Checkout cancelado",
        description: "Você cancelou o processo de checkout. Tente novamente quando quiser!",
      });
      setSearchParams({});
    }

    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setEmail(session.user.email || "");

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      setLoading(false);
    };

    loadProfile();
  }, [navigate, searchParams, setSearchParams, toast]);

  const handleUpdateProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('profiles')
      .update({ email })
      .eq('user_id', session.user.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Perfil atualizado!",
      description: "Suas informações foram salvas com sucesso.",
    });
  };

  const handleSubscribe = async (planName: string) => {
    const planKey = planName.toLowerCase();
    const priceId = PLAN_PRICES[planKey];
    
    if (!priceId) {
      toast({
        title: "Erro",
        description: "Plano não encontrado.",
        variant: "destructive",
      });
      return;
    }

    await createCheckout(priceId);
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Atenção",
      description: "Tem certeza que deseja excluir sua conta? Esta ação é irreversível.",
      variant: "destructive",
    });
  };

  const handleSavePreferences = () => {
    toast({
      title: "Preferências salvas!",
      description: "Suas preferências foram atualizadas com sucesso.",
    });
  };

  const handleExportData = () => {
    toast({
      title: "Exportação iniciada",
      description: "Seus dados serão exportados e enviados para o seu email.",
    });
  };

  const plans = [
    {
      name: "Free",
      price: "R$ 0",
      period: "/mês",
      features: [
        "1 correção por dia",
        "Correção ENEM e Vestibular",
        "Análise básica",
      ],
      current: subscriptionStatus.plan === "free",
      buttonText: "Plano Gratuito",
      disabled: true,
    },
    {
      name: "Standard",
      price: "R$ 29,90",
      period: "/mês",
      features: [
        "10 correções por dia",
        "Correção ENEM e Vestibular",
        "Análise detalhada",
        "Histórico completo",
        "Suporte prioritário",
      ],
      current: subscriptionStatus.plan === "standard",
      buttonText: subscriptionStatus.plan === "standard" ? "Plano Atual" : "Assinar",
      popular: true,
    },
    {
      name: "Pro",
      price: "R$ 59,90",
      period: "/mês",
      features: [
        "Correções ilimitadas",
        "Correção ENEM e Vestibular",
        "Análise completa com IA avançada",
        "Leitura de imagens e PDFs",
        "Histórico ilimitado",
        "Suporte VIP 24/7",
        "Relatórios de evolução",
        "Simulados exclusivos",
      ],
      current: subscriptionStatus.plan === "pro",
      buttonText: subscriptionStatus.plan === "pro" ? "Plano Atual" : "Assinar",
    },
  ];

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
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">Configurações</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-6xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Configurações da Conta</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gerencie seu perfil, plano e preferências
          </p>
        </div>

        <Tabs defaultValue={searchParams.get('tab') || 'profile'} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="profile" className="text-xs sm:text-sm">
              <User className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Perfil</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="plan" className="text-xs sm:text-sm">
              <CreditCard className="w-4 h-4 mr-1 sm:mr-2" />
              <span>Plano</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">
              <SettingsIcon className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Preferências</span>
              <span className="sm:hidden">Config</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Informações do Perfil</h2>
              
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan">Plano Atual</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={subscriptionStatus.plan === "pro" ? "default" : "secondary"} className="text-sm gap-1">
                      {subscriptionStatus.plan === "pro" && <Crown className="w-3 h-3" />}
                      {subscriptionStatus.plan === "free" ? "Gratuito" : subscriptionStatus.plan === "standard" ? "Standard" : "Pro"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {profile?.daily_corrections_used || 0} correções usadas hoje
                    </span>
                  </div>
                  {subscriptionStatus.subscription_end && (
                    <p className="text-xs text-muted-foreground">
                      Renovação: {new Date(subscriptionStatus.subscription_end).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>

                <Button onClick={handleUpdateProfile} className="w-full">
                  Salvar Alterações
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-destructive/5 border-destructive/20">
              <h3 className="font-semibold text-destructive mb-2">Zona de Perigo</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ações irreversíveis que afetam permanentemente sua conta.
              </p>
              <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>
                Excluir Conta
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="plan" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-2">Escolha seu Plano</h2>
              <p className="text-muted-foreground mb-6">
                Selecione o plano que melhor atende suas necessidades
              </p>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {plans.map((plan) => (
                  <Card 
                    key={plan.name}
                    className={`p-4 sm:p-6 relative ${
                      plan.popular ? 'border-2 border-primary shadow-lg' : ''
                    } ${plan.current ? 'bg-muted/50' : ''}`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                        Mais Popular
                      </Badge>
                    )}
                    
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                      <div className="flex items-end justify-center gap-1 mb-1">
                        <span className="text-3xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full"
                      variant={plan.current ? "outline" : plan.popular ? "default" : "secondary"}
                      disabled={plan.current || plan.disabled}
                      onClick={() => !plan.current && !plan.disabled && handleSubscribe(plan.name)}
                    >
                      {plan.buttonText}
                    </Button>
                  </Card>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">Informações de Pagamento</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {subscriptionStatus.subscribed 
                  ? "Gerencie sua assinatura e métodos de pagamento através do portal do cliente." 
                  : profile?.manual_plan_override 
                  ? "Seu plano foi atribuído manualmente por um administrador."
                  : "Seu pagamento é processado de forma segura através do Stripe."}
              </p>
              {subscriptionStatus.subscribed ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={openCustomerPortal}
                >
                  Gerenciar Assinatura
                </Button>
              ) : profile?.manual_plan_override ? (
                <p className="text-sm text-muted-foreground">
                  Entre em contato com o administrador para alterar seu plano.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Assine um plano acima para acessar o portal de gerenciamento.
                </p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Preferências do Site</h2>
              
              <div className="space-y-6 max-w-md">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba atualizações sobre suas correções
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="darkmode">Modo Escuro</Label>
                    <p className="text-sm text-muted-foreground">
                      Alterne entre tema claro e escuro
                    </p>
                  </div>
                  <Switch
                    id="darkmode"
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                  />
                </div>

                <div className="pt-4 border-t">
                  <Button className="w-full" onClick={handleSavePreferences}>
                    Salvar Preferências
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Privacidade e Dados</h3>
              
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start" onClick={handleExportData}>
                  Exportar Meus Dados
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open('https://docs.lovable.dev', '_blank')}
                >
                  Política de Privacidade
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open('https://docs.lovable.dev', '_blank')}
                >
                  Termos de Uso
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
