import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Webhook do Stripe NÃO precisa de CORS (é server-to-server)
// Mas precisa ser público (verify_jwt = false)

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Mapa de product_id do Stripe -> plano interno
const PRODUCT_TO_PLAN: Record<string, string> = {
  prod_TC8oWcieQBUoiF: "standard",
  prod_TC8oku7tYI388q: "pro",
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    logStep("ERROR: Missing Stripe env vars");
    return new Response("Server misconfigured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    logStep("ERROR: Missing stripe-signature header");
    return new Response("Missing signature", { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    // IMPORTANTE: usar constructEventAsync no Deno (não o sync)
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR: Signature verification failed", { msg });
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        // Pega o customer_id do evento
        let customerId: string | null = null;
        let subscriptionId: string | null = null;

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          customerId = session.customer as string;
          subscriptionId = session.subscription as string;
        } else {
          const sub = event.data.object as Stripe.Subscription;
          customerId = sub.customer as string;
          subscriptionId = sub.id;
        }

        if (!customerId) {
          logStep("No customer id in event, skipping");
          break;
        }

        // Busca o email do customer no Stripe
        const customer = (await stripe.customers.retrieve(
          customerId
        )) as Stripe.Customer;

        if (customer.deleted || !customer.email) {
          logStep("Customer deleted or has no email", { customerId });
          break;
        }

        // Busca a subscription ativa
        let plan = "free";
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );
          if (subscription.status === "active" || subscription.status === "trialing") {
            const productId = subscription.items.data[0].price.product as string;
            plan = PRODUCT_TO_PLAN[productId] ?? "free";
          }
        }

        logStep("Updating profile", { email: customer.email, plan });

        // Atualiza pelo email (não temos relação direta customer_id <-> user_id)
        const { error } = await supabase
          .from("profiles")
          .update({ plan, manual_plan_override: false })
          .eq("email", customer.email);

        if (error) {
          logStep("ERROR updating profile", { error: error.message });
          throw error;
        }

        logStep("Profile updated successfully");
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customer = (await stripe.customers.retrieve(
          sub.customer as string
        )) as Stripe.Customer;

        if (customer.deleted || !customer.email) break;

        logStep("Subscription canceled, downgrading to free", {
          email: customer.email,
        });

        const { error } = await supabase
          .from("profiles")
          .update({ plan: "free", manual_plan_override: false })
          .eq("email", customer.email);

        if (error) {
          logStep("ERROR downgrading profile", { error: error.message });
          throw error;
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR processing event", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
