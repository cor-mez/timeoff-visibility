# timeoff-visibility

Team time-off calendar powered by GitHub Pages. Data comes from HotSchedules exports.

## Task: update-timeoff

Weekly update of the time-off calendar. Run from repo root.

### Steps

1. **Ensure raw data is in place:**
   - `data/raw_boh.txt` — raw copy-paste from HotSchedules BOH report
   - `data/raw_foh.txt` — raw copy-paste from HotSchedules FOH report

2. **Run the update pipeline:**
   ```bash
   bash build/update.sh
   ```
   This will: parse raw data → generate CSVs → build calendar.json → validate → commit → push.

   Or run steps individually:
   ```bash
   python3 build/parse_raw.py        # raw .txt → clean CSVs
   python3 build/extract_timeoff.py  # CSVs → docs/calendar.json
   ```

### File Locations

| File | Purpose |
|------|---------|
| `data/raw_boh.txt` | Raw HotSchedules paste (BOH) — gitignored |
| `data/raw_foh.txt` | Raw HotSchedules paste (FOH) — gitignored |
| `data/timeoff_boh.csv` | Cleaned CSV (BOH) — gitignored |
| `data/timeoff_foh.csv` | Cleaned CSV (FOH) — gitignored |
| `build/parse_raw.py` | Raw paste → clean CSV parser |
| `build/extract_timeoff.py` | CSV → calendar.json generator |
| `build/update.sh` | Full pipeline script |
| `docs/calendar.json` | Output consumed by GitHub Pages site |
