import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DISTRIBUTION_PROMPT, PROMPT_VERSION, FORBIDDEN_WORDS } from "@/lib/prompts";

export async function POST(req: Request) {
  try {
    const { draft } = await req.json();

    if (!draft) {
      return NextResponse.json({ error: "Draft is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const prompt = `${DISTRIBUTION_PROMPT}\n\nDraft:\n"""\n${draft}\n"""`;

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
        twitter: "",
        linkedin: "",
        newsletter: ""
      };

      // Extract parts based on headers - more robust regex
      const twitterMatch = responseText.match(/(?:###\s+)?(?:X\s+)?TWITTER(?:\/X)?(?::|\s)*([\s\S]*?)(?=(?:###\s+)?(?:LINKEDIN|NEWSLETTER BLURB)|$)/i);
      const linkedinMatch = responseText.match(/(?:###\s+)?LINKEDIN(?::|\s)*([\s\S]*?)(?=(?:###\s+)?(?:X\s+)?TWITTER(?:\/X)?|(?:###\s+)?NEWSLETTER BLURB|$)/i);
      const newsletterMatch = responseText.match(/(?:###\s+)?NEWSLETTER(?:\s+BLURB)?(?::|\s)*([\s\S]*?)(?=(?:###\s+)?(?:X\s+)?TWITTER(?:\/X)?|(?:###\s+)?LINKEDIN|$)/i);

      if (twitterMatch) parts.twitter = twitterMatch[1].trim();
      if (linkedinMatch) parts.linkedin = linkedinMatch[1].trim();
      if (newsletterMatch) parts.newsletter = newsletterMatch[1].trim();

      // If parsing fails to find headers, fallback to previous JSON approach just in case
      if (!parts.twitter && !parts.linkedin && !parts.newsletter) {
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const data = JSON.parse(cleanJson);
        return NextResponse.json(data);
      }

      return NextResponse.json({ ...parts, prompt_version: PROMPT_VERSION, forbidden_words: forbiddenFound });
    } catch (err) {
      console.error("Failed to parse distribution response:", responseText, err);
      return NextResponse.json({ 
        error: "Failed to parse API response",
        rawResponse: responseText
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Distribution API Error:", error);
    return NextResponse.json({ error: "Failed to generate distribution copy" }, { status: 500 });
  }
}
