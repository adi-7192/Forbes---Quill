import json
import os
import sys
import argparse
from datetime import datetime
import re
import urllib.request
import urllib.error

def main():
    parser = argparse.ArgumentParser(description="Forbes Editorial Eval Runner")
    parser.add_argument("--output", type=str, help="The model output text to evaluate. If omitted, reads /tmp/quill_last_output.json")
    parser.add_argument("--record_id", type=str, required=True, help="The ID of the golden record (e.g., forbes_001)")
    parser.add_argument("--llm-judge", action="store_true", help="Enable LLM-as-judge scoring using Gemini")
    
    args = parser.parse_args()
    
    # Path setup
    base_dir = "/Users/adi7192/Documents/Forbes MVP/evals"
    records_dir = os.path.join(base_dir, "golden_dataset", "records")
    results_dir = os.path.join(base_dir, "results")
    last_output_path = "/tmp/quill_last_output.json"
    
    output_text = args.output
    gen_metadata = {}
    gen_prompt_version = "unknown"

    # If no output provided, try to load the last one from the app
    if not output_text:
        if os.path.exists(last_output_path):
            with open(last_output_path, 'r') as f:
                log_data = json.load(f)
                output_text = log_data.get("article_text", "")
                gen_metadata = log_data.get("metadata", {})
                gen_prompt_version = log_data.get("prompt_version", "unknown")
                print(f"--- Loaded last application output from {last_output_path} ---")
        else:
            print(f"Error: No --output provided and {last_output_path} not found.")
            sys.exit(1)
    
    record_path = os.path.join(records_dir, f"{args.record_id}.json")
    
    if not os.path.exists(record_path):
        print(f"Error: Record {args.record_id} not found at {record_path}")
        sys.exit(1)
        
    with open(record_path, 'r') as f:
        try:
            golden = json.load(f)
        except json.JSONDecodeError:
            print(f"Error: Could not parse JSON for record {args.record_id}.")
            sys.exit(1)

    # 1. Word Count Delta
    output_word_count = len(output_text.split())
    golden_word_count = golden.get("article_metadata", {}).get("word_count", 600)
    word_count_delta = abs(output_word_count - golden_word_count) / golden_word_count
    
    # 2. Tag Overlap
    golden_tags = golden.get("article_metadata", {}).get("tags", [])
    tags_found = [tag for tag in golden_tags if tag.lower() in output_text.lower()]
    tag_overlap = len(tags_found) / len(golden_tags) if golden_tags else 1.0

    # 3. Tone/Authority Signal Match
    golden_signals = golden.get("tone_profile", {}).get("authority_signals", [])
    signals_found = []
    
    for sig in golden_signals:
        if sig.lower() in output_text.lower():
            signals_found.append(sig)
        else:
            # Fallback: check if the key words from the signal exist near each other
            words = sig.lower().split('_')
            # Look for these words co-occurring within a 50 character window
            for i in range(len(output_text) - 50):
                window = output_text[i:i+50].lower()
                if all(w in window for w in words):
                    signals_found.append(sig)
                    break
            
    tone_match = len(signals_found) / len(golden_signals) if golden_signals else 1.0

    # 4. Hook Match (Meta-awareness)
    golden_hook_type = golden.get("content_structure", {}).get("hook_type", "").lower()
    gen_hook_type = gen_metadata.get("hook_type", "").lower()
    
    # Heuristic check on text if metadata missing or for validation
    output_start = output_text.strip().lower()[:150]
    heuristic_hook_pass = False
    if golden_hook_type == "statistic":
        heuristic_hook_pass = bool(re.search(r'\d+%|\d+\s+billion|\d+\s+million', output_start))
    elif golden_hook_type == "bold_claim":
        # Check for strong verbs/assertions, simplified here
        heuristic_hook_pass = len(output_start.split()) > 10 and not output_start.startswith(("why", "how", "what"))
    
    # Final hook score: True if Gemini claimed the right hook type OR if heuristic passes
    hook_score = (gen_hook_type == golden_hook_type) or heuristic_hook_pass

    # 5. LLM as Judge
    llm_judge_results = None
    if args.llm_judge:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print("Warning: GEMINI_API_KEY not found. Skipping LLM judge.")
            llm_judge_results = "unavailable - no api key"
        else:
            JUDGE_PROMPT = f"""
You are an expert Forbes editor evaluating an AI-generated article draft.
Score the following article on each dimension from 1–5:

1. TONE (1=completely off-brand, 5=indistinguishable from Forbes)
   Forbes tone: direct, authoritative, slightly impatient, semi-formal.

2. HOOK QUALITY (1=weak/generic opening, 5=strong bold claim or hard stat)

3. AUTHORITY (1=no credible signals, 5=strong expert quote + data + case study)

4. FORBES STRUCTURE (1=no structure, 5=correct paragraph length, subheadings, CTA)

Return ONLY this JSON — no explanation:
{{
  "tone": <1-5>,
  "hook_quality": <1-5>,
  "authority": <1-5>,
  "forbes_structure": <1-5>,
  "overall_verdict": "publish_ready | needs_revision | reject",
  "top_fix": "<single most important improvement in one sentence>"
}}

ARTICLE TO EVALUATE:
{output_text}
"""
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={api_key}"
            data = json.dumps({
                "contents": [{"parts": [{"text": JUDGE_PROMPT}]}],
                "generationConfig": {"temperature": 0.2}
            }).encode('utf-8')
            
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req) as response:
                    res_body = response.read()
                    res_json = json.loads(res_body)
                    llm_text = res_json.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    clean_text = re.sub(r'```json\n?|\n?```', '', llm_text).strip()
                    llm_judge_results = json.loads(clean_text)
            except Exception as e:
                print(f"Warning: LLM judge call failed: {e}")
                llm_judge_results = "unavailable"

    # Prepare Report
    report = {
        "record_id": args.record_id,
        "timestamp": datetime.now().isoformat(),
        "prompt_version": gen_prompt_version,
        "scores": {
            "word_count_delta": round(word_count_delta, 4),
            "tag_overlap": round(tag_overlap, 4),
            "tone_match": round(tone_match, 4),
            "hook_match": hook_score
        },
        "details": {
            "output_word_count": output_word_count,
            "golden_word_count": golden_word_count,
            "tags_matched": tags_found,
            "signals_matched": signals_found,
            "gen_hook_type": gen_hook_type,
            "golden_hook_type": golden_hook_type
        }
    }

    if args.llm_judge:
        report["llm_judge"] = llm_judge_results

    # Save results
    try:
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_filename = f"eval_{args.record_id}_{timestamp_str}.json"
        result_path = os.path.join(results_dir, result_filename)
        
        os.makedirs(results_dir, exist_ok=True)
        with open(result_path, 'w') as f:
            json.dump(report, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not save eval result to {results_dir}: {e}")

    # Console Summary Table
    print("\n" + "="*60)
    print(f" FORBES QUILL EVALUATION: {args.record_id}")
    print("="*60)
    print(f"{'Metric':<25} | {'Score/Value':<20} | {'Status':<10}")
    print("-" * 58)
    print(f"{'Word Count Delta':<25} | {word_count_delta:.2%} ({output_word_count} words) | {'PASS' if word_count_delta < 0.2 else 'FAIL'}")
    print(f"{'Tag Overlap':<25} | {tag_overlap:.2%} ({len(tags_found)}/{len(golden_tags)}) | {'PASS' if tag_overlap > 0.5 else 'FAIL'}")
    print(f"{'Tone Match (Signals)':<25} | {tone_match:.2%} ({len(signals_found)}/{len(golden_signals)}) | {'PASS' if tone_match > 0.3 else 'FAIL'}")
    print(f"{'Hook Alignment':<25} | {gen_hook_type if gen_hook_type else 'N/A':<20} | {'PASS' if hook_score else 'FAIL'}")
    print("-" * 58)
    print(f"Golden Hook Expected: {golden_hook_type}")

    if args.llm_judge:
        print("="*60)
        print(" LLM JUDGE RESULTS")
        print("="*60)
        if isinstance(llm_judge_results, dict):
            for k, v in llm_judge_results.items():
                if k not in ["overall_verdict", "top_fix"]:
                    print(f"{k.replace('_', ' ').title():<25} | {v}/5")
            print("-" * 58)
            print(f"VERDICT: {llm_judge_results.get('overall_verdict', 'N/A').upper()}")
            print(f"TOP FIX: {llm_judge_results.get('top_fix', 'N/A')}")
        else:
            print(f"llm_judge: {llm_judge_results}")

    print("="*60)
    print(f"Full report saved to: {result_path}\n")

if __name__ == "__main__":
    main()
