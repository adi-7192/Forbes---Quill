# Forbes Quill: AI Editorial Augmentation Platform

Forbes Quill is an internal, editorial-grade AI platform designed to streamline the publication lifecycle for Forbes journalists. Built using the **Octopus AI Framework**, Quill focuses on augmenting human high-judgment narrative intelligence with AI-driven efficiency for repetitive editorial tasks.

## 🚀 Overview

Quill provides a linear, guided editorial funnel that takes a story from initial angle to multi-platform distribution assets:

1.  **Research**: Aggregates context, prior Forbes coverage (via RSS), and key data points.
2.  **Drafting**: Synthesizes research into a Forbes-styled article draft using strictly governed brand voice constraints.
3.  **SEO**: Generates metadata, headlines, and tags optimized for Forbes' digital standards.
4.  **Distribution**: Automatically formats content for X/Twitter, LinkedIn, and newsletters.

## 🛠 Project Structure

-   `quill/`: The Next.js 14 web application core (React, Tailwind, Gemini API).
-   `evals/`: Specialized Python evaluation suite for deterministic and LLM-as-judge scoring.
-   `docs/`: Comprehensive project governance, including the [FORBES_QUILL_PRD.md](docs/FORBES_QUILL_PRD.md) and [PROMPT_CHANGELOG.md](quill/docs/PROMPT_CHANGELOG.md).
-   `architecture.md`: Detailed system architecture and data flow diagrams.

## ⚖️ Governance & Quality

-   **Three-Tier Evaluation**: Scoring against a hand-annotated "Golden Dataset" of real Forbes articles.
-   **Brand Voice Enforcement**: Centralized prompt versioning and forbidden vocabulary detection (e.g., "delve", "leverage").
-   **Trust Layer**: UI-level safety mechanisms that flag facts for human verification.

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Google Gemini API Key

### Web App
```bash
cd quill
npm install
npm run dev
```

### Evaluations
```bash
cd evals
pip install -r requirements.txt # if applicable
python eval_runner.py
```

---

*This project was developed as a case study in applying the Octopus AI Framework to mission-critical editorial workflows.*
