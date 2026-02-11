# TimeOff Board — Firebase Setup (Ready to Build)

## Firebase Config

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDOcV0zSPVO6aEH83ZESNLlK0xGz5ysKgM",
  authDomain: "timeoffboard.firebaseapp.com",
  databaseURL: "https://timeoffboard-default-rtdb.firebaseio.com",
  projectId: "timeoffboard",
  storageBucket: "timeoffboard.firebasestorage.app",
  messagingSenderId: "397367205583",
  appId: "1:397367205583:web:edc3bb09106818b98461ba",
  measurementId: "G-DHL311KGYQ"
};
```

## What's Already Set Up

- **Firebase project:** `timeoffboard` (Spark/free plan)
- **Web app:** TimeOff Board (registered)
- **Hosting site:** `timeoffboard.web.app` (linked, not yet deployed)
- **Realtime Database:** Enabled, US (us-central1)
- **Current DB rules:** Open read/write on `stores/$storeId` (needs tightening before launch)

## What Claude Code Needs to Build

Build a React SPA with two views and deploy to Firebase Hosting.

### URL Structure
```
/                              → Landing page (create a store)
/s/{storeId}                   → Team view (read-only calendar)
/m/{storeId}-{managementKey}   → Management view (paste & update)
```

### Pages

**Landing Page (`/`)**
- Headline: "Time-Off Calendar for Your Team"
- One input: Store Name
- One button: "Create My Calendar"
- After creation: show both links (team + management) with copy buttons
- Generate a QR code for the team link

**Team View (`/s/{storeId}`)**
- Fetch calendar data from Firebase: `stores/{storeId}/calendar`
- Display store name + last updated timestamp
- ALL / FOH / BOH toggle filter
- Monthly calendar grid with color-coded day counts (green → yellow → red)
- Click day → show list of names (approved / pending)
- Mobile-first, responsive
- No link to management view

**Management View (`/m/{storeId}-{managementKey}`)**
- Validate the management key against Firebase before showing the form
- Store name display (editable)
- Two large paste boxes: BOH Report and FOH Report
- "Update Calendar" button
- Status message with parse results
- Calendar preview below
- Copyable team link + QR code

### Data Parsing (Client-Side)

The parser converts raw HotSchedules "Time Off & Request Report" paste data into structured calendar JSON. This is the same logic already proven in `build/parse_raw.py` and `build/extract_timeoff.py` from the `timeoff-visibility` repo.

**Raw format:** HotSchedules outputs a table where employee names appear as standalone header rows, with their time-off entries as data rows beneath. When copied, it's tab-separated text.

**Key parsing rules:**
- Skip everything before the `Date and Time\tType\t...` header row
- Name rows: single value per line, no tabs, not a date pattern
- Data rows: 9 tab-separated columns
- Fill each data row with the current employee name
- Extract: Name, Date and Time, Status (approved/pending)
- Handle multi-line dates: "Through" ranges, "starts/ends" partial days
- Handle midnight end times (ends 12:00 AM = exclude that date)

**Calendar building:**
- Extract date(s) from each entry's "Date and Time" field
- For "Through" ranges: expand to individual dates (exclusive of end)
- Group by date → bucket (foh/boh) → status (approved/pending)
- Output structure per date: `{ all: {...}, foh: {...}, boh: {...} }`

### Firebase Database Structure

```
stores/
  {storeId}/
    name: "CFA Gateway & Randy Pape Beltline"
    managementKey: "a8f2-b9c1-d4e7"
    createdAt: "2026-02-09T..."
    lastUpdated: "2026-02-09T..."
    calendar/
      {date}/                    ← e.g., "2026-02-14"
        all/
          approved: ["Name1", "Name2"]
          pending: ["Name3"]
          count: 3
        foh/
          approved: [...]
          pending: [...]
          count: 2
        boh/
          approved: [...]
          pending: [...]
          count: 1
```

### Firebase Security Rules (Update Before Launch)

```json
{
  "rules": {
    "stores": {
      "$storeId": {
        "name": { ".read": true },
        "lastUpdated": { ".read": true },
        "createdAt": { ".read": true },
        "calendar": { ".read": true },
        "managementKey": { ".read": false },
        ".write": "(!data.exists()) || (newData.child('managementKey').val() === data.child('managementKey').val())"
      }
    }
  }
}
```

This means:
- Anyone can **read** calendar data, store name, and timestamps (powers team view)
- The managementKey is **never readable** by clients
- **Writing** requires either: the store doesn't exist yet (creation), or the submitted managementKey matches the stored one (updates)

### Tech Stack

- **React** (create-react-app or Vite)
- **react-router-dom** for client-side routing
- **firebase** npm package for Realtime Database
- **qrcode.react** for QR code generation
- **Firebase Hosting** for deployment

### Deployment

```bash
npm install -g firebase-tools
firebase login
firebase init hosting  # set build directory to dist or build
npm run build
firebase deploy --only hosting
```

The app will be live at `https://timeoffboard.web.app`

### Design Direction

- Clean, minimal, mobile-first
- CFA-adjacent color palette (warm whites, soft reds for accents)
- Calendar colors: green (1-2 off) → yellow (3-4) → orange (5-6) → red/pink (7+)
- DM Sans or similar modern sans-serif font
- Sticky header with store name and view toggle
- Large touch targets for mobile (team members will use this on phones)
