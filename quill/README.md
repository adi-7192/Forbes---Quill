# Forbes Quill: Web Application

This is the Next.js 14 frontend and API layer for Forbes Quill.

## 🌟 Key Features

### 1. Linear Editorial Funnel
Guided tabs ensure a quality-checked progression from research to distribution.
- **Research Tab**: Fetches section-specific RSS feeds to avoid redundant story angles.
- **Drafting Tab**: Real-time "Forbes Style Score" measuring tone adherence and authority signals.
- **SEO Tab**: Automated metadata generation based on final drafts.
- **Distribution Tab**: Multi-channel copy generation for social and newsletters.

### 2. The Trust Layer
Every fact and sensitive claim is visually flagged with a pulsing "Verification Required" badge, ensuring human-in-the-loop accountability.

### 3. Integrated KPIs
An interactive Stats drawer tracks:
- Time-to-draft improvements.
- Brand voice violation rates (Forbidden vocabulary).
- Prompt version efficiency.
- User feedback signals (Approval vs. Regeneration).

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env.local` file:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

### Development
```bash
npm run dev
```

## 🏗 Tech Stack
-   **Framework**: Next.js 14 (App Router)
-   **AI**: Gemini 1.5 Pro & 2.5 Pro
-   **Styling**: Tailwind CSS
-   **Icons**: Lucide React
-   **Database**: SQLite (for persistent audit logs)

## 📁 Key Files
-   `lib/prompts.ts`: Centralized brand voice and system instructions.
-   `lib/analytics.ts`: LocalStorage-based KPI tracking.
-   `app/api/`: Versioned AI inference routes.
-   `components/OutputCard.tsx`: The heart of the Trust Layer and Style Score UI.
