import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RESEARCH_BRIEF_PROMPT, PROMPT_VERSION, FORBIDDEN_WORDS } from "@/lib/prompts";
import { fetchForbesRSS } from "@/lib/forbesRSS";

export async function POST(req: Request) {
  try {
    const { query, section } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    // Fetch RSS
    let rssFeeds = "No recent coverage found.";
    let rssSuccess = false;
    
    if (section) {
      const rssData = await fetchForbesRSS(section);
      if (rssData) {
        rssFeeds = rssData;
        rssSuccess = true;
      }
    }

    const finalPrompt = RESEARCH_BRIEF_PROMPT.replace("{{RSS_FEEDS}}", rssFeeds);
    const prompt = `${finalPrompt}\n\nTopic/Headline: "${query}"`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Scan for forbidden words
    const forbiddenFound: string[] = [];
    const lowerText = responseText.toLowerCase();
    const forbiddenList = FORBIDDEN_WORDS.split(',').map(w => w.trim().toLowerCase());
    forbiddenList.forEach(word => {
      if (word && lowerText.includes(word)) forbiddenFound.push(word);
    });

    try {
      const parts = {
        keyDataPoints: "",
        priorCoverage: "",
        storyQuestions: "",
        suggestedSources: ""
      };

      // Extract parts based on headers - more robust regex to handle bolding, colons, etc.
      const keyDataMatch = responseText.match(/(?:\d\.\s+)?(?:\*\*)?KEY DATA POINTS(?:\*\*)?[:\s]*([\s\S]*?)(?=(?:\d\.\s+)?(?:\*\*)?(?:PRIOR COVERAGE|STORY QUESTIONS|SUGGESTED SOURCES)|$)/i);
      const priorCoverageMatch = responseText.match(/(?:\d\.\s+)?(?:\*\*)?PRIOR COVERAGE(?:\*\*)?[:\s]*([\s\S]*?)(?=(?:\d\.\s+)?(?:\*\*)?(?:KEY DATA POINTS|STORY QUESTIONS|SUGGESTED SOURCES)|$)/i);
      const storyQuestionsMatch = responseText.match(/(?:\d\.\s+)?(?:\*\*)?STORY QUESTIONS(?:\*\*)?[:\s]*([\s\S]*?)(?=(?:\d\.\s+)?(?:\*\*)?(?:KEY DATA POINTS|PRIOR COVERAGE|SUGGESTED SOURCES)|$)/i);
      const suggestedSourcesMatch = responseText.match(/(?:\d\.\s+)?(?:\*\*)?SUGGESTED SOURCES(?:\*\*)?[:\s]*([\s\S]*?)(?=(?:\d\.\s+)?(?:\*\*)?(?:KEY DATA POINTS|PRIOR COVERAGE|STORY QUESTIONS)|$)/i);

      if (keyDataMatch) parts.keyDataPoints = keyDataMatch[1].trim();
      if (priorCoverageMatch) parts.priorCoverage = priorCoverageMatch[1].trim();
      if (storyQuestionsMatch) parts.storyQuestions = storyQuestionsMatch[1].trim();
      if (suggestedSourcesMatch) parts.suggestedSources = suggestedSourcesMatch[1].trim();

      // Fallback if parsing fails to find headers
      if (!parts.keyDataPoints && !parts.priorCoverage) {
        try {
          const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
          return NextResponse.json({ ...JSON.parse(cleanJson), rssSuccess, prompt_version: PROMPT_VERSION, forbidden_words: forbiddenFound });
        } catch {
          // If all else fails, return raw text in first section
          parts.keyDataPoints = responseText;
        }
      }

      return NextResponse.json({ ...parts, rssSuccess, prompt_version: PROMPT_VERSION, forbidden_words: forbiddenFound });
    } catch (err) {
      console.error("Failed to parse research response:", responseText, err);
      return NextResponse.json({ 
        error: "Failed to parse API response",
        rawResponse: responseText
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Research API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate research brief" },
      { status: 500 }
    );
  }
}
