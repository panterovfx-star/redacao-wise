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
    const { essayType } = await req.json();

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

    // Get user's previous themes to avoid repetition
    const { data: previousEssays } = await supabaseClient
      .from('essays')
      .select('theme')
      .eq('user_id', user.id)
      .limit(20);

    const usedThemes = previousEssays?.map(e => e.theme).filter(Boolean) || [];

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = essayType === 'enem' 
      ? `Você é um especialista em temas de redação do ENEM. Gere um tema ORIGINAL, ATUAL e RELEVANTE para uma redação dissertativa-argumentativa.

ESTRUTURA DA RESPOSTA (JSON):
{
  "theme": "Título do tema (conciso, 5-10 palavras)",
  "context": "Contextualização do tema em 2-3 parágrafos, incluindo dados relevantes e atualidades",
  "instructions": "Instruções específicas para a redação (similar ao ENEM)",
  "keywords": ["palavra1", "palavra2", "palavra3"]
}

CARACTERÍSTICAS DO TEMA:
- Deve ser de relevância social/cultural/política atual
- Permitir múltiplas perspectivas de análise
- Ter relação com direitos humanos, cidadania ou questões sociais
- Ser controverso o suficiente para debate, mas não polêmico demais
- Incluir dados ou estatísticas reais na contextualização
- Evitar temas já usados: ${usedThemes.join(', ')}`
      : `Você é um especialista em temas de redação para vestibulares tradicionais. Gere um tema ORIGINAL e DESAFIADOR.

ESTRUTURA DA RESPOSTA (JSON):
{
  "theme": "Título do tema",
  "context": "Contextualização com textos de apoio",
  "instructions": "Instruções para a redação",
  "keywords": ["palavra1", "palavra2", "palavra3"]
}

CARACTERÍSTICAS:
- Tema deve permitir análise crítica e criativa
- Incluir contexto rico com referências
- Pode ter abordagem literária, filosófica ou social
- Evitar temas já usados: ${usedThemes.join(', ')}`;

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
          { role: 'user', content: 'Gere um tema de redação inédito e relevante para treino.' }
        ],
        temperature: 0.9,
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
    const themeText = data.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = themeText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse theme response');
    }

    const practiceTheme = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ practiceTheme }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating practice theme:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate practice theme';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
