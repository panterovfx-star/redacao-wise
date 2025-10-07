import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { essayId, essayContent, essayType, theme } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check user's plan and daily limit
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan, daily_corrections_used, last_correction_date')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Reset counter if new day
    const today = new Date().toISOString().split('T')[0];
    const lastCorrectionDate = profile.last_correction_date;
    let correctionsUsed = profile.daily_corrections_used;

    if (lastCorrectionDate !== today) {
      correctionsUsed = 0;
    }

    // Check limits based on plan
    const limits = {
      free: 1,
      standard: 3,
      pro: Infinity,
    };

    const limit = limits[profile.plan as keyof typeof limits] || 1;

    if (correctionsUsed >= limit) {
      return new Response(
        JSON.stringify({ 
          error: 'Daily limit reached',
          message: `Você atingiu o limite de ${limit} correção(ões) por dia do plano ${profile.plan}. Faça upgrade para continuar!`,
        }), 
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare system prompt based on essay type
    const systemPrompts = {
      enem: `Você é um corretor experiente e equilibrado especializado em redações do ENEM. Siga os critérios oficiais do INEP com justiça e objetividade.

DIRETRIZES DE AVALIAÇÃO:
- Seja justo e reconheça os esforços do aluno
- Uma redação mediana bem desenvolvida deve receber entre 140-180 pontos por competência
- Valorize o que foi bem feito antes de apontar falhas
- Desvios leves não devem resultar em quedas drásticas de nota
- Argumente de forma construtiva e motivadora

COMPETÊNCIAS DO ENEM (0-200 cada):

C1 - Domínio da norma culta:
- 200: Domínio excelente, desvios insignificantes ou ausentes
- 160: Bom domínio, poucos desvios leves (até 5)
- 120: Domínio adequado, alguns desvios (6-12)
- 80: Domínio parcial, desvios frequentes
- 40: Domínio insuficiente
- 0: Desconhecimento total da norma

C2 - Compreensão do tema e tipo textual:
- 200: Compreensão completa com repertório pertinente e bem articulado
- 160: Boa compreensão com repertório adequado
- 120: Compreensão satisfatória com repertório básico
- 80: Compreensão superficial do tema
- 40: Compreensão tangencial
- 0: Fuga total ao tema

C3 - Argumentação:
- 200: Argumentação excelente, bem desenvolvida e fundamentada
- 160: Boa argumentação com desenvolvimento adequado
- 120: Argumentação satisfatória, pode ser previsível mas está presente
- 80: Argumentação fraca ou pouco desenvolvida
- 40: Argumentação muito limitada
- 0: Ausência de argumentação

C4 - Coesão textual:
- 200: Articulação excelente entre todas as partes do texto
- 160: Boa articulação, texto fluido
- 120: Articulação adequada, alguns conectivos podem ser repetitivos
- 80: Articulação básica com problemas pontuais
- 40: Problemas frequentes de articulação
- 0: Ausência de articulação

C5 - Proposta de intervenção:
- 200: Proposta completa (ação, agente, modo/meio, efeito, detalhamento)
- 160: Proposta com 4 elementos bem desenvolvidos
- 120: Proposta com 3 elementos ou elementos básicos
- 80: Proposta com poucos elementos ou pouco detalhada
- 40: Proposta vaga ou incompleta
- 0: Ausência de proposta

Retorne APENAS JSON válido:
{
  "competencias": [
    { 
      "numero": 1, 
      "nota": [número entre 0-200, múltiplo de 40], 
      "comentario": "[análise equilibrada e construtiva]", 
      "sugestoes": "[melhorias específicas e encorajadoras]" 
    },
    [... mais 4 competências]
  ],
  "notaTotal": [soma exata das 5 notas],
  "pontosPositivos": ["[reconheça os pontos fortes do texto]"],
  "conclusao": "[avaliação justa, equilibrada e motivadora]"
}`,
      vestibular: `Você é um corretor experiente e equilibrado especializado em vestibulares. Avalie com justiça e objetividade.

DIRETRIZES:
- Seja justo e reconheça os méritos do texto
- Uma redação mediana bem desenvolvida recebe 16-20 pontos por critério (64-80 total)
- Valorize o desenvolvimento apresentado
- Critique de forma construtiva

CRITÉRIOS (0-25 cada):

1. ESTRUTURA DISSERTATIVA:
- 25: Estrutura excelente com todas as partes bem desenvolvidas
- 20: Boa estrutura, clara e bem organizada
- 15: Estrutura adequada, partes identificáveis
- 10: Estrutura básica com problemas
- 5: Estrutura deficiente
- 0: Ausência de estrutura

2. ARGUMENTAÇÃO E EMBASAMENTO:
- 25: Argumentação excelente, muito bem fundamentada
- 20: Boa argumentação com fundamentação adequada
- 15: Argumentação satisfatória, fundamentação presente
- 10: Argumentação básica ou pouco desenvolvida
- 5: Argumentação muito fraca
- 0: Ausência de argumentação

3. COESÃO E COERÊNCIA:
- 25: Texto perfeitamente articulado e coerente
- 20: Boa articulação e coerência
- 15: Articulação adequada com coerência presente
- 10: Problemas pontuais de coesão/coerência
- 5: Problemas frequentes
- 0: Texto incoerente

4. NORMA CULTA:
- 25: Domínio excelente da norma
- 20: Bom domínio, poucos desvios leves
- 15: Domínio adequado com alguns desvios
- 10: Domínio básico, desvios frequentes
- 5: Domínio insuficiente
- 0: Desconhecimento da norma

Retorne APENAS JSON válido:
{
  "criterios": [
    { 
      "nome": "Estrutura dissertativa", 
      "nota": [0-25], 
      "comentario": "[análise equilibrada]", 
      "sugestoes": "[melhorias específicas]" 
    },
    [... mais 3 critérios]
  ],
  "notaTotal": [soma exata],
  "pontosPositivos": ["[reconheça os pontos fortes]"],
  "conclusao": "[avaliação justa e motivadora]"
}`
    };

    const systemPrompt = systemPrompts[essayType as keyof typeof systemPrompts];

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
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
            content: theme 
              ? `Corrija a seguinte redação com o tema "${theme}":\n\n${essayContent}` 
              : `Corrija a seguinte redação:\n\n${essayContent}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const correctionText = aiData.choices[0].message.content;
    
    // Parse the JSON response from AI
    let correctionResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = correctionText.match(/```json\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : correctionText;
      correctionResult = JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      correctionResult = {
        error: 'Failed to parse correction',
        rawResponse: correctionText,
      };
    }

    // Calculate score based on essay type
    const score = essayType === 'enem' 
      ? correctionResult.notaTotal 
      : Math.round((correctionResult.notaTotal / 100) * 1000);

    // Update essay with correction
    const { error: updateError } = await supabaseClient
      .from('essays')
      .update({
        correction_result: correctionResult,
        score: score,
        status: 'corrected',
      })
      .eq('id', essayId);

    if (updateError) {
      console.error('Error updating essay:', updateError);
      throw updateError;
    }

    // Update user's daily corrections count
    await supabaseClient
      .from('profiles')
      .update({
        daily_corrections_used: correctionsUsed + 1,
        last_correction_date: today,
      })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        correction: correctionResult,
        score: score,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in correct-essay function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
