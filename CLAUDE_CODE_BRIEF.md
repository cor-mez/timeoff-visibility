# Claude Code Brief: Weekly Time-Off Calendar Update

## Goal

Automate the weekly update of the `timeoff-visibility` GitHub Pages calendar. Replace the current manual spreadsheet cleanup + git workflow with a single Claude Code command.

---

## Repo

**GitHub:** `https://github.com/cor-mez/timeoff-visibility`

**Structure:**
```
timeoff-visibility/
├── data/
│   ├── timeoff_foh.csv        ← (gitignored) cleaned FOH time-off data
│   ├── timeoff_boh.csv        ← (gitignored) cleaned BOH time-off data
│   └── raw_foh.txt            ← NEW: raw paste from HotSchedules (optional)
│   └── raw_boh.txt            ← NEW: raw paste from HotSchedules (optional)
├── build/
│   ├── extract_timeoff.py     ← parses CSVs → calendar.json
│   └── requirements.txt
├── docs/
│   ├── index.html             ← GitHub Pages frontend
│   ├── app.js
│   ├── styles.css
│   └── calendar.json          ← OUTPUT: the data file that powers the site
└── .gitignore
```

---

## Current Manual Workflow (What We're Replacing)

1. Go to HotSchedules → Time Off & Request Report
2. Set filters: Jobs = "BOH General", date range = next week
3. Select All → Copy entire report table
4. Paste into Google Sheets / Excel
5. **Delete junk rows** at top (report title, filter summary, etc.)
6. **Run a fill-down formula** because HotSchedules shows employee names as standalone header rows — data rows beneath them have no name column
7. Save as `data/timeoff_boh.csv`
8. Repeat steps 2-7 with Jobs = FOH roles → `data/timeoff_foh.csv`
9. Run `python build/extract_timeoff.py`
10. `git add docs/calendar.json && git commit -m "Weekly update" && git push`

---

## HotSchedules Raw Data Format

When you select-all and copy from HotSchedules, the data has this structure:

```
Time Off & Request Report                    ← junk header
                                             ← blank rows
Date and Time	Type	Employee Reason	Employee Comments	Submitted	Status	Approval Manager	Manager Comments	Status Change
Abigail Mojica                               ← NAME ROW (standalone, no tab-separated columns)
Sat 2/14/26 All Day	Time Off Needed		Personal time.	12/27/25 12:40 AM	Approved	Paige Wu		1/4/26 10:41 AM
Ashlynn Voges                                ← NAME ROW
Sat 2/14/26 All Day	Time Off Needed		Valentine's Day	9/5/25 5:22 PM	Approved	Cornel Meza		9/18/25 2:01 PM
Maiken Schmidt                               ← NAME ROW (has MULTIPLE data rows below)
Wed 2/11/26 All Day	Time Off Needed		Clarinet Concert	1/6/26 12:08 PM	Approved	Cornel Meza		1/6/26 3:45 PM
Sat 2/14/26 All Day	Time Off Needed		Valentines day	12/17/25 4:39 PM	Approved	Cornel Meza		12/18/25 10:29 AM
Paige Reyes                                  ← NAME ROW
Fri 2/13/26 Through	Time Off Needed		val day	9/17/25 3:28 PM	Approved	Cornel Meza		9/18/25 2:01 PM
 Sat 2/14/26
```

**Key patterns:**
- Name rows have a single value (no tabs) — they're detected because they DON'T match the tab-separated data pattern
- Data rows are tab-separated with 9 columns
- An employee can have multiple data rows beneath their name
- Date formats include: `Sat 2/14/26 All Day`, `Fri 2/13/26 Through\n Sat 2/14/26`, `Sat 2/14/26 starts 3:00 PM\n Sat 2/14/26 ends 11:00 PM`

---

## Required CSV Output Format

The `extract_timeoff.py` script expects CSVs with these columns:

```csv
Name,Date and Time,Status
Abigail Mojica,Sat 2/14/26 All Day,Approved
Ashlynn Voges,Sat 2/14/26 All Day,Approved
Maiken Schmidt,Wed 2/11/26 All Day,Approved
Maiken Schmidt,Sat 2/14/26 All Day,Approved
Paige Reyes,"Fri 2/13/26 Through Sat 2/14/26",Approved
```

Every row must have the employee **Name** filled in (the key transformation from raw → clean).

---

## What Claude Code Should Do

### Task: `update-timeoff`

When invoked, Claude Code should:

### Step 1 — Parse raw data into clean CSVs

Create a new script `build/parse_raw.py` that:

1. Reads `data/raw_boh.txt` and `data/raw_foh.txt` (raw copy-paste from HotSchedules)
2. Strips the junk header lines (everything before the `Date and Time	Type	...` header row)
3. Detects employee name rows (lines with no tab characters, or only one column of text)
4. Fills the name into every subsequent data row until the next name row appears
5. Extracts the 3 required columns: **Name**, **Date and Time**, **Status**
6. Writes clean output to `data/timeoff_boh.csv` and `data/timeoff_foh.csv`

**Edge cases to handle:**
- Multi-line date entries (e.g., "Through" spans two lines — rejoin them)
- Employees with multiple time-off entries
- Entries with "starts X:XX PM / ends X:XX PM" partial-day format
- Blank or malformed rows should be skipped
- BOM characters (UTF-8 `\ufeff`) at start of file

### Step 2 — Run the extraction

```bash
cd /path/to/timeoff-visibility
python build/extract_timeoff.py
```

This generates `docs/calendar.json` from the cleaned CSVs.

### Step 3 — Validate

Before committing, check:
- `docs/calendar.json` exists and is valid JSON
- It contains date entries (not empty)
- No employee appears more than 20 times in a single week (likely a parsing error)
- Print a summary: number of dates, total FOH/BOH entries, any pending vs approved counts

### Step 4 — Git commit and push

```bash
git add docs/calendar.json
git commit -m "Weekly time-off calendar update — $(date '+%b %d, %Y')"
git push origin main
```

---

## Simplified Weekly Workflow (After Automation)

1. Go to HotSchedules → Time Off & Request Report
2. Set Jobs = BOH General → Select All → Copy → Paste into `data/raw_boh.txt`
3. Set Jobs = FOH → Select All → Copy → Paste into `data/raw_foh.txt`
4. Run: **`claude "update-timeoff"`** (or equivalent Claude Code command)
5. Done. Site updates automatically via GitHub Pages.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `build/parse_raw.py` | **CREATE** | Parses raw HotSchedules paste → clean CSVs |
| `build/update.sh` | **CREATE** | Shell script that chains: parse → extract → validate → commit → push |
| `CLAUDE.md` | **CREATE** | Claude Code memory file with the `update-timeoff` task instructions |
| `.gitignore` | **MODIFY** | Add `data/raw_*.txt` to gitignore |

---

## Notes

- The `data/` folder is gitignored for privacy (contains employee names). Only `docs/calendar.json` gets committed.
- The GitHub Pages site at `https://cor-mez.github.io/timeoff-visibility/` auto-deploys from `docs/` on the `main` branch.
- Current date range filter on HotSchedules is set manually — this could eventually be automated via Claude in Chrome but is out of scope for this brief.
