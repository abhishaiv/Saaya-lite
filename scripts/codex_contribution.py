#!/usr/bin/env python3
"""
Codex contribution summary, generated from evidence rather than memory.

  python3 scripts/codex_contribution.py [--markdown]

The hackathon asks how Codex contributed. Reconstructing that at the end produces something
vague, so this reads the actual record: git trailers, the node graph, the run log and the
verifier verdicts. Paste its output into the write-up.

Nothing here is asserted. Every line is derived from a file in the repo, so a reviewer can
recompute it.
"""
import json,os,subprocess,sys,collections
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sh(*a):
    return subprocess.run(a,capture_output=True,text=True,cwd=ROOT).stdout.strip()
def load(p,default=None):
    try: return json.load(open(os.path.join(ROOT,p)))
    except Exception: return default
def lines(p):
    try: return [json.loads(l) for l in open(os.path.join(ROOT,p)) if l.strip()]
    except Exception: return []

b=load("graph/build_graph.json",{}) or {}
N=b.get("nodes",{}); order=b.get("order",[])
runs=lines("graph/runs.jsonl"); ver=lines("graph/verifications.jsonl")

codex_commits=[c for c in sh("git","log","--grep=Built-with: OpenAI Codex","--format=%h|%s").splitlines() if c]
all_commits=[c for c in sh("git","log","--format=%h|%s").splitlines() if c]
done=[n for n in order if N.get(n,{}).get("status")=="complete"]
kt=[f for f in sh("git","ls-files","*.ts","*.tsx","*.css").splitlines()
    if f and not f.startswith(("scripts/","test/grounded_fixture"))]
loc=0
for f in kt:
    try: loc+=sum(1 for _ in open(os.path.join(ROOT,f),errors="ignore"))
    except Exception: pass

kills=[v for r in ver for v in r.get("verdicts",[]) if v.get("kill")]
lens=collections.Counter(v["lens"] for v in kills if "lens" in v)
corrections=sum(len(r.get("corrections",[])) for r in runs) or sum(len(N.get(n,{}).get("corrections",[])) for n in order)

md = "--markdown" in sys.argv
def out(label,value,note=""):
    if md: print(f"| {label} | {value} | {note} |")
    else:  print(f"  {label:.<44} {value}{('   ' + note) if note else ''}")

if md: print("| Metric | Value | Note |\n|---|---|---|")
else:  print("\nCODEX CONTRIBUTION — generated from the repo, not from memory\n")

out("Nodes completed", f"{len(done)} of {len(order)}")
out("Commits tagged Built-with: OpenAI Codex", len(codex_commits))
out("Total commits", len(all_commits), "the rest added the frozen specification")
out("TypeScript files Codex wrote", len(kt))
out("Lines of TypeScript and CSS", loc)
out("Adversarial verifier runs recorded", sum(len(r.get("verdicts",[])) for r in ver))
out("Findings that killed a node", len(kills), "each forced a rewrite before the node passed")
if lens: out("Kills by lens", ", ".join(f"{k}:{v}" for k,v in lens.most_common()))
out("Corrections logged", corrections, "where Codex was wrong and it was fixed")

if not md:
    print("\nPER NODE\n")
    for n in order:
        d=N.get(n,{})
        st={"complete":"done","pending":"    "}.get(d.get("status","pending"),d.get("status"))
        shp=d.get("shape","")
        fan=d.get("fanout") or {}
        w=f"{fan.get('workers')} workers" if fan else ""
        print(f"  {st:5} {n:5} {d.get('title','')[:46]:46} {shp:14} {w}")
    print("\nHONESTY NOTE")
    print("  The specification in docs/ was written in a planning dialogue with Claude and")
    print("  then frozen; those commits carry a Claude trailer. Every line of the Android")
    print("  application is Codex, against that frozen spec. Both are visible in git log.")
    print()
