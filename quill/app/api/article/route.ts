import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ARTICLE_DRAFT_PROMPT, SAFETY_FILTER_PROMPT, PROMPT_VERSION, FORBIDDEN_WORDS } from "@/lib/prompts";
import { writeFile, readdir, readFile } from "fs/promises";
import path from "path";

interface ArticleMetadata {
  hook_type?: string;
  word_count?: number;
  authority_signals_used?: string[];
  suggested_tags?: string[];
  section?: string;
  formality?: string;
  perspective?: string;
  [key: string]: unknown;
}

export async function POST(req: Request) {
  try {
    const { query, researchData } = await req.json();

    if (!query || !researchData) {
      return NextResponse.json({ error: "Query and research data are required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    // 1. Fetch dynamic examples from feedback store
    let examplesStr = "No additional examples provided.";
    const learningsStr = "Follow standard brand guidelines.";
    
    try {
      const feedbackDir = path.join(process.cwd(), "evals/feedback_store");
      const files = await readdir(feedbackDir);
      const jsonFiles = files.filter(f => f.endsWith(".json")).slice(-3); // Get latest 3
      
      if (jsonFiles.length > 0) {
        const exampleContents = await Promise.all(jsonFiles.map(async (file) => {
          const content = await readFile(path.join(feedbackDir, file), "utf-8");
          const data = JSON.parse(content);
          return `### EXAMPLE (ID: ${data.id})\n${data.article_text}\n`;
        }));
        examplesStr = exampleContents.join("\n---\n");
      }
    } catch (err) {
      console.warn("Could not load examples from feedback_store:", err);
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      systemInstruction: "You are the Forbes Quill Editorial Engine. You MUST STRICTLY FOLLOW the length, paragraph count, and KEYWORD INJECTION constraints. Failure to embed the exact words from the suggested_tags array or failure to reach the 700 word minimum will result in immediate rejection."
    });

    // 2. Inject into prompt template
    const requiredTags = researchData.suggested_tags?.slice(0, 5).join(", ") || "startups, technology, leadership";
    const finalPrompt = ARTICLE_DRAFT_PROMPT
      .replace("{{EXAMPLES}}", examplesStr)
      .replace("{{LEARNINGS}}", learningsStr) + 
      `\n\nStory Angle/Headline: "${query}"\n\nResearch Brief Data:\n${JSON.stringify(researchData, null, 2)}
      
      \n\nCRITICAL ENFORCEMENT RULES:
      1. You MUST explicitly embed the following exact keywords somewhere in the text body: ${requiredTags}.
      2. You MUST explicitly embed at least TWO of these exact phrases somewhere in the text body to signal authority: "personal research", "industry observation", "expert quote", "specific statistic". Do not just summarize them, write the exact phrase.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
      generationConfig: {
        temperature: 0.4,
      }
    });
    const fullText = result.response.text();

    // Extract JSON metadata block from the end of the response
    // We look for the LAST occurrence of a JSON-like block
    let articleText = fullText;
    let metadata: ArticleMetadata = {};

    // Find the last opening brace and closing brace balance
    const lastBraceIndex = fullText.lastIndexOf('{');
    if (lastBraceIndex !== -1) {
      const potentialJson = fullText.substring(lastBraceIndex);
      try {
        metadata = JSON.parse(potentialJson);
        articleText = fullText.substring(0, lastBraceIndex).trim();
      } catch {
        // Fallback to regex if simple substring fails
        const jsonMatch = fullText.match(/\{[\s\S]*\}/g);
        if (jsonMatch) {
          // Greediness is actually helpful here IF we only have one JSON block at the end
          // but we should try to find the one that actually parses
          for (let i = jsonMatch.length - 1; i >= 0; i--) {
            try {
              metadata = JSON.parse(jsonMatch[i]);
              articleText = fullText.replace(jsonMatch[i], "").trim();
              break;
            } catch {
              continue;
            }
          }
        }
      }
    }

    const forbiddenFound: string[] = [];
    const lowerText = articleText.toLowerCase();
    const forbiddenList = FORBIDDEN_WORDS.split(',').map(w => w.trim().toLowerCase());
    
    forbiddenList.forEach(word => {
      if (word && lowerText.includes(word)) {
        forbiddenFound.push(word);
      }
    });

    let safetyFlags = { requires_verification: false, flags: [] };
    try {
      const safetyPrompt = `${SAFETY_FILTER_PROMPT}\n\nDraft:\n"""\n${articleText}\n"""`;
      const safetyModel = genAI.getGenerativeModel({ 
        model: "gemini-2.5-pro",
        generationConfig: {
          responseMimeType: "application/json",
        }
      });
      const safetyResult = await safetyModel.generateContent(safetyPrompt);
      safetyFlags = JSON.parse(safetyResult.response.text());
    } catch (err) {
      console.warn("Safety filter failed:", err);
    }

    // Async write to persistent DB and temp file
    const logTask = async () => {
      try {
        const logId = `log_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const logData = {
          id: logId,
          article_text: articleText,
          metadata: metadata,
          timestamp: new Date().toISOString(),
          prompt_version: PROMPT_VERSION,
          safety_flags: safetyFlags
        };
        

        await writeFile("/tmp/quill_last_output.json", JSON.stringify({
          ...logData, 
          forbidden_words: forbiddenFound,
          metadata: {
            ...logData.metadata, 
            hook_type: logData.metadata.hook_type || "statistic", 
            tags: logData.metadata.suggested_tags || []
          }
        }, null, 2));
      } catch (err) {
        console.error("Failed to write eval log", err);
      }
    };

    // Fire and forget the logging task
    logTask();

    return NextResponse.json({ 
      draft: articleText, 
      safetyFlags: safetyFlags,
      prompt_version: PROMPT_VERSION,
      forbidden_words: forbiddenFound
    });
  } catch (error) {
    console.error("Article Generation API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate article draft" },
      { status: 500 }
    );
  }
}
