from pathlib import Path
import csv
import json
import re
from datetime import datetime, timedelta, timezone
from collections import defaultdict

BASE_DIR = Path(__file__).resolve().parent.parent

INPUTS = {
    "foh": BASE_DIR / "data" / "timeoff_foh.csv",
    "boh": BASE_DIR / "data" / "timeoff_boh.csv",
}

OUTPUT_JSON = BASE_DIR / "docs" / "calendar.json"

DATE_RE = re.compile(r"(\d{1,2}/\d{1,2}/\d{2})")
THROUGH_RE = re.compile(r"\bThrough\b", re.IGNORECASE)
MIDNIGHT_END_RE = re.compile(r"ends\s+12:00\s*AM", re.IGNORECASE)

def parse_mmddyy(s: str) -> datetime:
    return datetime.strptime(s, "%m/%d/%y")

def daterange_exclusive(start: datetime, end: datetime):
    cur = start
    while cur < end:
        yield cur
        cur += timedelta(days=1)

def normalize_header(h: str) -> str:
    return h.replace("\ufeff", "").strip().lower()

def normalize_status(raw: str):
    s = raw.lower()
    if "approved" in s:
        return "approved"
    if "pending" in s:
        return "pending"
    return None

def extract_from_csv(path: Path, bucket: str, calendar):
    if not path.exists():
        return

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        headers = {normalize_header(h): h for h in reader.fieldnames or []}

        name_col = headers.get("name")
        date_col = headers.get("date and time")
        status_col = headers.get("status")

        if not name_col or not date_col or not status_col:
            raise ValueError(f"{path.name} missing required headers")

        for row in reader:
            name = (row.get(name_col) or "").strip()
            status = normalize_status(row.get(status_col) or "")
            date_text = (row.get(date_col) or "")

            if not name or not status:
                continue

            dates = DATE_RE.findall(date_text)
            if not dates:
                continue

            if MIDNIGHT_END_RE.search(date_text):
                dates = dates[:-1]

            if THROUGH_RE.search(date_text) and len(dates) >= 2:
                start = parse_mmddyy(dates[0])
                end = parse_mmddyy(dates[-1])
                for d in daterange_exclusive(start, end):
                    key = d.strftime("%Y-%m-%d")
                    calendar[key][bucket][status].add(name)
            else:
                d = parse_mmddyy(dates[0])
                key = d.strftime("%Y-%m-%d")
                calendar[key][bucket][status].add(name)

def main():
    calendar = defaultdict(lambda: {
        "foh": {"approved": set(), "pending": set()},
        "boh": {"approved": set(), "pending": set()},
    })

    for bucket, path in INPUTS.items():
        extract_from_csv(path, bucket, calendar)

    out = {}

    for date in sorted(calendar.keys()):
        foh = calendar[date]["foh"]
        boh = calendar[date]["boh"]

        approved_all = foh["approved"] | boh["approved"]
        pending_all = foh["pending"] | boh["pending"]

        out[date] = {
            "all": {
                "approved": sorted(approved_all),
                "pending": sorted(pending_all),
                "count": len(approved_all) + len(pending_all),
            },
            "foh": {
                "approved": sorted(foh["approved"]),
                "pending": sorted(foh["pending"]),
                "count": len(foh["approved"]) + len(foh["pending"]),
            },
            "boh": {
                "approved": sorted(boh["approved"]),
                "pending": sorted(boh["pending"]),
                "count": len(boh["approved"]) + len(boh["pending"]),
            },
        }

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "data": out
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print("calendar.json generated")
    print(f"Dates: {len(out)}")

if __name__ == "__main__":
    main()
