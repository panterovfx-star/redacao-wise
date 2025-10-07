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
    const { essayId, essayContent, essayType } = await req.json();
    
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
      enem: `Você é um corretor especializado em redações do ENEM. Analise a redação seguindo as 5 competências do ENEM:

1. Domínio da modalidade escrita formal da língua portuguesa (0-200)
2. Compreensão da proposta de redação e aplicação de conceitos (0-200)
3. Seleção, relação e organização de argumentos (0-200)
4. Conhecimento dos mecanismos linguísticos de argumentação (0-200)
5. Proposta de intervenção (0-200)

Forneça:
- Nota para cada competência (0-200)
- Nota total (0-1000)
- Comentário detalhado sobre cada competência
- Sugestões específicas de melhoria
- Pontos positivos da redação

Retorne em formato JSON com a estrutura:
{
  "competencias": [
    { "numero": 1, "nota": 160, "comentario": "...", "sugestoes": "..." },
    ...
  ],
  "notaTotal": 800,
  "pontosPositivos": ["...", "..."],
  "conclusao": "..."
}`,
      vestibular: `Você é um corretor especializado em redações de vestibulares tradicionais. Analise a redação considerando:

1. Estrutura dissertativa (introdução, desenvolvimento, conclusão) (0-25)
2. Argumentação e embasamento (0-25)
3. Coesão e coerência textuais (0-25)
4. Uso da norma culta da língua portuguesa (0-25)

Forneça:
- Nota para cada critério (0-25)
- Nota total (0-100)
- Comentário detalhado sobre cada critério
- Sugestões específicas de melhoria
- Pontos positivos da redação

Retorne em formato JSON com a estrutura:
{
  "criterios": [
    { "nome": "Estrutura", "nota": 20, "comentario": "...", "sugestoes": "..." },
    ...
  ],
  "notaTotal": 85,
  "pontosPositivos": ["...", "..."],
  "conclusao": "..."
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
          { role: 'user', content: `Corrija a seguinte redação:\n\n${essayContent}` }
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
