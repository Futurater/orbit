"""
Upload YouTube transcript to S3 for Bedrock Knowledge Base RAG.
(Standalone version — use ingest_video.py for the full pipeline)

Usage:
  python scripts/upload_transcript.py <video_id> <day_id>

Example:
  python scripts/upload_transcript.py NTHVTY6w2Co day_1
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import boto3
from dotenv import load_dotenv
from scripts.ingest_video import fetch_transcript, format_transcript

load_dotenv()

S3_BUCKET = os.getenv("S3_BUCKET", "")
AWS_REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")


def upload(video_id: str, day_id: str):
    if not S3_BUCKET:
        print("❌ S3_BUCKET not set in .env!")
        return

    print(f"\n📹 Fetching transcript for {video_id}...")
    transcript = fetch_transcript(video_id)
    formatted = format_transcript(transcript)
    print(f"  {len(transcript)} segments, {len(formatted)} characters")

    key = f"transcripts/{day_id}_{video_id}.txt"
    s3 = boto3.client("s3", region_name=AWS_REGION)
    s3.put_object(Bucket=S3_BUCKET, Key=key, Body=formatted.encode("utf-8"), ContentType="text/plain")
    print(f"  ✅ Uploaded to s3://{S3_BUCKET}/{key}")
    print(f"  📋 Next: Bedrock Console → Knowledge Bases → Sync")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python scripts/upload_transcript.py <video_id> <day_id>")
        sys.exit(1)
    upload(sys.argv[1], sys.argv[2])
