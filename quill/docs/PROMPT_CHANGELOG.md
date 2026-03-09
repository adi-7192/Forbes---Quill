# Prompt Changelog (Forbes Quill)

This file tracks the evolution of the system instructions and formatting constraints for the Forbes Editorial Engine.

## v1.0 — Initial implementation
- Established Forbes brand voice base prompt
- Focus on tone (direct, authoritative, impatient)
- Forbidden word list: delve, tapestry, underscore, embark, multifaceted, nuanced, it's worth noting, in conclusion, in summary, as an AI, certainly, absolutely, leverage.
- Hook type constraint added (bold claim, hard data point, historical analogy, or statistic)

## v1.1 — Eval-driven refinement
- Added authority signal requirement (minimum 2 per article from a specific verbatim list)
- Tightened word count enforcement to a 700–1000 range
- Implemented KEYWORD INJECTION rule forcing the use of suggested tags in text body

## v1.2 — RSS context injection (Current)
- Prior Forbes coverage now injected into Research Brief prompt via `{{RSS_FEEDS}}` placeholder
- Models upgraded to `gemini-2.5-pro` with adjusted `temperature: 0.4` for strict adherence
- Formalized prompt versioning across API metadata logs
