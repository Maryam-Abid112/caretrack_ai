from shared.dnotifier_client import listen_to_channel, send_message, broadcast_progress
from server.store import load_db, save_db

def handle_validation(msg):
    """Runs automatically when Agent 2 finishes checking the numbers."""
    
    report_id = msg['reportId']
    patient_id = msg['patientId']
    validated_data = msg['data']
    
    # Tell the frontend: "I am doing the math!"
    broadcast_progress(report_id, "Trend Agent", "Comparing with earlier reports", False)
    
    db = load_db()
    
    # Make sure this patient has a spot in the trends database
    if patient_id not in db['trends']:
        db['trends'][patient_id] = {}
        
    patient_history = db['trends'][patient_id]
    calculated_trends = []
    
    for test in validated_data:
        test_name = test['name']
        current_value = test.get('value')
        unit = test.get('unit')
        
        # Rule R9: Never guess missing values. Just skip the math.
        if current_value == "missing":
            continue 
            
        # Make sure this specific test has a history list
        if test_name not in patient_history:
            patient_history[test_name] = []
            
        # Rule R19: ONLY compare with past tests if they have the exact same unit
        history = patient_history[test_name]
        valid_history = [h for h in history if h.get('unit') == unit]
        
        change = 0.0
        change_pct = 0.0
        direction = "stable"
        
        if len(valid_history) > 0:
            # Grab the most recent past test
            last_test = valid_history[-1]
            old_value = last_test['value']
            
            # Rule R20: Calculate change and direction
            change = round(current_value - old_value, 2)
            
            if old_value != 0:
                change_pct = round(abs(change) / old_value * 100, 1)
                
            if change_pct < 3.0:
                direction = "stable" # Less than 3% change means it hasn't really moved
            elif change > 0:
                direction = "rising"
            else:
                direction = "falling"
                
        # Rule R21: Mark if it is inside or outside the reference range
        in_range = True
        if test.get('refRange'):
            try:
                # Turn "4.0-5.6" into two numbers: 4.0 and 5.6
                low_str, high_str = test['refRange'].split('-')
                in_range = (float(low_str) <= current_value <= float(high_str))
            except:
                pass # If the AI extracted the range weirdly, just skip this check

        # Build the final Trend Card data for the frontend
        trend_record = {
            "name": test_name,
            "unit": unit,
            "status": "pending",
            "value": current_value,
            "history": valid_history,
            "change": change,
            "changePct": change_pct,
            "direction": direction,
            "inRange": in_range
        }
        calculated_trends.append(trend_record)
        
        # Add THIS new test to the history so it can be used next time
        patient_history[test_name].append({
            "date": test.get('date', 'Unknown'),
            "value": current_value,
            "unit": unit,
            "reportId": report_id
        })
        
    # Save the updated history back to the hard drive
    save_db(db)
    
    # Tell the frontend: "I finished the math!"
    broadcast_progress(report_id, "Trend Agent", "Comparison complete", True)
    
    # Wake up Agent 4 (Summary AI)
    send_message("trend.computed", {
        "reportId": report_id,
        "patientId": patient_id,
        "trends": calculated_trends
    })

if __name__ == "__main__":
    listen_to_channel("report.validated", handle_validation)