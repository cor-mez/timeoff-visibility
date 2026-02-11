"""Parse raw HotSchedules paste data into clean 3-column CSVs.

Reads data/raw_boh.txt and data/raw_foh.txt, outputs
data/timeoff_boh.csv and data/timeoff_foh.csv with columns:
Name, Date and Time, Status
"""

from pathlib import Path
import csv
import re
import sys

BASE_DIR = Path(__file__).resolve().parent.parent

RAW_FILES = {
    "boh": (BASE_DIR / "data" / "raw_boh.txt", BASE_DIR / "data" / "timeoff_boh.csv"),
    "foh": (BASE_DIR / "data" / "raw_foh.txt", BASE_DIR / "data" / "timeoff_foh.csv"),
}

HEADER_MARKER = "Date and Time\tType\t"
DATE_PATTERN = re.compile(r"\d{1,2}/\d{1,2}/\d{2}")


def parse_raw_file(raw_path: Path) -> list[dict]:
    """Parse a raw HotSchedules paste file into a list of records."""
    text = raw_path.read_text(encoding="utf-8-sig")  # handles BOM
    lines = text.splitlines()

    # Skip lines until we find the header row
    header_idx = None
    for i, line in enumerate(lines):
        if HEADER_MARKER in line:
            header_idx = i
            break

    if header_idx is None:
        print(f"  Warning: no header row found in {raw_path.name}, skipping")
        return []

    data_lines = lines[header_idx + 1 :]

    records = []
    current_name = None
    date_prefix = None  # for multi-line dates (Through, starts/ends)

    for line in data_lines:
        # Skip blank lines
        if not line.strip():
            continue

        parts = line.split("\t")

        # Data row: tab-separated with 6+ columns
        if len(parts) >= 6:
            if current_name is None:
                date_prefix = None
                continue

            date_and_time = parts[0].strip()
            status = parts[5].strip()

            # Merge date prefix if present (e.g. "Mon 3/16/26 Through" + "Fri 3/20/26")
            if date_prefix:
                date_and_time = date_prefix + " " + date_and_time
                date_prefix = None

            if date_and_time and status:
                records.append({
                    "name": current_name,
                    "date_and_time": date_and_time,
                    "status": status,
                })
            continue

        # Standalone line (no tabs or fewer than 6 columns)
        candidate = line.strip()
        if not candidate:
            continue

        # If it contains a date pattern → date prefix (Through/starts continuation)
        if DATE_PATTERN.search(candidate):
            date_prefix = candidate
        else:
            # Name row
            current_name = candidate
            date_prefix = None

    return records


def write_csv(records: list[dict], csv_path: Path):
    """Write parsed records to a 3-column CSV."""
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Name", "Date and Time", "Status"])
        for rec in records:
            writer.writerow([rec["name"], rec["date_and_time"], rec["status"]])


def main():
    any_parsed = False

    for bucket, (raw_path, csv_path) in RAW_FILES.items():
        if not raw_path.exists():
            print(f"  {raw_path.name} not found, skipping {bucket.upper()}")
            continue

        print(f"  Parsing {raw_path.name} ...")
        records = parse_raw_file(raw_path)
        write_csv(records, csv_path)
        print(f"  Wrote {len(records)} rows → {csv_path.name}")
        any_parsed = True

    if not any_parsed:
        print("Error: no raw files found in data/", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
