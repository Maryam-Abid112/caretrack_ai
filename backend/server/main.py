from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import shutil
import uuid
import os
from server.store import load_db, save_db
from shared.dnotifier_client import send_message

app = FastAPI()

# INTEGRATION NOTE: CORS (Cross-Origin Resource Sharing) is a security feature.
# Without this block, your partner's frontend website would be blocked from 
# sending files to your backend. This tells the browser "It's okay, let them talk."
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
def upload_report(patientId: str = Form(...), file: UploadFile = File(...)):
    """This function runs the moment the frontend sends a file."""
    
    # 1. Create a random, unique ID for this report (e.g., 'R-a1b2c3')
    report_id = f"R-{uuid.uuid4().hex[:6]}"
    
    # 2. Figure out where to save the picture on your hard drive
    file_path = f"uploads/{report_id}_{file.filename}"
    
    # 3. Actually save the picture into the 'uploads' folder
    # shutil.copyfileobj takes the raw internet data and writes it to a file.
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 4. Save a record in your fake database (db.json)
    db = load_db()
    db["reports"][report_id] = {
        "patientId": patientId,
        "status": "processing",
        "file": file_path
    }
    save_db(db)
    
    # 5. THE MOST IMPORTANT PART: Wake up Agent 1 using DNotifier
    # We tell the 'report.uploaded' channel that a new file is ready to be read.
    send_message("report.uploaded", {
        "reportId": report_id,
        "patientId": patientId,
        "filePath": file_path
    })
    
    # 6. Immediately reply to the frontend so it can start showing the loading screen
    return {"reportId": report_id, "status": "processing"}