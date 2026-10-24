from shared.dnotifier_client import listen_to_channel, send_message, broadcast_progress

def handle_extraction(msg):
    """Runs automatically when Agent 1 (Extraction) finishes reading the image."""
    
    report_id = msg['reportId']
    patient_id = msg['patientId']
    extracted_data = msg.get('data', [])
    
    # Tell the frontend: "I am checking the numbers!"
    broadcast_progress(report_id, "Validation Agent", "Checking values", False)
    
    cleaned_data = []
    
    for item in extracted_data:
        name = item.get('name', '')
        value = item.get('value')
        unit = item.get('unit', '')
        
        # 1. Standardize test names (Rule R13)
        # If the AI read "A1c", change it to the official "HbA1c"
        if name in ["A1c", "Glycated Hb", "HbA1c"]:
            item['name'] = "HbA1c"
        elif name in ["FBS", "Fasting Blood Sugar", "Fasting Glucose"]:
            item['name'] = "Fasting Glucose"
            
        # 2. Convert units (Rule R14)
        # If glucose is in mmol/L, multiply by 18 to convert to mg/dL
        if item['name'] == "Fasting Glucose" and unit == "mmol/L":
            if isinstance(value, (int, float)):
                item['value'] = round(value * 18.0, 1)
                item['unit'] = "mg/dL"
        
        # 3. Apply the Safety Rule (Rule R16)
        # Every single test result must be marked pending until a doctor sees it.
        item['status'] = "pending"
        
        cleaned_data.append(item)
        
    print(f"[Validated] Cleaned {len(cleaned_data)} results.")
        
    # Tell the frontend: "I finished checking!"
    broadcast_progress(report_id, "Validation Agent", "Values verified", True)
    
    # Wake up Agent 3 (Trend Math) by sending the clean data to the next channel
    send_message("report.validated", {
        "reportId": report_id,
        "patientId": patient_id,
        "data": cleaned_data
    })

if __name__ == "__main__":
    print("Agent 2 (Validation) is running and listening...")
    # Sit and listen for Agent 1 to finish
    listen_to_channel("report.extracted", handle_extraction)