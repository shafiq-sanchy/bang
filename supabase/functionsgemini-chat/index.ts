import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helpers to obtain API keys
const getEnvKeys = (): string[] => [
  Deno.env.get('GEMINI_API_KEY_1'),
  Deno.env.get('GEMINI_API_KEY_2'),
  Deno.env.get('GEMINI_API_KEY_3'),
  Deno.env.get('GEMINI_API_KEY_4'),
  Deno.env.get('GEMINI_API_KEY_5'),
].filter((k): k is string => Boolean(k));

async function callGeminiWithRetry(prompt: string, keys: string[]): Promise<string> {
  if (!keys || keys.length === 0) throw new Error('No API keys configured');
  let lastError: Error | null = null;
  let idx = 0;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    try {
      const apiKey = keys[idx];
      idx = (idx + 1) % keys.length;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: prompt }] }
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
          }),
        }
      );

      const data = await response.json();

      if (response.status === 429 || data.error?.code === 429) {
        lastError = new Error('Rate limit exceeded');
        continue;
      }

      if (!response.ok) {
        console.error('Gemini API error:', data);
        lastError = new Error(data.error?.message || 'API request failed');
        continue;
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;

      lastError = new Error('Invalid response format');
      continue;

    } catch (error) {
      console.error(`Error on attempt ${attempt + 1}:`, error);
      lastError = error as Error;
      continue;
    }
  }

  throw lastError || new Error('All API keys exhausted');
}

async function callLovableAI(prompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an expert Bengali translator and grammar corrector. Convert Banglish (Bengali written in English letters) to proper Bengali script with correct grammar, proper word connections (সন্ধি), and accurate spelling. Ensure pure Bengali grammar rules and sentence structure. Only output the converted Bengali text, nothing else.' },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error('Lovable AI error:', response.status, t);
    throw new Error('AI gateway error');
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No text generated');
  return text;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, apiKeys } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Converting Banglish to Bengali with grammar correction');

    // Optional per-request keys override
    const providedKeys = Array.isArray(apiKeys)
      ? (apiKeys as unknown[])
          .filter((k): k is string => typeof k === 'string' && /^AIza[0-9A-Za-z-_]{20,}$/.test(k))
          .slice(0, 5)
      : [];
    const keys = providedKeys.length ? providedKeys : getEnvKeys();

    let generatedText: string;
    try {
      generatedText = await callGeminiWithRetry(prompt, keys);
    } catch (primaryError) {
      console.warn('Primary Gemini call failed, falling back to Lovable AI:', primaryError);
      generatedText = await callLovableAI(prompt);
    }

    return new Response(
      JSON.stringify({ text: generatedText }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Please check if API keys are configured correctly'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
