import json
import re
from typing import Iterable, List


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def strip_bullet_prefix(line: str) -> str:
    return re.sub(r"^\s*(?:[-•*]|\d+[.)]\s*)\s*", "", line).strip()


def safe_json_array(items: Iterable[str]) -> str:
    return json.dumps([i for i in items if i], ensure_ascii=False)


def clean_lines(block: str) -> List[str]:
    lines = []
    for raw in (block or "").splitlines():
        cleaned = strip_bullet_prefix(raw)
        if len(cleaned) >= 3:
            lines.append(cleaned)
    return lines

