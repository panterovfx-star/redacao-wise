import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { GraduationCap } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-hero rounded-2xl mb-4 shadow-glow">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
            Redator
          </h1>
          <p className="text-muted-foreground">
            Correção inteligente de redações
          </p>
        </div>
        
        <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(262 83% 58%)',
                    brandAccent: 'hsl(220 70% 50%)',
                  },
                },
              },
            }}
            providers={[]}
            redirectTo={`${window.location.origin}/dashboard`}
          />
          <p className="text-xs text-muted-foreground text-center mt-4">
            Ao continuar, você concorda com nossos{" "}
            <a href="/termos" className="underline hover:text-foreground">Termos de Uso</a>
            {" "}e{" "}
            <a href="/privacidade" className="underline hover:text-foreground">Política de Privacidade</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
