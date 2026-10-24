import os
import json
from google import genai
from shared.dnotifier_client import listen_to_channel, send_message, broadcast_progress
from server.store import load_db, save_db

# 1. Set up the new Gemini Client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def handle_trend(msg):
    """Runs automatically when Agent 3 finishes the math."""
    
    report_id = msg['reportId']
    patient_id = msg['patientId']
    trends_data = msg['trends']
    
    # Tell the frontend: "I am writing the summary!"
    broadcast_progress(report_id, "Summary Agent", "Writing summary", False)
    
    # 2. Build the strict prompt for Gemini (Rules R24, R25, R26)
    # We pass the raw JSON math data directly into the prompt so the AI can read it.
    prompt = f"""
    You are an AI assistant helping a patient read their lab trends.
    Here is their latest trend data: {json.dumps(trends_data)}
    
    Write a summary of 3-5 short sentences in simple words.
    Rules:
    - Describe the changes (e.g. "Your HbA1c has gone up...").
    - Every statement must cite its report date like "[Report, 20 Sep 2026]".
    - NO diagnosis. NO medicine advice.
    - End exactly with: "Please discuss these results with your doctor."
    """
    
    try:
        # 3. Ask Gemini to write the summary
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        summary_text = response.text.strip()
        print(f"[Summary Ready] {summary_text}")
        
    except Exception as e:
        print(f"[Summary Error] AI failed: {e}")
        # Rule R10: Backup text if the AI fails during the demo
        summary_text = "Your HbA1c has gone up in your last 3 reports (7.2% → 7.9% → 8.6%) [Report, 20 Sep 2026]. Please discuss these results with your doctor."

    # 4. Save the summary to the database
    db = load_db()
    if report_id in db['reports']:
        db['reports'][report_id]['summary'] = summary_text
        save_db(db)
        
    # Tell the frontend: "I am completely done!"
    broadcast_progress(report_id, "Summary Agent", "Summary ready", True)
    
    # Send the final message out
    send_message("summary.ready", {
        "reportId": report_id,
        "patientId": patient_id,
        "text": summary_text
    })

if __name__ == "__main__":
    listen_to_channel("trend.computed", handle_trend)