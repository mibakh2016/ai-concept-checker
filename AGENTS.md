<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- All database access goes through server functions in src/lib/concept.functions.ts using the admin client; tables have RLS on with no public policies, so answer keys never reach the browser.
- Pass/fail and recited-sentence fallback logic live in pure functions in src/lib/judge.ts (tested); the AI only proposes the recited sentence.
