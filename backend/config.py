"""
Centralized configuration for Project Orbit backend.
Change these values once — every module reads from here.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ─── AWS REGION ─────────────────────────────────────────────
AWS_REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

# ─── BEDROCK MODEL IDs ─────────────────────────────────────
MODEL_FAST = os.getenv("BEDROCK_MODEL_ID", "us.amazon.nova-2-lite-v1:0")
MODEL_REASONING = os.getenv("BEDROCK_MODEL_ID", "us.amazon.nova-2-lite-v1:0")

# ─── AGENT THRESHOLDS ──────────────────────────────────────
STRICT_DIDI_MAX_ATTEMPTS = 3   # attempt < 3 → Strict Didi  |  >= 3 → Mentor
MENTOR_VIVA_THRESHOLD = 2      # viva_attempt < 2 → Strict Didi  |  >= 2 → Mentor

# ─── DYNAMODB ──────────────────────────────────────────────
DYNAMO_TABLE_NAME = os.getenv("DYNAMO_TABLE_NAME", "StudentProgress")
USE_LOCAL_DB = os.getenv("USE_LOCAL_DB", "true").lower() == "true"

# ─── S3 + RAG (Knowledge Bases) ────────────────────────────
S3_BUCKET = os.getenv("S3_BUCKET", "")
KNOWLEDGE_BASE_ID = os.getenv("KNOWLEDGE_BASE_ID", "")

# ─── BEDROCK GUARDRAILS ────────────────────────────────────
GUARDRAIL_ID = os.getenv("GUARDRAIL_ID", "")
GUARDRAIL_VERSION = os.getenv("GUARDRAIL_VERSION", "DRAFT")

# ─── CORS ──────────────────────────────────────────────────
CORS_ORIGINS = ["*"]
