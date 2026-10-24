from shared.dnotifier_client import listen_to_channels

def print_msg(channel_name):
    # This creates a custom printing function for each channel
    def callback(msg):
        print(f"\n[{channel_name.upper()}] Message Received:")
        print(msg)
    return callback

if __name__ == "__main__":
    print("Starting Test Listener... Waiting for uploads...")
    
    listen_to_channels({
        "report.uploaded": print_msg("report.uploaded"),
        "report.extracted": print_msg("report.extracted"),
        "report.validated": print_msg("report.validated"),
        "trend.computed": print_msg("trend.computed"),
        "summary.ready": print_msg("summary.ready"),
        "progress-listener": print_msg("progress.update"),
    })