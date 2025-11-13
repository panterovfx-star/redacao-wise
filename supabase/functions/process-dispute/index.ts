import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { disputeId, action, adminNotes } = await req.json();

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

      // Call correct-essay function to recorrect
      const { data: correctionResult, error: correctionError } = await supabaseClient.functions.invoke(
        'correct-essay',
        {
          body: {
            essayId: essay.id,
            essayContent: essay.content,
            essayType: essay.essay_type,
            theme: essay.theme,
          },
        }
      );

      if (correctionError) {
        console.error('Error recorrecting essay:', correctionError);
        // Don't throw here, the dispute is already updated
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Dispute approved but recorrection failed. Please try manually.',
            recorrectionError: correctionError.message 
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action,
          message: 'Dispute approved and essay recorrected successfully',
          correctionResult 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, action }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error processing dispute:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});