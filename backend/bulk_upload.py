import os
import requests
import time

# Jis folder se reports uthani hain
FOLDER_PATH = "data/sample-reports"
SERVER_URL = "http://localhost:8000/upload"

def upload_all_reports():
    # Check karein ke folder exist karta hai ya nahi
    if not os.path.exists(FOLDER_PATH):
        print(f"❌ Folder '{FOLDER_PATH}' not found!")
        return

    # Folder mein se sirf files (images) nikaalein
    files_in_folder = [f for f in os.listdir(FOLDER_PATH) if os.path.isfile(os.path.join(FOLDER_PATH, f))]
    
    if len(files_in_folder) == 0:
        print(f"⚠️ No reports found in {FOLDER_PATH}.")
        return
        
    print(f"🚀 Found {len(files_in_folder)} reports. Starting automatic upload...\n")

    patient_counter = 1

    # Har file ko loop ke zariye server ko bhejein
    for filename in files_in_folder:
        file_path = os.path.join(FOLDER_PATH, filename)
        patient_id = f"P{patient_counter}"
        
        print(f"📤 Uploading {filename} (Assigned to {patient_id})...")
        
        # File ko open karke server par POST request bhejein
        with open(file_path, "rb") as image_file:
            files = {"file": (filename, image_file, "image/jpeg")}
            data = {"patientId": patient_id}
            
            try:
                response = requests.post(SERVER_URL, data=data, files=files)
                if response.status_code == 200:
                    print(f"✅ Success: {response.json()}")
                else:
                    print(f"❌ Failed: {response.text}")
            except Exception as e:
                print(f"❌ Connection error: {e}. Is the server running?")
                
        # Agli report bhejne se pehle 3 second ka gap dein taake backend araam se process kar le
        time.sleep(3)
        patient_counter += 1
        
    print("\n All reports have been sent to the backend!")

if __name__ == "__main__":
    upload_all_reports()