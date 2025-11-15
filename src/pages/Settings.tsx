import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, ArrowLeft, User, CreditCard, Settings as SettingsIcon, Check, Crown, Moon, Sun, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";
import { useTheme } from "@/components/ThemeProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Settings = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const { theme, setTheme } = useTheme();
  const { status: subscriptionStatus, createCheckout, openCustomerPortal } = useSubscription();

  const PLAN_PRICES: Record<string, string> = {
    free: "R$ 0/mês",
    standard: "R$ 29,90/mês",
    pro: "R$ 59,90/mês",
  };

  const PLAN_PRICE_IDS: Record<string, string> = {
    standard: 'price_1SFkWeE0zB1huP7q9QnjnTq8',
    pro: 'price_1SFkWoE0zB1huP7qh4vZSf6G'
  };

  useEffect(() => {
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
        setFullName(profileData.full_name || "");
        setBio(profileData.bio || "");
        setAvatarUrl(profileData.avatar_url || "");
        if (profileData.theme_preference) {
          setTheme(profileData.theme_preference as "light" | "dark" | "system");
        }
      }

      setLoading(false);
    };

    loadProfile();
  }, [navigate, searchParams, setSearchParams, toast, setTheme]);

  const handleUpdateProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('profiles')
      .update({ 
        email,
        full_name: fullName,
        bio: bio,
        avatar_url: avatarUrl,
      })
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

  const handleSubscribe = async (planName: string, withTrial: boolean = false) => {
    const planKey = planName.toLowerCase();
    const priceId = PLAN_PRICE_IDS[planKey];
    
    if (!priceId) {
      toast({
        title: "Erro",
        description: "Plano não encontrado.",
        variant: "destructive",
      });
      return;
    }

    await createCheckout(priceId, withTrial);
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Atenção",
      description: "Tem certeza que deseja excluir sua conta? Esta ação é irreversível.",
      variant: "destructive",
    });
  };

  const handleSavePreferences = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('profiles')
      .update({ 
        theme_preference: theme,
      })
      .eq('user_id', session.user.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar preferências.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Preferências salvas!",
      description: "Suas preferências foram atualizadas com sucesso.",
    });
  };

  const handleThemeChange = async (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    
    // Save to database immediately
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('profiles')
      .update({ theme_preference: newTheme })
      .eq('user_id', session.user.id);

    if (error) {
      toast({
        title: "Erro ao salvar tema",
        description: "Não foi possível salvar sua preferência de tema.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Tema atualizado!",
      description: `Tema alterado para ${newTheme === 'light' ? 'claro' : newTheme === 'dark' ? 'escuro' : 'sistema'}.`,
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
      enableTrial: false,
    },
    {
      name: "Standard",
      price: "R$ 24,99",
      period: "/mês",
      features: [
        "10 correções por dia",
        "Correção ENEM e Vestibular",
        "Análise detalhada",
        "Histórico completo",
        "Suporte prioritário",
        "Insights de desempenho",
        "Simulados de treino",
      ],
      current: subscriptionStatus.plan === "standard",
      buttonText: subscriptionStatus.plan === "standard" ? "Plano Atual" : "Assinar",
      popular: true,
      enableTrial: false,
    },
    {
      name: "Pro",
      price: "R$ 39,99",
      period: "/mês",
      badge: "7 dias grátis",
      features: [
        "Correções ilimitadas",
        "Correção ENEM e Vestibular",
        "Análise completa com IA avançada",
        "Leitura de imagens e PDFs",
        "Histórico ilimitado",
        "Suporte VIP 24/7",
        "Insights de desempenho",
        "Simulados de treino",
        "Relatórios de evolução",
      ],
      current: subscriptionStatus.plan === "pro",
      buttonText: subscriptionStatus.plan === "pro" ? "Plano Atual" : "Começar Teste Grátis",
      trial: true,
      enableTrial: true,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getInitials = () => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="px-2 sm:px-3">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Voltar</span>
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
              
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={avatarUrl} alt={fullName || email} />
                    <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label htmlFor="avatar">URL da Foto de Perfil</Label>
                    <Input
                      id="avatar"
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://exemplo.com/foto.jpg"
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Cole a URL de uma imagem online
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullname">Nome Completo</Label>
                    <Input
                      id="fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Conte um pouco sobre você..."
                    rows={4}
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {bio.length}/300 caracteres
                  </p>
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
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        {plan.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {plan.badge}
                          </Badge>
                        )}
                      </div>
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
                      onClick={() => !plan.current && !plan.disabled && handleSubscribe(plan.name, plan.enableTrial || false)}
                    >
                      {plan.buttonText}
                    </Button>
                    {plan.enableTrial && !plan.current && (
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        Cancele a qualquer momento durante o período de teste
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Informações de Pagamento</h3>
              
              {subscriptionStatus.subscribed && subscriptionStatus.subscription_end && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">Próxima renovação</p>
                  <p className="text-lg font-bold">
                    {new Date(subscriptionStatus.subscription_end).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sua assinatura será renovada automaticamente
                  </p>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground mb-4">
                {subscriptionStatus.subscribed 
                  ? "Gerencie sua assinatura e métodos de pagamento através do portal do cliente." 
                  : profile?.manual_plan_override 
                  ? "Seu plano foi atribuído manualmente por um administrador."
                  : (subscriptionStatus.plan === "standard" || subscriptionStatus.plan === "pro")
                  ? "Configure seu método de pagamento através do portal do cliente."
                  : "Seu pagamento é processado de forma segura através do Stripe."}
              </p>
              {(subscriptionStatus.subscribed || subscriptionStatus.plan === "standard" || subscriptionStatus.plan === "pro") && !profile?.manual_plan_override ? (
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
              <h2 className="text-xl font-bold mb-6">Aparência</h2>
              
              <div className="space-y-6 max-w-md">
                <div className="space-y-3">
                  <Label>Tema</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      className="flex flex-col gap-2 h-auto py-3"
                      onClick={() => handleThemeChange("light")}
                    >
                      <Sun className="w-5 h-5" />
                      <span className="text-xs">Claro</span>
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      className="flex flex-col gap-2 h-auto py-3"
                      onClick={() => handleThemeChange("dark")}
                    >
                      <Moon className="w-5 h-5" />
                      <span className="text-xs">Escuro</span>
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      className="flex flex-col gap-2 h-auto py-3"
                      onClick={() => handleThemeChange("system")}
                    >
                      <Monitor className="w-5 h-5" />
                      <span className="text-xs">Sistema</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Notificações</h2>
              
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
