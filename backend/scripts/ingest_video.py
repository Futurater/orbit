from youtube_transcript_api import YouTubeTranscriptApi

def fetch_transcript(video_id: str) -> list:
    """
    Fetches the raw transcript from YouTube.
    Auto-detects available language (works for Hindi, English, etc.)
    Returns a list of dicts: [{"text": "...", "start": 12.3}, ...]
    """
    ytt_api = YouTubeTranscriptApi()

    # List all available transcripts for this video
    transcript_list = ytt_api.list(video_id)

    # Pick the first available transcript (auto-generated or manual)
    available = list(transcript_list)
    first_transcript = available[0]
    print(f"Using transcript language: {first_transcript.language} ({first_transcript.language_code})")

    fetched = first_transcript.fetch()
    transcript = [{"text": snippet.text, "start": snippet.start} for snippet in fetched]
    return transcript

def format_for_claude(transcript:list)->str:
    lines=[]
    for entry in transcript:
        timestamp=entry['start']
        text=entry['text']
        lines.append(f"[{timestamp}s]:{text}")
    return "\n".join(lines)

if __name__ == "__main__":
    VIDEO_ID = "NTHVTY6w2Co"
    transcript = fetch_transcript(VIDEO_ID)
    formatted=format_for_claude(transcript)

    print(f"Total characters sent to Claude: {len(formatted)}")
    print("\n--- First 10 formatted lines ---")
    print("\n".join(formatted.split("\n")[:10]))

