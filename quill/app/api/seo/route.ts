import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SEO_METADATA_PROMPT, PROMPT_VERSION, FORBIDDEN_WORDS } from "@/lib/prompts";

export async function POST(req: Request) {
  try {
    const { draft } = await req.json();

    if (!draft) {
      return NextResponse.json({ error: "Article draft is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `${SEO_METADATA_PROMPT}\n\nDraft:\n"""\n${draft}\n"""`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const data = JSON.parse(text);
    
    // Scan for forbidden words
    const forbiddenFound: string[] = [];
    const lowerText = text.toLowerCase();
    const forbiddenList = FORBIDDEN_WORDS.split(',').map(w => w.trim().toLowerCase());
    forbiddenList.forEach(word => {
      if (word && lowerText.includes(word)) forbiddenFound.push(word);
    });

    return NextResponse.json({ ...data, prompt_version: PROMPT_VERSION, forbidden_words: forbiddenFound });
  } catch (error) {
    console.error("SEO API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate SEO metadata" },
      { status: 500 }
    );
  }
}
