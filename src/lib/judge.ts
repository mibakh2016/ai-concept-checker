// Pure rules, decided by code (never by the AI).

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word / whole-phrase match, case-insensitive. */
export function containsWord(text: string, word: string): boolean {
  const re = new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRe(word.toLowerCase())}(?=$|[^\\p{L}\\p{N}_])`, "u");
  return re.test(text.toLowerCase());
}

/** Passes only if the answer contains one word/phrase from EACH list. */
export function judgeAnswer(answer: string, checkWords: string[][]): boolean {
  if (!checkWords.length) return false;
  return checkWords.every((list) => list.some((w) => containsWord(answer, w)));
}

export function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

/** Validate the AI's sentence; fall back to first trigger-sentence, else the last sentence. */
export function resolveRecited(
  explanation: string,
  aiSentence: string | null | undefined,
  triggers: { id: string; phrase: string }[],
): { sentence: string; triggerId: string | null } {
  const sentences = splitSentences(explanation);
  const findTrigger = (s: string) => triggers.find((t) => containsWord(s, t.phrase))?.id ?? null;
  const ai = aiSentence?.trim();
  if (ai && explanation.includes(ai)) return { sentence: ai, triggerId: findTrigger(ai) };
  for (const s of sentences) {
    const id = findTrigger(s);
    if (id) return { sentence: s, triggerId: id };
  }
  const last = sentences[sentences.length - 1] ?? explanation.trim();
  return { sentence: last, triggerId: findTrigger(last) };
}
