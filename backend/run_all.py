import subprocess, sys, time, os

ROOT = os.path.dirname(os.path.abspath(__file__))

commands = [
    (["-m", "uvicorn", "server.main:app", "--port", "8000"], "FastAPI Server"),
    (["-m", "test_listener"], "Test Listener"),
    (["-m", "agents.extraction"], "Agent 1: Extraction"),
    (["-m", "agents.validation"], "Agent 2: Validation"),
    (["-m", "agents.trend"], "Agent 3: Trend Math"),
    (["-m", "agents.summary"], "Agent 4: Summary AI"),
]

processes = []
try:
    print("🚀 Starting the CareTrack AI Backend...\n")
    for cmd, name in commands:
        print(f"Starting {name}...")
        processes.append(subprocess.Popen([sys.executable] + cmd, cwd=ROOT))
    print("\n✅ All systems running! Press Ctrl+C to stop everything.\n")
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n🛑 Shutting down...")
    for p in processes:
        p.terminate()
    print("Done.")