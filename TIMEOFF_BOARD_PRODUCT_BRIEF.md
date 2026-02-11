# TimeOff Board — Product Brief

## Vision

A free, zero-setup time-off calendar for Chick-fil-A operators. Any CFA manager pastes their HotSchedules report into a browser, and their team gets a live calendar link. No accounts, no installs, no technical knowledge required.

---

## How It Works

### Store Creation (one-time, 30 seconds)

1. Manager visits the site → clicks "Create a Store"
2. Enters their store name (e.g., "CFA Gateway & Randy Pape Beltline")
3. App generates two unique URLs:
   - **Team link:** `cfatimeoff.com/s/abc123` — read-only calendar for staff
   - **Management link:** `cfatimeoff.com/m/abc123-xxxx-xxxx` — paste/update interface
4. Manager bookmarks the management link, shares the team link with staff

The management URL contains a secret key (like a Google Docs edit link). Anyone with the link can update. No login required.

### Weekly Update (2 minutes)

1. Manager opens their management link
2. Goes to HotSchedules → Time Off & Request Report
3. Sets Jobs → BOH General → Select All → Copy → Paste into BOH box
4. Sets Jobs → FOH roles → Select All → Copy → Paste into FOH box
5. Clicks "Update Calendar"
6. Done — team calendar updates instantly

### Team View (daily use)

1. Team member opens bookmarked team link (or scans a QR code posted in break room)
2. Sees the calendar with color-coded days
3. Clicks any day to see who's off
4. Toggles ALL / FOH / BOH filter
5. No login, no app download — works on any phone browser

---

## Architecture

### Tech Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend | React SPA (single page app) | Free |
| Hosting | Firebase Hosting or GitHub Pages | Free |
| Database | Firebase Realtime Database | Free tier (1GB, 10GB/month bandwidth) |
| Domain | Optional custom domain | ~$12/year |

### Firebase Database Structure

```
timeoff-board/
  stores/
    {storeId}/                     ← e.g., "abc123"
      name: "CFA Gateway & Randy Pape Beltline"
      managementKey: "xxxx-xxxx"   ← secret portion of management URL
      createdAt: "2026-02-09T..."
      lastUpdated: "2026-02-09T..."
      calendar/                    ← the parsed time-off data
        "2026-02-14"/
          all/
            approved: ["Abigail Mojica", "Ashlynn Voges"]
            pending: ["Hunter Bradley"]
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

### Firebase Security Rules

```json
{
  "rules": {
    "stores": {
      "$storeId": {
        // Anyone can read the store name, lastUpdated, and calendar
        // (this powers the public team view)
        "name": { ".read": true },
        "lastUpdated": { ".read": true },
        "calendar": { ".read": true },

        // Writing requires the management key in the request
        // The client sends the key, server-side rule validates it
        ".write": "newData.child('managementKey').val() === data.child('managementKey').val() || !data.exists()",

        // Management key is never readable by clients
        "managementKey": { ".read": false }
      }
    }
  }
}
```

**Note:** The managementKey validation approach above is simplified. A more robust pattern would use Firebase Cloud Functions (also free tier) to handle writes — the management URL sends the key to a function, the function validates it against the DB, then writes the data. This keeps the key fully server-side.

### URL Routing

```
/                           → Landing page (create a store)
/s/{storeId}                → Team view (read-only calendar)
/m/{storeId}-{managementKey} → Management view (paste & update)
```

The app is a single React SPA with client-side routing. No server-side rendering needed.

---

## Pages

### 1. Landing Page (`/`)

Simple page with:
- Headline: "Time-Off Calendar for Your Team"
- Subhead: "Paste your HotSchedules report. Share a link with your team. That's it."
- One input: **Store Name**
- One button: **"Create My Calendar"**
- After creation: shows both links with copy buttons + QR code for the team link

### 2. Team View (`/s/{storeId}`)

- Store name as header
- "Updated weekly" + last updated timestamp
- ALL / FOH / BOH toggle
- Monthly calendar grid with color-coded counts
- Click any day → shows names (approved in green, pending in yellow)
- Mobile-first responsive design
- No navigation to management view (clean separation)

### 3. Management View (`/m/{storeId}-{managementKey}`)

- Store name as header + "Management" badge
- Two paste boxes: BOH and FOH
- "Update Calendar" button
- Status message showing parse results (X BOH + Y FOH entries → Z dates)
- Preview of the calendar below
- Link to copy/share the team URL
- Option to regenerate management link (invalidates old one)

---

## Data Flow

```
Manager pastes raw text
        ↓
Browser parses HotSchedules format (JavaScript, same logic as parse_raw.py)
        ↓
Builds calendar JSON (same logic as extract_timeoff.py)
        ↓
Writes to Firebase: stores/{storeId}/calendar + lastUpdated
        ↓
Team view reads from Firebase (realtime listener)
        ↓
Calendar renders instantly
```

All parsing happens client-side. Firebase only stores the processed calendar data — never the raw paste (which contains employee comments and other sensitive info). Only names, dates, and statuses are stored.

---

## Privacy Considerations

- **No raw data stored:** The raw HotSchedules paste (which includes employee comments, manager names, etc.) is parsed in the browser and discarded. Only names + dates + status are saved.
- **No accounts:** No emails, passwords, or personal info collected from operators.
- **Secret URLs:** Management access is controlled by a secret URL. Not bulletproof, but appropriate for this use case (internal team scheduling, not financial data).
- **Data is per-store:** Stores cannot see each other's data.
- **Deletion:** Managers can delete their store and all data from the management view.

---

## MVP Scope (Build First)

1. Landing page with store creation
2. Management view with paste → parse → save to Firebase
3. Team view with calendar display from Firebase
4. Mobile-responsive design
5. QR code generation for team link

## Future (Build If Traction)

- Custom domain ($12/year)
- Print-friendly calendar view (for posting on break room wall)
- Push notifications when calendar is updated (via PWA)
- Historical view (compare this week vs last week)
- Multiple locations under one operator account
- Paid tier for premium features (analytics, alerts for high-volume days)
- Embeddable widget for existing store intranets
- Direct HotSchedules API integration (eliminate copy-paste entirely)

---

## Getting Started

### Firebase Setup (one-time, ~15 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project called "timeoff-board"
3. Enable Realtime Database (start in test mode, then apply security rules above)
4. Enable Firebase Hosting
5. Get your Firebase config (apiKey, projectId, etc.)
6. Deploy the app with `firebase deploy`

### Development

The app is a single React project. Key files:

```
timeoff-board/
├── src/
│   ├── App.jsx              ← Router: landing, team view, management view
│   ├── pages/
│   │   ├── Landing.jsx      ← Store creation
│   │   ├── TeamView.jsx     ← Read-only calendar
│   │   └── ManageView.jsx   ← Paste & update
│   ├── components/
│   │   └── Calendar.jsx     ← Shared calendar component
│   ├── lib/
│   │   ├── parser.js        ← HotSchedules raw text parser
│   │   ├── calendar.js      ← Date extraction + calendar builder
│   │   └── firebase.js      ← Firebase config + read/write helpers
│   └── index.jsx
├── firebase.json
├── .firebaserc
└── package.json
```
