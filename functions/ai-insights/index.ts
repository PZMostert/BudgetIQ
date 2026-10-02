import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { summary } = await req.json();

    const prompt = `You are a personal finance analyst for a South African user. Analyse the following spending data and return EXACTLY a JSON array of insight objects. No preamble, no markdown, just raw JSON.

Each object must have:
- "type": one of "anomaly", "saving", "trend", "recommendation"
- "title": short title (max 8 words)
- "body": 1-2 sentence explanation, specific to their data with rand amounts where relevant
- "value": optional short stat or number (e.g. "R 2 450/mo" or "+34%")
- "severity": optional "high", "medium", or "low"

Generate 6-8 insights covering: spending anomalies, saving opportunities, monthly trends, and personalised budget recommendations. Be specific, honest, and use the actual numbers from the data.

Data:
${summary}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const text = data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "[]";
    const clean = text.replace(/```json|```/g, "").trim();

    return new Response(clean, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});