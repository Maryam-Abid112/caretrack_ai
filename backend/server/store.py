import json
import os

# 1. Find the exact location of db.json on your computer
# __file__ means "this current file" (store.py)
# We go one folder up ('..'), then into the 'data' folder to find 'db.json'
DB_PATH = os.path.join(os.path.dirname(__file__), '../data/db.json')

def load_db():
    """Reads the JSON file and turns it into a Python dictionary."""
    
    # Safety check: If the file got deleted or doesn't exist yet, 
    # return a blank skeleton so the code doesn't crash.
    if not os.path.exists(DB_PATH):
        return {"patients": {}, "reports": {}, "trends": {}}
        
    # Open the file in 'r' (read) mode
    with open(DB_PATH, 'r') as file:
        # json.load() translates the raw text into a Python dictionary
        data = json.load(file)
        return data

def save_db(data):
    """Takes a Python dictionary and overwrites the JSON file with it."""
    
    # Open the file in 'w' (write) mode. This completely overwrites the old file.
    with open(DB_PATH, 'w') as file:
        # json.dump() translates the Python dictionary back into text.
        # indent=2 makes the text file pretty and readable for humans.
        json.dump(data, file, indent=2)