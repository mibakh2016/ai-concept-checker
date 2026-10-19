import { CheckCircle2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { analyze, getTopics, judge, retry } from "@/lib/concept.functions";

const conceptsQuery = queryOptions({
  queryKey: ["topics"],
  queryFn: () => getTopics(),
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
  const [stepsOpen, setStepsOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

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
      <div className="mb-6">
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">100x c8 Hackathon</p>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-xs font-bold tracking-tight">Concept Check</span>
        </div>
      </div>
      <header className="mb-8">
        <div className="mx-auto w-fit">
          <h1 className="text-left leading-tight tracking-tight">
            <span className="block text-xl font-bold text-foreground sm:text-2xl">Learning topic:</span>
            <span className="block text-xl font-bold text-foreground sm:text-2xl">How gen AI apps work</span>
          </h1>
        </div>
        <p className="mt-6 text-base leading-relaxed text-foreground">
          Explain a concept in your own words. We guide you to real understanding if needed.
        </p>

        <div className="mt-5 rounded-none border bg-card p-4 shadow-sm">
          <p className="mb-2 text-base font-bold text-primary">Example</p>
          <p className="leading-relaxed">&ldquo;You need a password to log in.&rdquo;</p>
          <p className="leading-relaxed">
            <mark className="rounded bg-highlight px-1 text-highlight-foreground">It's private because of encryption.</mark>
          </p>
          <p className="mt-2 text-sm font-semibold text-destructive">↑ here they stopped explaining</p>
        </div>

        {!concept || stepsOpen ? (
          <div className="mt-5 rounded-none border border-primary bg-primary/5 p-4 sm:p-5">
            <p className="mb-3 font-bold text-primary">How it works</p>
            <ol className="flex flex-col gap-2">
              {[
                ["Pick", "a question"],
                ["Explain", "in your own words"],
                ["Answer", "one follow-up"],
                ["Solve", "a new case → Pass / Not yet"],
              ].map(([verb, rest], i) => (
                <li key={i} className="flex items-start gap-3 text-base leading-relaxed text-foreground">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                  <span>
                    <span className="font-bold">{verb}</span> {rest}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <button type="button" onClick={() => setStepsOpen(true)}
            className="mt-5 font-bold text-primary">
            How it works ▾
          </button>
        )}
      </header>

      <p className="mb-3 text-lg font-bold text-foreground">👇 Pick a concept question</p>
      <div className="flex flex-col gap-3">
        {(concept ? [concept] : showAll ? data.concepts : data.concepts.slice(0, 3)).map((c, i) => {
          const selected = concept?.id === c.id;
          return (
            <button
              key={c.id}
              type="button"
              disabled={!!concept}
              onClick={() => { setConcept(c); setStepsOpen(false); }}
              className={`flex w-full items-center justify-between gap-3 rounded-none border bg-card px-5 py-4 text-left text-base shadow-sm transition hover:border-foreground/40 disabled:cursor-default ${
                selected ? "border-2 border-foreground" : ""
              }`}
            >
              <span>
                <span className="mr-2 font-bold text-muted-foreground">{i + 1}.</span>
                <span className="font-bold">{c.question}</span>
              </span>
              <span aria-hidden className="shrink-0 text-xl font-black text-primary">➜</span>
            </button>
          );
        })}
      </div>
      {!concept && data.concepts.length > 3 && (
        <div className="mt-4 text-center">
          {!showAll && (
            <button type="button" onClick={() => setShowAll(true)} className="text-lg font-bold text-primary">
              {data.concepts.length - 3} more questions <span aria-hidden className="text-2xl">▾</span>
            </button>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Showing {showAll ? data.concepts.length : 3} of {data.concepts.length}
          </p>
        </div>
      )}

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
