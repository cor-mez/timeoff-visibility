# Claude Code Brief: Staffing View — Hour-by-Hour Gap Analysis

## Goal

Add a "Staffing" view to TimeOff Board that replaces the separate Off-By-Hour website and Google Sheets workflow. Managers paste their HotSchedules Availability Report alongside the existing Time-Off paste, and the app produces a color-coded hour-by-hour staffing heatmap showing where they're overstaffed, adequate, or short.

This eliminates: downloading CSVs, uploading to a separate website, downloading processed CSVs, and pasting into Google Sheets. The entire pipeline happens in-browser from a single management page.

---

## Current Manual Workflow (What We're Replacing)

1. Download BOH Availability CSV from HotSchedules
2. Download FOH Availability CSV from HotSchedules
3. Download Time-Off report from HotSchedules (already handled by TimeOff Board)
4. Upload all files to Off-By-Hour website (cor-mez.github.io/Off-By-Hour-Web)
5. Website processes and outputs 4 CSVs: BOHByHour, FOHByHour, BOHTOByHour, FOHTOByHour
6. Download those 4 CSVs
7. Paste into Google Sheets "Availability Map"
8. Sheet applies effectiveness rate, subtracts time-off, compares against staffing needs
9. Read the color-coded gap analysis

**New workflow:** Paste availability + time-off data in TimeOff Board → see the heatmap instantly.

---

## Data Sources & Formats

### 1. Availability CSV (from HotSchedules)

Exported from HotSchedules as a CSV. One file per department (BOH, FOH).

```csv
Employees,Mon  2/16/26,Tue  2/17/26,Wed  2/18/26,Thu  2/19/26,Fri  2/20/26,Sat  2/21/26
"Abigail Mojica","Partially Available 4:00 PM - 10:00 PM","Unavailable All Day","Partially Available 4:00 PM - 11:00 PM","Partially Available 4:00 PM - 10:00 PM","Partially Available 4:00 PM - 11:00 PM","Available All Day"
"Ajhai Alexander","Unavailable All Day","Partially Available 2:00 PM - 11:00 PM","Partially Available 3:00 PM - 11:00 PM","Partially Available 10:00 AM - 5:00 PM","Unavailable All Day","Partially Available 10:00 AM - 6:00 PM"
"Alexa Ruscher","Available All Day","Available All Day","Available All Day","Available All Day","Partially Available 12:00 AM - 5:15 PM","Partially Available 12:00 AM - 5:00 PM"
```

**Cell value patterns:**
- `"Available All Day"` → available all hours (5:00 AM - 11:00 PM for counting purposes)
- `"Unavailable All Day"` → not available any hour
- `"Partially Available X:XX AM/PM - Y:YY AM/PM"` → available during that time range
- `"Partially Available 7:00 AM - 12:00 PM, 3:00 PM - 10:00 PM"` → multiple ranges (split on comma)
- Times use 12-hour format with AM/PM
- `12:00 AM` means midnight (start of day)
- `12:00 AM` as end time means midnight (end of day / through close)

**Column headers:** Day abbreviation + date, e.g., `Mon  2/16/26` (note: double space between day and date)

### 2. Time-Off Data (already in TimeOff Board)

The existing time-off paste data from HotSchedules Time Off & Request Report. Already parsed by TimeOff Board into per-date entries with names and statuses.

For the staffing view, we need to convert time-off entries into hour-by-hour counts to subtract from availability. The logic:
- `"All Day"` time-off → subtract 1 from every hour that day
- `"starts X:XX PM / ends Y:YY PM"` → subtract 1 from hours within that range
- `"Through"` ranges → subtract 1 from every hour on each day in the range

### 3. Staffing Needs (operator-configured targets)

Each store sets their staffing targets per hour per department. This is the number of people they NEED working each hour.

**Default template (based on typical CFA):**

| Hour | BOH | FOH |
|------|-----|-----|
| 5 AM | 4 | 4 |
| 6 AM | 5 | 4 |
| 7 AM | 5 | 6 |
| 8 AM | 6 | 6 |
| 9 AM | 8 | 8 |
| 10 AM | 8 | 7 |
| 11 AM | 9 | 10 |
| 12 PM | 11 | 10 |
| 1 PM | 10 | 11 |
| 2 PM | 7 | 8 |
| 3 PM | 7 | 9 |
| 4 PM | 7 | 7 |
| 5 PM | 7 | 6 |
| 6 PM | 3 | 4 |
| 7 PM | 4 | 5 |
| 8 PM | 4 | 5 |
| 9 PM | 7 | 6 |
| 10 PM | 4 | 5 |
| 11 PM | 4 | 6 |

