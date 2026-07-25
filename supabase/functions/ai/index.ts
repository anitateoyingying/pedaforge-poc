// PedaForge AI edge function — Gemini primary, Mistral fallback.
// Keys live server-side; the browser only ever holds the user's JWT.
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";
const MISTRAL_KEY = Deno.env.get("MISTRAL_API_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Prompt {
  system: string;
  user: string;
  json: boolean;
}

const SG_CONTEXT =
  "You are part of PedaForge, an AI platform for early-childhood educators in Singapore preschools (Busy Bees network). " +
  "Ground advice in Singapore frameworks: NEL (Nurturing Early Learners) and its iTeach principles, EYDF for 0-3, " +
  "QTT (Quality Teaching Tool) domains for teaching quality, and SkillsFuture SFw for ECCE for professional development. " +
  "Be concrete, warm, and practical. Never invent child data you were not given.";

function buildPrompt(action: string, p: Record<string, unknown>): Prompt {
  const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 4000) : JSON.stringify(v ?? "").slice(0, 4000));
  switch (action) {
    case "lesson_plan":
      return {
        system: SG_CONTEXT,
        user:
          `Create a differentiated lesson plan.\nTheme: ${s(p.theme)}\nAge group: ${s(p.age_group)}\n` +
          `Class profile (children with learning profiles): ${s(p.children)}\nFrameworks to tag: ${s(p.frameworks)}\n` +
          `Return STRICT JSON: {"title":str,"intro":str,"activities":[{"name":str,"description":str,"differentiation":[{"profile":str,"strategy":str}],"framework_tags":[str]}],"rehearse_retrieve":str,"materials":[str]}. ` +
          `Every activity must include differentiation entries that reference the actual child profiles given.`,
        json: true,
      };
    case "coach":
      return {
        system:
          SG_CONTEXT +
          ` You are the QTT-aligned coaching agent in ${s(p.mode)} mode. Reference specific QTT domains by name when giving feedback. Ask one reflective question at the end. Keep replies under 180 words.`,
        user: s(p.message) + (p.history ? `\n\nConversation so far: ${s(p.history)}` : ""),
        json: false,
      };
    case "tag_observation":
      return {
        system: SG_CONTEXT,
        user:
          `An observer captured this anecdotal note during a lesson observation:\n"${s(p.note)}"\n` +
          `Return STRICT JSON: {"indicator":"QTT domain + short indicator name","state":"met"|"emerging","rationale":"one sentence"}.`,
        json: true,
      };
    case "observation_report":
      return {
        system: SG_CONTEXT,
        user:
          `Synthesise a post-observation report for educator ${s(p.educator)} from these tagged notes: ${s(p.notes)}\n` +
          `Return STRICT JSON: {"strengths":str,"growth":str,"followup":str}. Cite note timestamps inline where relevant.`,
        json: true,
      };
    case "narrative":
      return {
        system: SG_CONTEXT,
        user:
          `Draft a portfolio narrative for a child's learning story.\nChild: ${s(p.child)}\nRaw observation: "${s(p.note)}"\nDomains: ${s(p.domains)}\n` +
          `Return STRICT JSON: {"narrative":"2-3 sentence parent-friendly learning story","framework_tags":[str],"next_step":"one suggestion"}.`,
        json: true,
      };
    case "analyze_sample":
      return {
        system: SG_CONTEXT,
        user:
          `An educator uploaded a child's work sample.\nContext: ${s(p.context)}\nDomains selected: ${s(p.domains)}\nChild profile: ${s(p.child)}\n` +
          `Return STRICT JSON: {"milestones":[str],"narrative":str,"framework_tags":[str],"next_step":str}. Base analysis only on the context described.`,
        json: true,
      };
    case "lna":
      return {
        system: SG_CONTEXT,
        user:
          `Educator profile: designation ${s(p.designation)}, ${s(p.experience)} years experience, self-assessment: ${s(p.selfAssessment)}.\n` +
          `Return STRICT JSON: {"goals":[{"goal":str,"qtt_domain":str,"sfw_ref":"an SFw ECCE skill code/name"}],"pd_suggestion":str}. Exactly 3 goals.`,
        json: true,
      };
    case "reflect":
      return {
        system: SG_CONTEXT + " You speak to a young child (4-6) about their drawing. One warm sentence + one open question. Max 30 words.",
        user: `The child drew: ${s(p.description)}. They said they feel: ${s(p.feeling)}.`,
        json: false,
      };
    default:
      throw new Error("unknown action");
  }
}

async function callGemini(prompt: Prompt): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: prompt.system }] },
    contents: [{ role: "user", parts: [{ text: prompt.user }] }],
    generationConfig: prompt.json
      ? { responseMimeType: "application/json", temperature: 0.6 }
      : { temperature: 0.7, maxOutputTokens: 600 },
  };
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const data = await r.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("gemini empty");
  return text;
}

async function callMistral(prompt: Prompt): Promise<string> {
  const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${MISTRAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0.6,
      max_tokens: prompt.json ? 3000 : 900,
      ...(prompt.json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw new Error(`mistral ${r.status}`);
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("mistral empty");
  return text;
}

function parseMaybeJson(text: string, wantJson: boolean): unknown {
  if (!wantJson) return text.trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    // Require a valid signed-in user (RLS-grade gate for AI spend)
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });

    const { action, ...params } = await req.json();
    const prompt = buildPrompt(String(action), params);

    let text: string;
    let provider = "gemini";
    try {
      text = await callGemini(prompt);
    } catch (_e) {
      provider = "mistral";
      text = await callMistral(prompt);
    }

    let result: unknown;
    try {
      result = parseMaybeJson(text, prompt.json);
    } catch (_e) {
      // JSON parse failed — retry same provider once (other provider may be down/rate-limited)
      text = provider === "gemini" ? await callGemini(prompt) : await callMistral(prompt);
      result = parseMaybeJson(text, prompt.json);
    }

    return new Response(JSON.stringify({ ok: true, provider, result }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
