import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { analyze, getConcepts, judge, retry } from "@/lib/concept.functions";

const TOPIC = "M2";
const conceptsQuery = queryOptions({
  queryKey: ["concepts", TOPIC],
  queryFn: () => getConcepts({ data: { topicId: TOPIC } }),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Concept Check: explain it in your own words" },
      { name: "description", content: "Explain an idea in your own words. Find the sentence you recited, answer one question, then solve a new case." },
      { property: "og:title", content: "Concept Check" },
      { property: "og:description", content: "Find where you stopped explaining and started repeating. No sign-up." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(conceptsQuery),
  component: Index,
});

function useSessionId() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    let v = localStorage.getItem("cc_session_id");
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem("cc_session_id", v);
    }
    setId(v);
  }, []);
  return id;
}

type Gap = { gapId: string; recitedSentence: string; followUp: string };
type Case = { retryId: string; caseText: string };
type Result = { passed: boolean; answerText: string };

const ERR = "Something went wrong. Try again.";

function Index() {
  const { data } = useSuspenseQuery(conceptsQuery);
  const sessionId = useSessionId();
  const [concept, setConcept] = useState<{ id: string; question: string } | null>(null);
  const [explanation, setExplanation] = useState("");
  const [gap, setGap] = useState<Gap | null>(null);
  const [secondTry, setSecondTry] = useState("");
  const [kase, setKase] = useState<Case | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState<null | "analyze" | "retry" | "judge">(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setConcept(null); setExplanation(""); setGap(null); setSecondTry("");
    setKase(null); setAnswer(""); setResult(null); setError(null);
  };

  async function run<T>(step: "analyze" | "retry" | "judge", fn: () => Promise<T>, done: (v: T) => void) {
    setBusy(step); setError(null);
    try { done(await fn()); } catch { setError(ERR); } finally { setBusy(null); }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[640px] px-5 py-10 font-sans sm:py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{data.topicName}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Pick one question below. Explain the answer in your own words, as if telling a friend. The app will point
          at the sentence where you stopped explaining and started repeating, ask you one question about it, then
          give you a new case to solve.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {(concept ? [concept] : data.concepts).map((c) => {
          const selected = concept?.id === c.id;
          return (
            <button
              key={c.id}
              type="button"
              disabled={!!concept}
              onClick={() => setConcept(c)}
              className={`w-full rounded-xl border bg-card px-5 py-4 text-left text-base shadow-sm transition hover:border-foreground/40 disabled:cursor-default ${
                selected ? "border-2 border-foreground font-bold" : ""
              }`}
            >
              {c.question}
            </button>
          );
        })}
      </div>

      {concept && (
        <Card>
          <p className="font-semibold">{concept.question}</p>
          <Box value={explanation} onChange={setExplanation} readOnly={!!gap} rows={6}
            placeholder="Explain it in your own words, as if telling a friend." />
          {!gap && (
            <Submit disabled={!explanation.trim() || !sessionId || !!busy}
              loading={busy === "analyze"} loadingText="Reading your explanation..."
              onClick={() => run("analyze",
                () => analyze({ data: { sessionId: sessionId!, conceptId: concept.id, explanation } }), setGap)} />
          )}
          {!gap && error && <ErrorText />}
        </Card>
      )}

      {gap && (
        <Card>
          <p className="whitespace-pre-wrap leading-relaxed"><Highlighted text={explanation} mark={gap.recitedSentence} /></p>
          <p className="font-bold">{gap.followUp}</p>
          <Box value={secondTry} onChange={setSecondTry} readOnly={!!kase} rows={4}
            placeholder="Try again: what actually happens?" />
          {!kase && (
            <Submit disabled={!secondTry.trim() || !!busy} loading={busy === "retry"} loadingText="Saving..."
              onClick={() => run("retry",
                () => retry({ data: { sessionId: sessionId!, gapId: gap.gapId, secondTry } }), setKase)} />
          )}
          {!kase && error && <ErrorText />}
        </Card>
      )}

      {kase && (
        <Card>
          <p className="text-sm text-muted-foreground">New case. You haven't seen this one.</p>
          <p className="font-semibold">{kase.caseText}</p>
          <Box value={answer} onChange={setAnswer} readOnly={!!result} rows={3} placeholder="Your answer" />
          {!result && (
            <Submit disabled={!answer.trim() || !!busy} loading={busy === "judge"} loadingText="Checking..."
              onClick={() => run("judge",
                () => judge({ data: { sessionId: sessionId!, retryId: kase.retryId, caseAnswer: answer } }), setResult)} />
          )}
          {!result && error && <ErrorText />}
        </Card>
      )}

      {result && (
        <Card>
          <p className={`text-4xl font-bold ${result.passed ? "text-success" : "text-warning"}`}>
            {result.passed ? "Pass ✔" : "Not yet"}
          </p>
          <p><span className="text-muted-foreground">Correct answer: </span>{result.answerText}</p>
          <button type="button" onClick={reset}
            className="h-12 rounded-xl border bg-background px-6 font-semibold shadow-sm transition hover:bg-accent">
            Start again
          </button>
        </Card>
      )}
    </main>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <section className="card-in mt-6 flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">{children}</section>;
}

function Box(props: { value: string; onChange: (v: string) => void; readOnly: boolean; rows: number; placeholder: string }) {
  return (
    <textarea
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      readOnly={props.readOnly}
      rows={props.rows}
      placeholder={props.placeholder}
      className="w-full resize-y rounded-xl border bg-background p-4 text-base leading-relaxed outline-none focus:ring-2 focus:ring-ring read-only:bg-muted read-only:text-muted-foreground"
    />
  );
}

function Submit(props: { disabled: boolean; loading: boolean; loadingText: string; onClick: () => void }) {
  return (
    <button type="button" disabled={props.disabled} onClick={props.onClick}
      className="h-12 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50">
      {props.loading ? props.loadingText : "Submit"}
    </button>
  );
}

function ErrorText() {
  return <p className="text-sm text-destructive">{ERR}</p>;
}

function Highlighted({ text, mark }: { text: string; mark: string }) {
  const i = text.indexOf(mark);
  if (i < 0 || !mark) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-highlight px-1 text-highlight-foreground">{mark}</mark>
      {text.slice(i + mark.length)}
    </>
  );
}
