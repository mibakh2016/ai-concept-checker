import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { judgeAnswer, resolveRecited } from "./judge";

const AI_INSTRUCTIONS = `You review a learner's explanation of a concept. Find the ONE sentence where the learner stops explaining what actually happens and starts repeating a phrase or label instead. Copy it word for word. If it contains one of the listed trigger phrases, return that trigger's id. If no trigger matches, return null for trigger_id and write one short "what would break?" question that does not give the answer. Reply with JSON only: {"recited_sentence": "...", "trigger_id": "... or null", "follow_up": "... or null"}`;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getTopics = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const [{ data: topics, error }, { data: concepts, error: e2 }] = await Promise.all([
    db.from("topics").select("id,name,example_line,example_mark").order("position"),
    db.from("concepts").select("id,topic_id,question").order("position"),
  ]);
  if (error || e2) throw new Error("Could not load topics");
  return (topics ?? []).map((t) => ({
    ...t,
    concepts: (concepts ?? []).filter((c) => c.topic_id === t.id).map(({ id, question }) => ({ id, question })),
  }));
});

async function findRecited(question: string, triggers: { id: string; phrase: string }[], explanation: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured");
  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText, Output } = await import("ai");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: AI_INSTRUCTIONS,
    output: Output.object({
      schema: z.object({
        recited_sentence: z.string(),
        trigger_id: z.string().nullable(),
        follow_up: z.string().nullable(),
      }),
    }),
    messages: [
      {
        role: "user",
        content: `Question: ${question}\nTriggers:\n${triggers.map((t) => `- ${t.id}: "${t.phrase}"`).join("\n")}\n\nExplanation:\n${explanation}`,
      },
    ],
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  return await result.output;
}

const uuid = z.string().uuid();

export const analyze = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ sessionId: uuid, conceptId: z.string().max(20), explanation: z.string().trim().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const [{ data: concept }, { data: triggers }] = await Promise.all([
      db.from("concepts").select("question,topic_id").eq("id", data.conceptId).single(),
      db.from("triggers").select("id,phrase,follow_up").eq("concept_id", data.conceptId),
    ]);
    if (!concept) throw new Error("Not found");
    const { data: attempt, error } = await db
      .from("attempts")
      .insert({ session_id: data.sessionId, concept_id: data.conceptId, topic_id: concept.topic_id, explanation: data.explanation })
      .select("id")
      .single();
    if (error || !attempt) throw new Error("Could not save attempt");
    const trig = triggers ?? [];
    let ai: { recited_sentence: string; trigger_id: string | null; follow_up: string | null } | null = null;
    try {
      ai = await findRecited(concept?.question ?? "", trig, data.explanation);
    } catch (e) {
      console.error("AI call failed", e);
    }

    const resolved = resolveRecited(data.explanation, ai?.recited_sentence, trig);
    const aiTrigger = ai?.trigger_id && trig.find((t) => t.id === ai!.trigger_id);
    const sentenceOk = ai?.recited_sentence && resolved.sentence === ai.recited_sentence.trim();
    const triggerId = (sentenceOk && aiTrigger ? aiTrigger.id : null) ?? resolved.triggerId;
    const matched = trig.find((t) => t.id === triggerId);
    const followUp = matched?.follow_up ?? ai?.follow_up ?? "If that were true, what would break? Say what actually happens.";

    const { data: gap, error: gErr } = await db
      .from("gaps")
      .insert({
        attempt_id: attempt.id,
        session_id: data.sessionId,
        recited_sentence: resolved.sentence,
        trigger_id: matched?.id ?? null,
        follow_up: followUp,
      })
      .select("id")
      .single();
    if (gErr || !gap) throw new Error("Could not save gap");
    return { gapId: gap.id, recitedSentence: resolved.sentence, followUp };
  });

export const retry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ sessionId: uuid, gapId: uuid, secondTry: z.string().trim().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: gap } = await db
      .from("gaps")
      .select("id, attempts(concept_id)")
      .eq("id", data.gapId)
      .eq("session_id", data.sessionId)
      .maybeSingle();
    const conceptId = (gap?.attempts as { concept_id: string } | null)?.concept_id;
    if (!gap || !conceptId) throw new Error("Not found");
    const { data: c } = await db.from("cases").select("id,case_text").eq("concept_id", conceptId).single();
    if (!c) throw new Error("No case");
    const { data: r, error } = await db
      .from("retries")
      .insert({ gap_id: gap.id, session_id: data.sessionId, second_try: data.secondTry, case_id: c.id })
      .select("id")
      .single();
    if (error || !r) throw new Error("Could not save retry");
    return { retryId: r.id, caseText: c.case_text };
  });

export const judge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ sessionId: uuid, retryId: uuid, caseAnswer: z.string().trim().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: r } = await db
      .from("retries")
      .select("id, cases(answer_text, check_words)")
      .eq("id", data.retryId)
      .eq("session_id", data.sessionId)
      .maybeSingle();
    const c = r?.cases as { answer_text: string; check_words: string[][] } | null;
    if (!r || !c) throw new Error("Not found");
    const passed = judgeAnswer(data.caseAnswer, c.check_words);
    await db.from("retries").update({ case_answer: data.caseAnswer, passed }).eq("id", r.id);
    return { passed, answerText: c.answer_text };
  });
