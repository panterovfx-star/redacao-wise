import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, LogOut, FileText, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
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
              RedaçãoIA
            </span>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Bem-vindo de volta, {user?.email?.split("@")[0]}!
          </h1>
          <p className="text-muted-foreground">
            Escolha um tipo de correção para começar
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary group">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">ENEM</h3>
                <p className="text-muted-foreground text-sm">
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

          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-secondary group">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Vestibular Tradicional</h3>
                <p className="text-muted-foreground text-sm">
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

        <Card className="mt-8 p-6 bg-gradient-card border-2">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">✨</span>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Plano Gratuito</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Você tem 1 correção gratuita por dia. Atualize para ter mais correções e recursos exclusivos!
              </p>
              <Button variant="outline" size="sm">
                Ver Planos
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