These should be editable per store and saved to Firebase. Operators can customize by day of week too if needed (different targets for Saturday vs Tuesday).

### 4. Effectiveness Rate (tier-based per employee)

Accounts for the fact that you can't schedule every available person for every available hour. Each employee is tagged with a scheduling tier that reflects how many hours they typically work relative to their availability.

**Three tiers:**

| Tier | Label | Typical Weekly Hours | Effectiveness Rate |
|------|-------|---------------------|--------------------|
| Full-time | 🟢 Full | 35-40 hrs | ~70% of available hours |
| Part-time | 🟡 Part | 20-30 hrs | ~45% of available hours |
| Limited | 🔴 Limited | 10-15 hrs | ~20% of available hours |

**How it works:**

When the manager first pastes the availability report, the app shows a list of all employees with a toggle next to each name: Full / Part / Limited. Default is Part-time.

The manager flips through the list and tags each person. This takes about 2-3 minutes for a full roster, and only needs to be updated when the team changes (new hires, departures, students changing availability).

**Effectiveness calculation:**

For each hour, instead of counting every available person equally:
- Full-time person available = counts as 0.70 of a person
- Part-time person available = counts as 0.45 of a person
- Limited person available = counts as 0.20 of a person

`Effective availability at 2PM Tuesday = (5 full × 0.70) + (8 part × 0.45) + (3 limited × 0.20) = 3.5 + 3.6 + 0.6 = 7.7 → 8 people`

This is more accurate than a single team-wide percentage because it accounts for the mix of people available at each specific hour. A Tuesday morning with mostly full-timers available will show higher effective count than a Friday evening with mostly limited-availability students.

**Employee tiers are saved to Firebase per store:**

```
stores/{storeId}/employeeTiers/
  "Abigail Mojica": "part"
  "Ana Toscano Flores": "full"
  "Eve Stephensen": "limited"
  ...
```

**Fallback:** If no tiers are set, all employees default to "part" (45%). The manager can also override the tier percentages in settings (e.g., if their "full-time" people average 80% instead of 70%).

---

## Processing Pipeline (All Client-Side)

```
Step 1: Parse Availability CSVs
  For each employee, for each day, for each hour (5AM-11PM):
    → Is the employee available during that hour? (yes/no)
  Output: per-employee, per-hour availability grid

Step 2: Apply tier-based effectiveness (per employee, per hour)
  For each hour, instead of counting heads:
    → Full-time employee available = 0.70
    → Part-time employee available = 0.45
    → Limited employee available = 0.20
  Output: weighted effective availability per hour per day

Step 3: Parse Time-Off into hourly counts
  For each time-off entry that falls within this week:
    → Which hours on which days is this person off?
  Output: hourly time-off count per department per day

Step 4: Calculate net staffing
  Net = Effective availability - Time-off count

Step 5: Compare against staffing needs
  Gap = Net available - Staffing need
  Positive = overstaffed (green)
  Zero = exactly staffed (yellow)
  Negative = understaffed (red)
```

### Hour Counting Logic

For "Partially Available 4:00 PM - 10:00 PM":
- Convert to 24h: 16:00 - 22:00
- Person is counted as available for hours: 4 PM, 5 PM, 6 PM, 7 PM, 8 PM, 9 PM
- They are NOT counted for 10 PM (end time is exclusive — they leave at 10)

For "Available All Day":
- Count for all hours 5 AM through 11 PM (standard operating range)

For multiple ranges "7:00 AM - 12:00 PM, 3:00 PM - 10:00 PM":
- Split on comma, process each range, union the hours

---

## Output CSV Formats (for reference — matches existing workflow)

The app should also allow downloading these CSVs so operators can still use them in their spreadsheets if they want.

**BOHByHour.csv / FOHByHour.csv** (raw availability counts):
```csv
Hour,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday
5 AM,14,19,18,19,21,28
6 AM,14,19,18,19,21,29
...
11 PM,12,16,13,14,15,14
```

**BOHTOByHour.csv / FOHTOByHour.csv** (time-off counts per hour):
```csv
Hour,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday
5 AM,0,2,1,0,0,1
6 AM,0,2,1,0,0,1
...
11 PM,0,2,0,0,1,2
```

