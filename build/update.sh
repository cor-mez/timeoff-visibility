#!/usr/bin/env bash
set -euo pipefail

# Navigate to repo root (one level up from build/)
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

echo "=== Step 1: Parse raw HotSchedules data ==="
python3 build/parse_raw.py

echo ""
echo "=== Step 2: Extract time-off into calendar.json ==="
python3 build/extract_timeoff.py

echo ""
echo "=== Step 3: Validate calendar.json ==="

JSON_FILE="docs/calendar.json"

if [ ! -f "$JSON_FILE" ]; then
    echo "Error: $JSON_FILE not found" >&2
    exit 1
fi

# Check valid JSON and has date entries
DATE_COUNT=$(python3 -c "
import json, sys
with open('$JSON_FILE') as f:
    data = json.load(f)
dates = data.get('data', data)
if not dates:
    print('0', file=sys.stderr)
    sys.exit(1)
print(len(dates))
")

if [ "$DATE_COUNT" -eq 0 ]; then
    echo "Error: calendar.json has no date entries" >&2
    exit 1
fi

# Sanity check: no employee >20 entries per week
python3 -c "
import json, sys
from collections import Counter
with open('$JSON_FILE') as f:
    data = json.load(f).get('data', {})
counts = Counter()
for date_key, buckets in data.items():
    for bucket in ('foh', 'boh'):
        info = buckets.get(bucket, {})
        for name in info.get('approved', []) + info.get('pending', []):
            counts[name] += 1
worst = counts.most_common(1)
if worst and worst[0][1] > 20:
    print(f'Warning: {worst[0][0]} has {worst[0][1]} entries — possible parsing error', file=sys.stderr)
"

# Print summary
python3 -c "
import json
with open('$JSON_FILE') as f:
    data = json.load(f).get('data', {})
foh_count = sum(d['foh']['count'] for d in data.values())
boh_count = sum(d['boh']['count'] for d in data.values())
approved = sum(len(d['all']['approved']) for d in data.values())
pending = sum(len(d['all']['pending']) for d in data.values())
print(f'  Dates:    {len(data)}')
print(f'  FOH:      {foh_count} entries')
print(f'  BOH:      {boh_count} entries')
print(f'  Approved: {approved}')
print(f'  Pending:  {pending}')
"

echo ""
echo "=== Step 4: Commit and push ==="
git add docs/calendar.json
git commit -m "Weekly time-off calendar update — $(date '+%b %d, %Y')"
git push origin main

echo ""
echo "=== Done! Site will update shortly via GitHub Pages ==="
