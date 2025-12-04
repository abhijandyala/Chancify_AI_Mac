import csv
import re
from typing import Dict


def load_college_mapping(path: str) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    try:
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            name_field = next((c for c in reader.fieldnames or [] if "name" in c.lower()), None)
            if not name_field:
                return mapping
            for row in reader:
                official = row.get(name_field, "")
                norm = normalize_name(official)
                if norm:
                    mapping[norm] = official
    except FileNotFoundError:
        pass
    return mapping


def normalize_name(raw: str) -> str:
    s = raw.lower()
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\b(university|college|of|the)\b", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def normalize_college_name(raw: str, mapping: Dict[str, str]) -> str:
    norm = normalize_name(raw)
    if norm in mapping:
        return mapping[norm]
    return raw.strip()