---

## Firebase Data Structure (additions to existing store)

```
stores/
  {storeId}/
    ... (existing: name, managementKey, calendar, etc.)
    settings/
      tierRates/
        full: 0.70                   ← editable, default 0.70
        part: 0.45                   ← editable, default 0.45
        limited: 0.20               ← editable, default 0.20
      staffingNeeds/
        boh/
          "5AM": 4
          "6AM": 5
          ... (or per-day: "mon_5AM": 4)
        foh/
          "5AM": 4
          "6AM": 4
          ...
    employeeTiers/                   ← per-employee tier assignments
      boh/
        "Abigail Mojica": "part"
        "Ana Toscano Flores": "full"
        "Eve Stephensen": "limited"
        ...
      foh/
        "Criedynce Davis": "full"
        "Brianna Castro": "limited"
        ...
    staffing/                        ← weekly staffing data
      lastUpdated: "2026-02-16T..."
      weekStart: "2026-02-16"
      boh/
        availability/               ← raw counts per hour per day
          "5AM": { mon: 14, tue: 19, wed: 18, thu: 19, fri: 21, sat: 28 }
          ...
        effective/                  ← tier-weighted counts per hour per day
          "5AM": { mon: 8.2, tue: 11.4, ... }
          ...
        timeoff/                    ← time-off deductions per hour per day
          "5AM": { mon: 0, tue: 2, wed: 1, thu: 0, fri: 0, sat: 1 }
          ...
      foh/
        availability/
          ...
        effective/
          ...
        timeoff/
          ...
```

---

## UI Changes

### Management View — New Sections

Add two new paste areas below the existing BOH/FOH time-off paste boxes:

**Section: "Availability Reports"**

```
BOH Availability
[Large paste box]
"Go to HotSchedules → Availability Report → set Jobs to BOH → Export CSV → 
Open the CSV → Select All (⌘A) → Copy (⌘C) → Paste here (⌘V)

No formatting needed — just paste the whole CSV."

FOH Availability  
[Large paste box]
"Same steps, but set Jobs to FOH roles"
```

**Section: "Team Tiers" (appears after first availability paste)**

After parsing the availability data, show a list of all employees with a 3-way toggle:

```
Team Member Scheduling Tiers
Set each team member's typical scheduling level. This determines
how we calculate realistic staffing numbers.

🟢 Full = 35-40 hrs/wk    🟡 Part = 20-30 hrs/wk    🔴 Limited = 10-15 hrs/wk

BOH (42 people)
  Ana Toscano Flores     [🟢 Full ] [🟡 Part] [🔴 Ltd]
  Ashlynn Voges          [🟢 Full ] [🟡 Part] [🔴 Ltd]
  Abigail Mojica         [🟢 Full] [🟡 Part ] [🔴 Ltd]
  Eve Stephensen         [🟢 Full] [🟡 Part] [🔴 Ltd ]
  ...

FOH (73 people)
  Criedynce Davis        [🟢 Full ] [🟡 Part] [🔴 Ltd]
  Brianna Castro         [🟢 Full] [🟡 Part] [🔴 Ltd ]
  ...

[Quick actions: "Set all to Part" | "Set all to Full"]
[Save Tiers]
```

Tiers persist in Firebase — only need updating when the roster changes.

**Section: "Store Settings" (collapsible)**

```
Tier Effectiveness Rates (editable, pre-filled with defaults)
  Full-time: [70] %    Part-time: [45] %    Limited: [20] %

Staffing Needs (per hour)
  [Editable table: Hour | BOH Target | FOH Target]
  [Pre-filled with CFA defaults, editable]
  [Save Settings button]
```

**Buttons:**
- "Update Calendar" (existing — processes time-off data)
- "Update Staffing" (new — processes availability + time-off + settings → staffing heatmap)
- "Download CSVs" (new — downloads the 4 intermediate CSVs for operators who still want them)

### New Page: Staffing View (`/s/{storeId}/staffing` or tab within team view)

This is the hour-by-hour heatmap that replaces the Google Sheet.

**Layout:**

