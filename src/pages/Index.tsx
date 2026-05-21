import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Check, Zap, Crown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const Index = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const plans = [
    {
      name: "Gratuito",
      monthlyPrice: "R$ 0",
      yearlyPrice: "R$ 0",
      period: "/mês",
      description: "Perfeito para testar",
      features: [
        "1 correção por dia",
        "Análise básica ENEM ou Vestibular",
        "Nota e comentários gerais",
      ],
      icon: Check,
      cta: "Começar Grátis",
      variant: "outline" as const,
      monthlyPriceId: null,
      yearlyPriceId: null,
      enableTrial: false,
    },
    {
      name: "Standard",
      monthlyPrice: "R$ 24,99",
      yearlyPrice: "R$ 18,99",
      period: "/mês",
      description: "Para quem estuda regularmente",
      features: [
        "3 correções por dia",
        "Análise detalhada ENEM ou Vestibular",
        "Sugestões de melhoria",
        "Histórico completo",
      ],
      icon: Zap,
      cta: "Assinar Standard",
      variant: "secondary" as const,
      popular: true,
      monthlyPriceId: "price_1STkM7E5NFVDm9roTCIwJf5W",
      yearlyPriceId: "price_1STkZAE5NFVDm9roVr49VuX9",
      enableTrial: false,
    },
    {
      name: "Pro",
      monthlyPrice: "R$ 39,99",
      yearlyPrice: "R$ 32,99",
      period: "/mês",
      badge: "7 dias grátis",
      description: "Para máximo desempenho",
      features: [
        "Correções ilimitadas",
        "Upload de PDF direto",
        "Análise avançada com IA",
        "Comparação de desempenho",
        "Suporte prioritário",
      ],
      icon: Crown,
      cta: "Começar Teste Grátis",
      variant: "default" as const,
      highlight: true,
      monthlyPriceId: "price_1STkM8E5NFVDm9roVBCy0fxh",
      yearlyPriceId: "price_1STkZBE5NFVDm9roKbmraGcl",
      enableTrial: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Hero Section */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center shadow-glow">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Redator
            </span>
          </div>
          <div className="flex gap-1 sm:gap-2">
            <Button variant="ghost" onClick={() => navigate("/auth")} size="sm" className="text-xs sm:text-sm px-2 sm:px-4">
              Entrar
            </Button>
            <Button onClick={() => navigate("/auth")} size="sm" className="text-xs sm:text-sm px-2 sm:px-4">
              Começar Grátis
            </Button>
          </div>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Correção com Inteligência Artificial
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Aprimore suas redações com{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              correção inteligente
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Sistema especializado em correção de redações ENEM e vestibulares tradicionais. 
            Receba feedback detalhado e melhore sua escrita com inteligência artificial.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 shadow-glow"
            >
              Começar Agora
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })}
              className="text-lg px-8"
            >
              Ver Planos
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Card className="p-8 hover:shadow-xl transition-all border-2 hover:border-primary/50">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Correção ENEM</h3>
            <p className="text-muted-foreground">
              Análise completa baseada nas 5 competências do ENEM. Receba pontuação 
              detalhada e sugestões específicas para cada critério avaliado.
            </p>
          </Card>

          <Card className="p-8 hover:shadow-xl transition-all border-2 hover:border-secondary/50">
            <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Vestibular Tradicional</h3>
            <p className="text-muted-foreground">
              Correção focada em critérios de vestibulares tradicionais com análise 
              de estrutura dissertativa, argumentação e coesão textual.
            </p>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Escolha seu plano
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Do iniciante ao expert, temos o plano perfeito para você
          </p>
          
          <div className="flex items-center justify-center gap-3 mt-8">
            <Label htmlFor="billing-toggle" className={!isYearly ? "font-semibold" : ""}>
              Mensal
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <Label htmlFor="billing-toggle" className={isYearly ? "font-semibold" : ""}>
              Anual
              <Badge variant="secondary" className="ml-2">Economize até 24%</Badge>
            </Label>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const currentPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const currentPriceId = isYearly ? plan.yearlyPriceId : plan.monthlyPriceId;
            
            return (
            <Card
              key={plan.name}
              className={`p-8 relative ${
                plan.highlight
                  ? "border-2 border-primary shadow-glow scale-105"
                  : "border-2 hover:border-primary/50"
              } transition-all hover:shadow-xl`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Mais Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <plan.icon className="w-12 h-12 mx-auto mb-4 text-primary" />
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  {plan.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {plan.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">{currentPrice}</span>
                  <span className="text-muted-foreground">{isYearly ? "/ano" : plan.period}</span>
                </div>
                {isYearly && plan.name !== "Gratuito" && (
                  <p className="text-sm text-muted-foreground mt-1">
                    12x de {currentPrice}
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.variant}
                size="lg"
                onClick={() => {
                  if (currentPriceId) {
                    navigate("/auth");
                  } else {
                    navigate("/auth");
                  }
                }}
              >
                {plan.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="p-12 bg-gradient-hero text-primary-foreground text-center max-w-4xl mx-auto border-0 shadow-glow">
          <h2 className="text-4xl font-bold mb-4">
            Pronto para melhorar suas redações?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Comece gratuitamente hoje e veja a diferença que uma correção 
            inteligente pode fazer no seu desempenho.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("/auth")}
            className="text-lg px-8"
          >
            Criar Conta Grátis
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground space-y-2">
          <div className="flex items-center justify-center gap-4 text-sm">
            <a href="/termos" className="hover:text-foreground transition-colors">Termos de Uso</a>
            <span>•</span>
            <a href="/privacidade" className="hover:text-foreground transition-colors">Política de Privacidade</a>
          </div>
          <p>© 2026 Redator. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
