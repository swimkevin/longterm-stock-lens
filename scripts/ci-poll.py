#!/usr/bin/env python3
"""Poll GitHub Actions runs for a head SHA until the `tests` workflow concludes.
Loop tooling (not product code): uses the same surrogate-credential helper as
the PAT push helper. Usage: ci-poll.py <full-40-char-sha> [tries]

2026-11-17: the first version of this poller passed an 8-char short SHA to the
head_sha filter and reported "no runs yet" for 20 tries while the run had
existed all along — the Actions API does not match a short SHA there. Pass the
full SHA (from the push output or the main ref), and if no runs appear after a
few tries, check the unfiltered runs list instead of retrying blindly.
"""
import sys, time, os, urllib.request, urllib.error
for _p in ('/opt/hatch/skills/skill-creator/bin',
           '/opt/hatch/workflow-skills/custom-connector-setup/bin',
           '/opt/muse/skills/custom-connector-setup/bin'):
    if os.path.isdir(_p):
        sys.path.insert(0, _p)
        break
from dynamic_credentials import add_surrogate_to_request, read_json_response

SHA = sys.argv[1] if len(sys.argv) > 1 else ''
TRIES = int(sys.argv[2]) if len(sys.argv) > 2 else 20
if len(SHA) != 40:
    print("ci-poll: pass the FULL 40-char commit SHA — the Actions API does not match a short SHA in head_sha", file=sys.stderr)
    sys.exit(2)

def api(path):
    req = urllib.request.Request('https://api.github.com' + path, method='GET')
    req.add_header('Accept', 'application/vnd.github.v3+json')
    add_surrogate_to_request(req, 'custom.github-pat', allowed_hosts=['api.github.com'])
    try:
        return read_json_response(urllib.request.urlopen(req, timeout=30))
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()[:300]}", file=sys.stderr)
        sys.exit(1)

for i in range(TRIES):
    data = api(f'/repos/swimkevin/longterm-stock-lens/actions/runs?head_sha={SHA}&per_page=10')
    runs = data.get('workflow_runs', [])
    if not runs:
        print(f"attempt {i+1}: no runs yet for {SHA[:8]} — if this persists, check the unfiltered runs list, do not just retry")
    for r in runs:
        print(f"attempt {i+1}: {r['name']} id={r['id']} status={r['status']} conclusion={r['conclusion']}")
    tests = [r for r in runs if r['name'] == 'tests']
    if tests and tests[0]['status'] == 'completed':
        print(f"TESTS: {tests[0]['conclusion']} (run {tests[0]['id']})")
        sys.exit(0 if tests[0]['conclusion'] == 'success' else 1)
    time.sleep(30)
print("TIMEOUT: tests workflow did not complete")
sys.exit(2)
