"""
DynamoDB state layer for Project Orbit.
Tracks student progress per checkpoint: attempt counts, viva status, etc.

When USE_LOCAL_DB=true (default for local dev), uses an in-memory dict.
When USE_LOCAL_DB=false (Lambda deployment), uses real DynamoDB.
"""
import boto3
from config import AWS_REGION, DYNAMO_TABLE_NAME, USE_LOCAL_DB

# ─── IN-MEMORY STORE (local dev) ───────────────────────────
_local_store: dict[str, dict] = {}


def _default_session(student_id: str, checkpoint_id: str) -> dict:
    """Returns a fresh session state dict."""
    return {
        "student_id": student_id,
        "checkpoint_id": checkpoint_id,
        "attempt_count": 0,
        "viva_attempt_count": 0,
        "viva_status": "NOT_STARTED",       # NOT_STARTED | LOCKED | COMPLETED
        "viva_question": None,
    }


def _key(student_id: str, checkpoint_id: str) -> str:
    return f"{student_id}#{checkpoint_id}"


# ═══════════════════════════════════════════════════════════
# PUBLIC API
# ═══════════════════════════════════════════════════════════

def get_session(student_id: str, checkpoint_id: str) -> dict:
    """Fetch current session state. Creates a fresh one if not found."""
    if USE_LOCAL_DB:
        k = _key(student_id, checkpoint_id)
        if k not in _local_store:
            _local_store[k] = _default_session(student_id, checkpoint_id)
        return _local_store[k]

    # ── Real DynamoDB ──
    table = boto3.resource("dynamodb", region_name=AWS_REGION).Table(DYNAMO_TABLE_NAME)
    resp = table.get_item(Key={"student_id": student_id, "checkpoint_id": checkpoint_id})
    if "Item" in resp:
        return resp["Item"]

    # First visit — create a fresh row
    item = _default_session(student_id, checkpoint_id)
    table.put_item(Item=item)
    return item


def increment_attempt(student_id: str, checkpoint_id: str) -> int:
    """Atomically increment attempt_count, return new value."""
    if USE_LOCAL_DB:
        session = get_session(student_id, checkpoint_id)
        session["attempt_count"] += 1
        return session["attempt_count"]

    table = boto3.resource("dynamodb", region_name=AWS_REGION).Table(DYNAMO_TABLE_NAME)
    resp = table.update_item(
        Key={"student_id": student_id, "checkpoint_id": checkpoint_id},
        UpdateExpression="SET attempt_count = if_not_exists(attempt_count, :zero) + :inc",
        ExpressionAttributeValues={":inc": 1, ":zero": 0},
        ReturnValues="UPDATED_NEW",
    )
    return int(resp["Attributes"]["attempt_count"])


def increment_viva_attempt(student_id: str, checkpoint_id: str) -> int:
    """Atomically increment viva_attempt_count, return new value."""
    if USE_LOCAL_DB:
        session = get_session(student_id, checkpoint_id)
        session["viva_attempt_count"] += 1
        return session["viva_attempt_count"]

    table = boto3.resource("dynamodb", region_name=AWS_REGION).Table(DYNAMO_TABLE_NAME)
    resp = table.update_item(
        Key={"student_id": student_id, "checkpoint_id": checkpoint_id},
        UpdateExpression="SET viva_attempt_count = if_not_exists(viva_attempt_count, :zero) + :inc",
        ExpressionAttributeValues={":inc": 1, ":zero": 0},
        ReturnValues="UPDATED_NEW",
    )
    return int(resp["Attributes"]["viva_attempt_count"])


def lock_viva(student_id: str, checkpoint_id: str, question: str) -> None:
    """Set viva_status=LOCKED and store the generated question."""
    if USE_LOCAL_DB:
        session = get_session(student_id, checkpoint_id)
        session["viva_status"] = "LOCKED"
        session["viva_question"] = question
        return

    table = boto3.resource("dynamodb", region_name=AWS_REGION).Table(DYNAMO_TABLE_NAME)
    table.update_item(
        Key={"student_id": student_id, "checkpoint_id": checkpoint_id},
        UpdateExpression="SET viva_status = :locked, viva_question = :q",
        ExpressionAttributeValues={":locked": "LOCKED", ":q": question},
    )


def complete_session(student_id: str, checkpoint_id: str) -> None:
    """Mark checkpoint as COMPLETED — student passed the viva."""
    if USE_LOCAL_DB:
        session = get_session(student_id, checkpoint_id)
        session["viva_status"] = "COMPLETED"
        return

    table = boto3.resource("dynamodb", region_name=AWS_REGION).Table(DYNAMO_TABLE_NAME)
    table.update_item(
        Key={"student_id": student_id, "checkpoint_id": checkpoint_id},
        UpdateExpression="SET viva_status = :done",
        ExpressionAttributeValues={":done": "COMPLETED"},
    )


def get_all_sessions(student_id: str, checkpoint_ids: list[str]) -> dict[str, dict]:
    """Get session state for multiple checkpoints. Used for day-unlock checks."""
    results = {}
    for cid in checkpoint_ids:
        results[cid] = get_session(student_id, cid)
    return results
