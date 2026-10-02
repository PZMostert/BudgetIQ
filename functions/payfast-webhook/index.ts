// supabase/functions/payfast-webhook/index.ts
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
    const body = await req.text();
    const params = new URLSearchParams(body);
    const data = Object.fromEntries(params.entries());

    console.log('PayFast webhook received:', JSON.stringify(data));

    const paymentStatus = data['payment_status'];
    const userId = data['m_payment_id']; // We set this to Supabase user ID in checkout

    if (paymentStatus !== 'COMPLETE') {
      console.log('Payment not complete, status:', paymentStatus);
      return new Response('OK', { status: 200 });
    }

    if (!userId) {
      console.error('No user ID in payment data');
      return new Response('Missing user ID', { status: 400 });
    }

    // Update is_pro in Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { error } = await supabase
      .from('profiles')
      .update({ is_pro: true })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update profile:', error);
      return new Response('DB error', { status: 500 });
    }

    console.log('Successfully upgraded user to Pro:', userId);
    return new Response('OK', { status: 200 });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('Error', { status: 500 });
  }
});