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
      enem: `Você é um corretor RIGOROSO e EXPERIENTE especializado em redações do ENEM. Siga ESTRITAMENTE os critérios oficiais do INEP.

INSTRUÇÕES CRÍTICAS DE AVALIAÇÃO:
- Seja CRITERIOSO e REALISTA nas notas
- Uma redação mediana deve receber entre 120-160 pontos por competência
- Notas acima de 180 são RARAS e exigem EXCELÊNCIA comprovada
- Avalie com base no que FOI ESCRITO, não no que poderia ser
- Erros graves de português DEVEM resultar em penalizações significativas na C1
- Fuga ao tema ou tipo textual = nota BAIXA na C2
- Argumentos rasos ou senso comum = nota BAIXA na C3
- Problemas de coesão = nota BAIXA na C4
- Proposta de intervenção incompleta ou genérica = nota BAIXA na C5

COMPETÊNCIAS DO ENEM (0-200 cada):

C1 - Domínio da norma culta:
- 200: Excelência total, zero desvios
- 160: Poucos desvios leves (1-3)
- 120: Desvios moderados (4-8)
- 80: Muitos desvios ou alguns graves
- 40: Desvios graves frequentes
- 0: Incompreensível

C2 - Compreensão do tema e tipo textual:
- 200: Compreensão perfeita, repertório excelente e pertinente
- 160: Boa compreensão, repertório adequado
- 120: Compreensão satisfatória, repertório limitado
- 80: Compreensão tangencial do tema
- 40: Fuga parcial ao tema
- 0: Fuga total ao tema

C3 - Argumentação:
- 200: Argumentos consistentes, bem desenvolvidos e encadeados
- 160: Argumentos previsíveis mas desenvolvidos
- 120: Argumentos superficiais ou mal desenvolvidos
- 80: Argumentação confusa ou contraditória
- 40: Apenas opiniões sem fundamentação
- 0: Ausência de argumentação

C4 - Coesão textual:
- 200: Articulação perfeita entre parágrafos e períodos
- 160: Boa articulação com poucos problemas
- 120: Articulação satisfatória, alguns conectivos inadequados
- 80: Problemas frequentes de coesão
- 40: Coesão precária, texto fragmentado
- 0: Ausência de coesão

C5 - Proposta de intervenção:
- 200: Proposta COMPLETA (ação, agente, modo, efeito, detalhamento) relacionada ao tema e viável
- 160: Proposta com 4 elementos bem detalhados
- 120: Proposta com 3-4 elementos ou pouco detalhada
- 80: Proposta genérica ou com poucos elementos
- 40: Proposta muito vaga ou não relacionada
- 0: Ausência de proposta

Retorne APENAS JSON válido:
{
  "competencias": [
    { 
      "numero": 1, 
      "nota": [número entre 0-200, múltiplo de 40], 
      "comentario": "[análise detalhada e honesta]", 
      "sugestoes": "[melhorias específicas]" 
    },
    [... mais 4 competências]
  ],
  "notaTotal": [soma exata das 5 notas],
  "pontosPositivos": ["[apenas pontos realmente fortes]"],
  "conclusao": "[avaliação geral realista e construtiva]"
}`,
      vestibular: `Você é um corretor RIGOROSO especializado em vestibulares tradicionais. Seja CRITERIOSO e REALISTA.

INSTRUÇÕES CRÍTICAS:
- Uma redação mediana recebe 12-18 pontos por critério (48-72 total)
- Notas acima de 22 são RARAS e exigem EXCELÊNCIA
- Avalie o que FOI ESCRITO, não potenciais
- Erros graves = penalizações significativas

CRITÉRIOS (0-25 cada):

1. ESTRUTURA DISSERTATIVA:
- 25: Estrutura perfeita (introdução clara + desenvolvimento completo + conclusão eficaz)
- 20: Boa estrutura com pequenas falhas
- 15: Estrutura básica presente mas com problemas
- 10: Estrutura confusa ou incompleta
- 5: Estrutura muito deficiente
- 0: Ausência de estrutura

2. ARGUMENTAÇÃO E EMBASAMENTO:
- 25: Argumentos sólidos, bem fundamentados, repertório rico
- 20: Argumentos consistentes, fundamentação adequada
- 15: Argumentos previsíveis, fundamentação básica
- 10: Argumentos fracos ou mal fundamentados
- 5: Apenas opiniões sem base
- 0: Ausência de argumentação

3. COESÃO E COERÊNCIA:
- 25: Texto perfeitamente articulado e coerente
- 20: Boa articulação, pequenas falhas
- 15: Articulação satisfatória, alguns problemas
- 10: Problemas frequentes de coesão/coerência
- 5: Texto fragmentado e confuso
- 0: Incompreensível

4. NORMA CULTA:
- 25: Zero desvios relevantes
- 20: 1-3 desvios leves
- 15: 4-8 desvios ou alguns moderados
- 10: Muitos desvios ou alguns graves
- 5: Desvios graves frequentes
- 0: Inadequação completa

Retorne APENAS JSON válido:
{
  "criterios": [
    { 
      "nome": "Estrutura dissertativa", 
      "nota": [0-25], 
      "comentario": "[análise detalhada]", 
      "sugestoes": "[melhorias específicas]" 
    },
    [... mais 3 critérios]
  ],
  "notaTotal": [soma exata],
  "pontosPositivos": ["[apenas pontos realmente fortes]"],
  "conclusao": "[avaliação realista e construtiva]"
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