```
[Week selector: ← Feb 16 - Feb 21 →]

[BOH / FOH / Combined toggle]

Hour-by-Hour Staffing Grid:
┌──────────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Hour     │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │
├──────────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ 5:00 AM  │  4  │  8  │  6  │  7  │  8  │ 12  │
│ 6:00 AM  │  4  │  8  │  6  │  7  │  8  │ 13  │
│ ...      │     │     │     │     │     │     │
│ 11:00 PM │  3  │  5  │  4  │  4  │  5  │  5  │
└──────────┴─────┴─────┴─────┴─────┴─────┴─────┘

Numbers shown = Net available (effective availability - time-off)
Colors = comparison against staffing needs:
  🟢 Green:  Net ≥ Need + 2  (comfortable surplus)
  🟡 Yellow: Net = Need ± 1  (tight but ok)  
  🟠 Orange: Net = Need - 2 or -3  (getting short)
  🔴 Red:    Net ≤ Need - 4  (critically understaffed)
```

**Click/tap a cell** → shows detail:
```
Tuesday 2:00 PM — BOH
  Raw available: 30
  Effective (×55%): 16.5 → 17
  Time-off: -2
  Net available: 15
  Staffing need: 7
  Surplus: +8 ✅
```

**Summary row at bottom:**
```
Total WDH (Work Day Hours): Mon: 6 | Tue: 18 | Wed: 1 | ...
```

### Team View — New Tab

The team view (read-only) gets a "Staffing" tab alongside the calendar. Team members can see the hour-by-hour grid but can't see individual names — just the counts and colors. This gives them visibility into when the store is short-staffed (and might want to pick up shifts).

---

## Implementation Notes

### Availability CSV Parsing

The availability CSV comes from HotSchedules as a standard CSV file. When operators open it and copy-paste, it may come as:
- Tab-separated (if pasted from Excel/Sheets after opening the CSV)
- Comma-separated with quotes (if pasted from a text editor)
- Either way, the parser should handle both formats

**Column detection:** Look for day abbreviations in headers: `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`

**Name column:** First column, labeled `Employees` or `Employee`

### Time Parsing

Convert "4:00 PM" → 16, "12:00 AM" → 0, "5:30 AM" → 5 (round down to hour)

For availability counting, if someone is available "4:00 PM - 10:00 PM":
- They count for hours 4 PM through 9 PM (end exclusive)
- 10:00 PM is when they leave, so they're not available that full hour

For "12:00 AM" as end time, treat as end of day (they're available through 11 PM).

### Week Alignment

The availability CSV covers Mon-Sat of a specific week. The week start date is embedded in the column headers (e.g., `Mon  2/16/26`). The staffing view should auto-detect this and align time-off data to the same week.

### Matching Time-Off to Availability Week

Time-off entries from the calendar data need to be filtered to only the week shown in the availability data. Match by date — if a time-off entry's date falls within the Mon-Sat range of the availability CSV, include it.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/parseAvailability.js` | **CREATE** | Parse HotSchedules availability CSV → hourly counts per employee per day |
| `src/lib/staffingEngine.js` | **CREATE** | Core engine: per-employee tier-weighted availability → subtract time-off → compare vs needs → gap analysis |
| `src/pages/StaffingView.jsx` | **CREATE** | Hour-by-hour heatmap page (team-facing) |
| `src/components/StaffingGrid.jsx` | **CREATE** | The color-coded hour × day grid component |
| `src/components/StaffingDetail.jsx` | **CREATE** | Click detail popup showing the math breakdown |
| `src/components/StaffingSettings.jsx` | **CREATE** | Effectiveness rates + staffing needs editor |
| `src/pages/ManageView.jsx` | **MODIFY** | Add availability paste boxes + staffing settings + update staffing button |
| `src/lib/storeService.js` | **MODIFY** | Add CRUD for settings and staffing data |
| `src/App.jsx` | **MODIFY** | Add staffing route |
| Firebase security rules | **MODIFY** | Add read rules for settings and staffing data |

---

## Verification

1. Paste the real BOH availability CSV (42 employees, Mon-Sat) → verify 19 hourly rows generated
2. Verify hour counts match existing BOHByHour.csv output (e.g., Monday 5 AM = 14)
3. Verify time-off deductions match BOHTOByHour.csv (e.g., Tuesday 5 AM = 2)
4. Apply 55% effectiveness to BOH raw → verify effective numbers match Google Sheet rows 23-41
5. Compare against staffing needs → verify color coding matches Google Sheet rows 85-104
6. Test FOH with 73 employees at 60% effectiveness
7. Download CSVs → verify they match the existing Off-By-Hour website output
8. Mobile responsive — staffing grid should be horizontally scrollable on phones
9. Deploy and verify at timeoffboard.web.app
