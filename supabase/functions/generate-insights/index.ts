import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// No additional input validation needed - this function takes no user input parameters

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check user's plan
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    if (!profile || (profile.plan !== 'standard' && profile.plan !== 'pro')) {
      return new Response(
        JSON.stringify({ error: 'Este recurso está disponível apenas para planos Standard e Pro' }), 
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get all corrected essays from user
    const { data: essays } = await supabaseClient
      .from('essays')
      .select('score, correction_result, essay_type, created_at')
      .eq('user_id', user.id)
      .eq('status', 'corrected')
      .order('created_at', { ascending: false });

    if (!essays || essays.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Você precisa ter pelo menos uma redação corrigida para gerar insights' }), 
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare data summary for AI
    const essaysSummary = essays.map(e => ({
      score: e.score,
      type: e.essay_type,
      date: e.created_at,
      competencies: e.correction_result?.competencies || e.correction_result?.criterios
    }));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Você é um especialista em análise de desempenho em redações. Analise o histórico de redações do aluno e forneça insights CONCRETOS e ACIONÁVEIS.

ESTRUTURA DA RESPOSTA (JSON):
{
  "overall_performance": {
    "average_score": número,
    "trend": "melhorando" | "estável" | "declinando",
    "total_essays": número
  },
  "strengths": [
    { "area": "nome da competência/critério", "description": "o que o aluno faz bem" }
  ],
  "weaknesses": [
    { "area": "nome da competência/critério", "description": "o que precisa melhorar", "priority": "alta" | "média" | "baixa" }
  ],
  "recommendations": [
    { "title": "título curto", "action": "ação específica que o aluno deve tomar" }
  ],
  "next_steps": "parágrafo motivador com próximos passos"
}

DIRETRIZES:
- Seja específico e prático
- Identifique padrões reais nos dados
- Priorize as 2-3 áreas mais importantes para melhorar
- Dê recomendações acionáveis (ex: "pratique conectivos de conclusão" ao invés de "melhore a conclusão")
- Seja encorajador mas honesto
- Compare o desempenho ao longo do tempo`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Analise o histórico de redações deste aluno e gere insights detalhados:\n\n${JSON.stringify(essaysSummary, null, 2)}` 
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em alguns minutos.' }), 
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const insightsText = data.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = insightsText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse insights response');
    }

    const insights = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ insights }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar insights';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
