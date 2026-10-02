// supabase/functions/ai-categorize/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated and is Pro
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders });
    }

    // Check Pro status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .single();

    if (!profile?.is_pro) {
      return new Response(JSON.stringify({ error: 'Pro subscription required' }), { status: 403, headers: corsHeaders });
    }

    // Get descriptions from request body
    const { descriptions } = await req.json();

    if (!descriptions || !Array.isArray(descriptions)) {
      return new Response(JSON.stringify({ error: 'descriptions array required' }), { status: 400, headers: corsHeaders });
    }

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are a South African personal finance assistant. Categorize these bank transaction descriptions into spending categories.

Return ONLY a JSON object mapping each description to a category. No explanation, no markdown, just the JSON.

Use these category names where they fit: Food & Groceries, Eating Out, Coffee, Transport & Fuel, Entertainment, Shopping, Health & Fitness, Subscriptions, Savings, Income, Bank Fees, Utilities, Education, Insurance. Create new categories if needed.

Descriptions:
${descriptions.join('\n')}

Respond with ONLY valid JSON like: {"KRISPY KREME BROOKLYN": "Eating Out", "BP FLORENCE RIBEIRO": "Transport & Fuel"}`
        }],
      }),
    });

    const claudeData = await claudeResponse.json();
    const text = claudeData.content?.[0]?.text ?? '{}';

    let categoryMap: Record<string, string> = {};
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      categoryMap = JSON.parse(clean);
    } catch {
      console.error('Failed to parse Claude response:', text);
    }

    return new Response(JSON.stringify({ categoryMap }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: corsHeaders });
  }
});