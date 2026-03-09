Create a comprehensive PRD document for Forbes Quill and save it as:
/Users/adi7192/Documents/Forbes MVP/docs/FORBES_QUILL_PRD.md

This is an academic assignment submission. The writing tone should be 
professional, first-person where describing decisions, and evidence-based 
throughout. Do not use filler phrases. Every claim must reference a 
specific implementation decision or file in the codebase.

Use this exact structure:

---

# Forbes Quill — Product Requirements Document
**Framework Applied:** The Octopus AI Framework for Product Leaders
**Project Path:** /Users/adi7192/Documents/Forbes MVP
**Date:** March 2026

---

## 1. Executive Summary

Write 3 paragraphs covering:
- What Forbes Quill is and the editorial problem it solves
- Why an AI-augmentation approach was chosen over automation
- How the Octopus AI Framework shaped every product decision from 
  architecture to evaluation strategy

---

## 2. Problem Statement

Write a crisp problem statement covering:
- The manual editorial bottleneck at a publication like Forbes
- The brand voice consistency risk at scale when multiple contributors write
- The metadata and SEO overhead that falls on editors post-draft
- Why existing tools (generic ChatGPT, Notion AI) fail this use case specifically

---

## 3. The Octopus AI Framework — Applied Dimension by Dimension

For each of the 8 dimensions below, write 4–5 sentences structured as:
(a) What this dimension means for an AI product
(b) The specific product/engineering decision made for Quill
(c) The file or component that implements it
(d) What gap remains and the V2 plan

### 3.1 Users
- Persona: Forbes editor and staff journalist
- Pain: 2–3 hour manual research + drafting cycle per article
- Decision: Linear guided funnel (Research → Draft → SEO → Distribution) 
  so editors never face a blank page
- Implementation: Next.js frontend with tab persistence via incomingDraft state
- Gap: No in-product user feedback collection beyond MVP
- V2: Structured user interviews + NPS prompt after 5th article generated

### 3.2 Business
- Goal: Reduce time-to-publish, enforce brand consistency at scale
- KPIs defined:
  * Time-to-draft: baseline ~3 hours manually → target ~30 minutes with Quill
  * Forbes Style Score threshold: all dimensions ≥ 0.8 before handoff
  * Forbidden word violation rate: target 0 per published article
  * Regeneration rate: target < 20% (editors should approve first draft)
- Implementation: lib/analytics.ts tracking generation timestamps and 
  feedback signals, KPI dashboard in Stats drawer
- Gap: No server-side analytics — all localStorage, lost on browser clear
- V2: PostHog or Mixpanel instrumentation for persistent usage analytics

### 3.3 Feasibility
- Stack justification: Next.js 14 for SSR + API routes in one codebase,
  Gemini 1.5 Pro for research (long context), Gemini 2.5 Pro for drafting 
  (higher quality output), Python for eval layer (rich data science tooling)
- Decision: Local storage for MVP — no database dependency, 
  zero infrastructure cost, deploy-ready on Vercel in one command
- Implementation: useHistory hook + localStorage, architecture.md
- Constraint acknowledged: No persistence across devices or browsers
- Gap: Rate limit handling not implemented — high-volume use could hit Gemini quotas
- V2: Request queuing + quota monitoring dashboard

### 3.4 Context
- Challenge: LLMs generate plausible but potentially redundant angles — 
  Quill could suggest a story Forbes published last week
- Decision: Forbes RSS feed injection before every research brief generation —
  the 5 most recent articles in the selected section are fetched and 
  injected as "avoid repeating these angles" context
- Implementation: lib/forbesRSS.ts, injected into RESEARCH_BRIEF_PROMPT
- Trust Layer: OutputCard.tsx visually flags all AI-generated factual 
  claims for human verification with a pulsing "Verification Required" badge
- Gap: No semantic similarity check — RSS injection is keyword-based, 
  not embedding-based
- V2: Vector similarity search against Forbes article embeddings to detect 
  angle overlap at a semantic level

### 3.5 Model Intelligence
- Two-model strategy rationale: Gemini 1.5 Pro handles research 
  (128k context window needed for source aggregation), Gemini 2.5 Pro 
  handles drafting (higher reasoning quality for stylistic output)
- Prompt engineering: All prompts centralized in lib/prompts.ts as 
  named exports — no inline prompts anywhere in the codebase
- Forbidden vocabulary enforced at two levels: prompt constraint AND 
  UI highlighter in OutputCard.tsx (amber highlights + violation count badge)
- Prompt versioning: PROMPT_VERSION constant in lib/prompts.ts, 
  injected into every API call metadata, tracked in docs/PROMPT_CHANGELOG.md
- Gap: No A/B testing infrastructure — prompt changes are sequential, 
  not parallel tested
- V2: Autonomous prompt optimizer that reads eval scores and proposes 
  minimal diffs to prompts, stored in /data/prompts.json for runtime 
  loading without redeployment (architecture designed, scoped to V2)

### 3.6 User Experience
- Guided funnel design rationale: Linear flow prevents editors from 
  skipping research and drafting directly — each stage's output 
  auto-populates the next stage via shared incomingDraft state
- Trust Layer: Visual safety mechanism — "Verification Required" badge 
  with pulse animation on all sensitive factual outputs
- Forbes Style Score: Real-time scoring bar below every generated draft 
  showing tone_match, hook_quality, structure_adherence, word_count, 
  authority_signals — each with color coding (green ≥ 0.8, amber 0.6–0.79, red < 0.6)
