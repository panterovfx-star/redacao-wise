import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const processDisputeSchema = z.object({
  disputeId: z.string().uuid(),
  action: z.enum(['approved', 'rejected'], { errorMap: () => ({ message: "Ação inválida" }) }),
  adminNotes: z.string().max(2000, "Notas muito longas").optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validationResult = processDisputeSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Dados inválidos',
          details: validationResult.error.errors.map(e => e.message).join(', ')
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const { disputeId, action, adminNotes } = validationResult.data;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin') || false;

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get dispute details
    const { data: dispute, error: disputeError } = await supabaseClient
      .from('essay_disputes')
      .select(`
        *,
        essays:essay_id (
          id,
          content,
          essay_type,
          theme,
          user_id
        )
      `)
      .eq('id', disputeId)
      .single();

    if (disputeError || !dispute) {
      return new Response(JSON.stringify({ error: 'Dispute not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update dispute status
    const { error: updateDisputeError } = await supabaseClient
      .from('essay_disputes')
      .update({
        status: action,
        admin_id: user.id,
        admin_notes: adminNotes || null,
      })
      .eq('id', disputeId);

    if (updateDisputeError) {
      throw updateDisputeError;
    }

    // If approved, update essay status to pending and trigger recorrection
    if (action === 'approved' && dispute.essays) {
      const essay = dispute.essays;

      // Update essay status to pending
      const { error: updateEssayError } = await supabaseClient
        .from('essays')
        .update({ status: 'pending' })
        .eq('id', essay.id);

      if (updateEssayError) {
        throw updateEssayError;
      }

      // Call correct-essay function to recorrect using direct HTTP call
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const correctionResponse = await fetch(
          `${supabaseUrl}/functions/v1/correct-essay`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.get('Authorization')!,
            },
            body: JSON.stringify({
              essayId: essay.id,
              essayContent: essay.content,
              essayType: essay.essay_type,
              theme: essay.theme,
            }),
          }
        );

        if (!correctionResponse.ok) {
          const errorText = await correctionResponse.text();
          console.error('Error recorrecting essay:', errorText);
          // Don't throw here, the dispute is already updated
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Disputa aprovada mas a recorreção falhou. Por favor, tente manualmente.',
              recorrectionError: errorText 
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const correctionResult = await correctionResponse.json();

        return new Response(
          JSON.stringify({ 
            success: true, 
            action,
            message: 'Disputa aprovada e redação recorrigida com sucesso',
            correctionResult 
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (recorrectionError: any) {
        console.error('Error recorrecting essay:', recorrectionError);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Disputa aprovada mas a recorreção falhou. Por favor, tente manualmente.',
            recorrectionError: recorrectionError.message 
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

    }

    return new Response(
      JSON.stringify({ success: true, action }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Erro ao processar contestação' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});