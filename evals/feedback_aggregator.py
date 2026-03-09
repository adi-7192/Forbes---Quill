import json
import os
import glob
from datetime import datetime
from collections import Counter

def aggregate_feedback():
    base_dir = "/Users/adi7192/Documents/Forbes MVP"
    results_dir = os.path.join(base_dir, "evals/results")
    
    # 1. Find the latest export file in the downloads or project root
    # Since we can't easily find it in the user's Downloads folder, we assume they place it in the project root or we find any .json file starting with feedback_export_
    export_files = glob.glob(os.path.join(base_dir, "feedback_export_*.json"))
    
    if not export_files:
        print("Error: No feedback_export_*.json files found in project root.")
        return

    latest_file = max(export_files, key=os.path.getmtime)
    print(f"--- Analyzing feedback from: {latest_file} ---")

    with open(latest_file, 'r') as f:
        events = json.load(f).values()

    # Aggregates
    regeneration_stats = {} # module -> [regenerated_count, total_count]
    style_scores_per_version = {} # version -> [total_score, count]
    forbidden_words_counter = Counter()

    for event in events:
        module = event.get('module', 'unknown')
        if module not in regeneration_stats:
            regeneration_stats[module] = [0, 0]
        
        regeneration_stats[module][1] += 1
        if 'regenerated' in event.get('signals', []):
            regeneration_stats[module][0] += 1

        version = event.get('promptVersion', 'unknown')
        score = event.get('styleScore')
        if score is not None:
            if version not in style_scores_per_version:
                style_scores_per_version[version] = [0, 0]
            style_scores_per_version[version][0] += score
            style_scores_per_version[version][1] += 1

        for word in event.get('forbiddenWords', []):
            forbidden_words_counter[word] += 1

    # Analysis
    # Most regenerated module
    most_regenerated_module = "None"
    max_regen_rate = -1
    for mod, counts in regeneration_stats.items():
        rate = counts[0] / counts[1] if counts[1] > 0 else 0
        if rate > max_regen_rate:
            max_regen_rate = rate
            most_regenerated_module = f"{mod.capitalize()} ({rate:.1%})"

    # Lowest style score version
    lowest_version = "None"
    min_avg_score = 101
    for ver, scores in style_scores_per_version.items():
        avg = scores[0] / scores[1] if scores[1] > 0 else 0
        if avg < min_avg_score:
            min_avg_score = avg
            lowest_version = f"{ver} (Avg: {avg:.1f})"

    # Top forbidden word
    top_forbidden = forbidden_words_counter.most_common(1)
    top_word_display = "None"
    if top_forbidden:
        top_word_display = f"\"{top_forbidden[0][0]}\" ({top_forbidden[0][1]} occurrences)"

    # Recommendations logic
    module_action = "Maintain current prompt thresholds."
    if "Article" in most_regenerated_module or "Draft" in most_regenerated_module:
        module_action = "Review ARTICLE_DRAFT_PROMPT hook constraint and example similarity."
    elif "Research" in most_regenerated_module:
        module_action = "Diversify RSS coverage or check RESEARCH_BRIEF_PROMPT source verify rules."

    style_action = "Prompt versions performing within expected branding variance."
    if min_avg_score < 80:
        style_action = f"Strengthen voice constraints in FORBES_BRAND_VOICE for {lowest_version.split()[0]}."

    forbidden_action = "No significant violations detected."
    if top_forbidden:
        forbidden_action = f"Add explicit synonym suggestions for \"{top_forbidden[0][0]}\" to the FORBES_BRAND_VOICE section."

    # Write Report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_filename = f"feedback_summary_{timestamp}.txt"
    report_path = os.path.join(results_dir, report_filename)
    
    os.makedirs(results_dir, exist_ok=True)
    
    report_content = f"""MODULE WITH MOST REGENERATIONS: {most_regenerated_module}
→ Suggested action: {module_action}

LOWEST AVG STYLE SCORE: {lowest_version}
→ Suggested action: {style_action}

TOP FORBIDDEN WORD VIOLATION: {top_word_display}
→ Suggested action: {forbidden_action}
"""

    with open(report_path, 'w') as f:
        f.write(report_content)

    print(f"\n--- Feedback Summary Report Generated ---")
    print(report_content)
    print(f"Report saved to: {report_path}")

if __name__ == "__main__":
    aggregate_feedback()