- Forbidden Word Highlighter: Inline amber highlights on style violations 
  with tooltip and total violation count badge
- Feedback buttons: 👍 Approve / 🔄 Regenerate on every OutputCard — 
  feeds into KPI tracking
- Gap: No mobile optimization — editorial workflow assumed desktop

### 3.7 Evaluations
- Three-tier correctness strategy:
  TIER 1 (Prompt-level): Brand voice constraints, forbidden word list, 
    hook type requirement, word count hard limit — baked into every system prompt
  TIER 2 (Deterministic eval): eval_runner.py scores word_count_delta, 
    tag_overlap, authority_signal_match, hook_type_match against 
    4 real hand-annotated Forbes articles in the golden dataset
  TIER 3 (LLM-as-judge): Second Gemini call scores tone, hook quality, 
    authority, and Forbes structure on 1–5 rubric — returns overall_verdict 
    (publish_ready / needs_revision / reject) and top_fix recommendation
- Golden dataset rationale: Synthetic records cannot capture authentic 
  Forbes tone patterns — all 4 records sourced from real publicly 
  accessible Forbes articles, manually annotated across article_metadata, 
  content_structure, tone_profile, and structural_patterns
- Self-correction loop: Score report → identify lowest dimension → 
  targeted edit to lib/prompts.ts → regenerate → re-score → 
  confirm improvement before committing prompt change
- Gap: Eval runner is manually triggered — no automatic post-generation scoring
- V2: Auto eval trigger via POST /api/eval/auto after every draft generation,
  feeding directly into the autonomous prompt optimizer

### 3.8 Growth
- Distribution Hub: Automatically generates X/Twitter, LinkedIn, and 
  newsletter blurb from every article draft — extends each article's 
  reach across channels without additional editor effort
- Score History: Session-level improvement tracking shows editors whether 
  regenerating improved quality scores — creates a tight feedback loop 
  within each working session
- Feedback aggregator: feedback_aggregator.py reads exported KPI data and 
  surfaces which modules have highest regeneration rates and which prompt 
  dimensions score lowest — feeds directly into prompt refinement decisions
- Gap: No viral or organic growth mechanism — Quill is an internal tool, 
  growth is adoption within the Forbes editorial team
- V2: Usage leaderboard showing which editors produce highest-scoring 
  articles — creates internal quality competition and surfaces power users 
  for feedback interviews

---

## 4. Technical Architecture

Reproduce the full architecture diagram from architecture.md.
Below it, annotate each component with its PM rationale — not just 
what it does, but WHY it was chosen from a product perspective:
- Why Next.js API routes instead of a separate backend
- Why localStorage instead of a database
- Why the eval layer is out-of-band (async, non-blocking)
- Why Python was kept for evals instead of rewriting in TypeScript

---

## 5. The Build Process — PM Decision Log

Write this as a numbered chronological narrative of the 8 most 
important decisions made during the build. For each:
- State the decision
- State the alternative that was considered
- State why the alternative was rejected
- State the PM principle that drove the final choice

Decisions to cover:
1. Centralized prompts.ts vs inline prompts
2. Two Gemini models vs one model for everything
3. Real Forbes articles for golden dataset vs synthetic records
4. Out-of-band eval runner vs blocking API response
5. localStorage vs database for MVP
6. Linear guided funnel vs freeform tab navigation
7. Forbidden words enforced at prompt AND UI level vs prompt-only
8. Manual eval loop vs autonomous self-improvement for MVP scope

---

## 6. Ensuring Output Correctness

Write a dedicated section explaining the three-tier correctness 
strategy in depth. For each tier, explain:
- What it catches that the other tiers cannot
- What breaks in the system if this tier is removed
- A concrete example of a failure it prevents

End this section with a paragraph on why human-in-the-loop 
(the Trust Layer + Approve/Regenerate buttons) is the non-negotiable 
fourth layer that no amount of automated eval can replace.

---

## 7. Known Limitations & V2 Roadmap

Present as a table:
| Octopus Dimension | MVP Limitation | V2 Solution | Effort Estimate |
|---|---|---|---|

Cover all 8 dimensions. For dimensions where MVP is strong, 
still identify the next meaningful improvement.

---

## 8. Autonomous Self-Improvement — V2 Architecture

Write a dedicated section describing the full autonomous loop 
that was designed but intentionally scoped to V2:
- Auto eval trigger (POST /api/eval/auto)
- Prompt optimizer agent (Gemini meta-prompt proposing minimal diffs)
- Runtime prompt loading from /data/prompts.json
- Human approval gate (Approve Change / Rollback in Stats drawer)
- Why this was not built in V1: Vercel serverless file write constraints, 
  need to validate manual eval signal quality first, risk of prompt drift 
  without proven baseline

Explain the deliberate scoping decision as a PM principle: 
automate only after the manual process is validated.

---

## 9. Appendix

### A. Golden Dataset
List all 4 records with:
- Record ID
- Source URL
- Section
- Article format
- Key annotated fields used in eval scoring

### B. Eval Scoring Dimensions
Table of all scoring dimensions, their calculation method, 
threshold for pass/fail, and which golden record fields they use.

### C. Prompt Changelog
Reproduce docs/PROMPT_CHANGELOG.md in full.

### D. Forbidden Vocabulary List
Full list with the rationale for each word's exclusion 
(why it signals AI-generated content in a Forbes context).

---

After writing the document:
1. Report the total word count
2. Confirm the file was saved to docs/FORBES_QUILL_PRD.md
3. List any sections where you made assumptions due to 
   missing implementation details — flag these for my review
