"""
One-time backfill: give pre-attribution log events their caller IP.

Before 2026-08-18 the log tailer discarded the GIN caller IP, so every
log-sourced event landed with client=NULL. Ollama's server logs still hold
those lines with timestamps and IPs, so an event can be re-attributed by
matching its ended_at against a GIN /api/chat|/api/generate line at the same
second. Only unambiguous matches are written (all candidate lines within the
window share one IP); anything else stays NULL, which the HUD shows honestly
as "unattributed".

Usage:  python scripts/backfill-client-ip.py [--apply] [--days N]
        (dry run by default; --apply writes)
"""
import argparse, datetime, glob, json, os, re, sqlite3, sys

DB = os.path.join(os.environ["LOCALAPPDATA"], "fuel", "fuel.db")
LOGS = os.path.join(os.environ["LOCALAPPDATA"], "Ollama", "server*.log")
TENANTS = os.path.join(os.path.dirname(__file__), "..", "config", "tenants.json")
GIN = re.compile(r'^\[GIN\] (\d{4})/(\d{2})/(\d{2}) - (\d{2}):(\d{2}):(\d{2}) \| +(\d{3}) \| +[^|]+\| +([\d.:a-fA-F]+) \| +POST +"(/api/chat|/api/generate|/v1/chat/completions)"')
WINDOW_MS = 3000

ap = argparse.ArgumentParser()
ap.add_argument("--apply", action="store_true")
ap.add_argument("--days", type=int, default=1)
args = ap.parse_args()

with open(TENANTS, encoding="utf-8") as f:
    by_ip = json.load(f)["byIp"]

# Collect GIN work lines: (epoch_ms, ip)
lines = []
for path in glob.glob(LOGS):
    with open(path, encoding="utf-8", errors="replace") as f:
        for ln in f:
            m = GIN.match(ln)
            if not m:
                continue
            y, mo, d, hh, mm, ss = (int(x) for x in m.groups()[:6])
            ts = datetime.datetime(y, mo, d, hh, mm, ss).timestamp() * 1000
            lines.append((ts, m.group(8)))
lines.sort()
print(f"GIN work lines indexed: {len(lines)}")

db = sqlite3.connect(DB)
since = (datetime.datetime.now() - datetime.timedelta(days=args.days)).timestamp() * 1000
rows = db.execute(
    "select id, ended_at from events where source='log' and client_ip is null and ended_at >= ? order by ended_at",
    (since,),
).fetchall()
print(f"unattributed log events in window: {len(rows)}")

import bisect
times = [t for t, _ in lines]
updates, ambiguous, unmatched = [], 0, 0
for eid, ended in rows:
    lo = bisect.bisect_left(times, ended - WINDOW_MS)
    hi = bisect.bisect_right(times, ended + WINDOW_MS)
    ips = {lines[i][1] for i in range(lo, hi)}
    if len(ips) == 1:
        ip = ips.pop()
        tenant = by_ip.get(ip, {}).get("id")
        updates.append((ip, tenant, eid))
    elif len(ips) == 0:
        unmatched += 1
    else:
        ambiguous += 1

print(f"matched: {len(updates)}   ambiguous (mixed IPs): {ambiguous}   unmatched: {unmatched}")
from collections import Counter
print("by tenant:", dict(Counter(t for _, t, _ in updates)))

if args.apply and updates:
    db.executemany(
        "update events set client_ip=?, client=coalesce(?, client) where id=? and client_ip is null",
        updates,
    )
    db.commit()
    print("applied.")
elif updates:
    print("dry run — pass --apply to write.")
