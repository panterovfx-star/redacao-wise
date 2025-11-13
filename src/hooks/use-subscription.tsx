import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionStatus {
  subscribed: boolean;
  plan: string;
  subscription_end?: string | null;
}

export const useSubscription = () => {
  const [status, setStatus] = useState<SubscriptionStatus>({ 
    subscribed: false, 
    plan: 'free' 
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus({ subscribed: false, plan: 'free' });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }

      if (data) {
        setStatus({
          subscribed: data.subscribed,
          plan: data.plan,
          subscription_end: data.subscription_end
        });
      }
    } catch (error) {
      console.error('Error in checkSubscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (priceId: string, enableTrial: boolean = false) => {
    try {
      console.log('Creating checkout for price:', priceId);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, enableTrial }
      });

      console.log('Checkout response:', { data, error });

      if (error) {
        console.error('Checkout error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('Redirecting to checkout URL:', data.url);
        // Use location.href instead of window.open for better mobile compatibility
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Erro ao criar checkout",
        description: error.message || "Não foi possível criar a sessão de checkout. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        console.error('Customer portal error:', error);
        throw new Error(error.message || "Erro ao acessar o portal");
      }

      if (data?.error) {
        // Handle error from the edge function
        if (data.error.includes("No Stripe customer found")) {
          toast({
            title: "Cadastro necessário",
            description: "Você precisa realizar uma assinatura primeiro. Por favor, escolha um plano acima.",
            variant: "destructive",
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      if (data?.url) {
        // Use location.href instead of window.open for better mobile compatibility
        window.location.href = data.url;
      } else {
        throw new Error("URL do portal não recebida");
      }
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Erro ao abrir portal",
        description: error.message || "Não foi possível abrir o portal de gerenciamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkSubscription();

    // Check subscription on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkSubscription();
      }
    });

    // Refresh subscription status every minute
    const interval = setInterval(checkSubscription, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    status,
    loading,
    checkSubscription,
    createCheckout,
    openCustomerPortal
  };
};
