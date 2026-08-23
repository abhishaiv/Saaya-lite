#!/usr/bin/env python3
"""
Grounded checker. Replaces the vibe-based "no invention" gate with an audit.

For every numeric and colour literal in the changed source, assert an edge exists to a
fact node in graph/spec_graph.json. An unmatched literal means Codex invented a value,
which is our single most likely failure mode.

Usage:
  python3 scripts/grounded_check.py <path> [<path> ...]
  python3 scripts/grounded_check.py --staged
"""
import json,re,sys,subprocess,os

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G=json.load(open(os.path.join(ROOT,"graph/spec_graph.json")))
NUMS={}; COLORS={}
for f in G["facts"]:
    v=f["value"]
    if f["kind"]=="color": COLORS[str(v).upper()]=f["id"]
    elif isinstance(v,(int,float)): NUMS.setdefault(float(v),[]).append(f["id"])

# Literals that are structurally trivial and never encode a product decision.
TRIVIAL={0.0,1.0,2.0,3.0,-1.0}
# Deliberately tiny. An earlier, wider set let common UI numbers (8, 16, 24, 32, 100)
# bypass the check entirely, which is exactly where an agent invents values. Anything
# else must trace to spec_graph.json or carry an explicit GROUNDED-EXEMPT reason.
SKIP_LINE=re.compile(r'^\s*(//|\*|/\*|#)')
# Anything on a line carrying this marker is exempt, with the reason required after it.
EXEMPT=re.compile(r'GROUNDED-EXEMPT:\s*\S+')

# Kotlin and Compose write product values as 16.dp, 14.sp, 0.75f, 1_000. An earlier
# pattern required a non-word, non-dot character after the number, so it matched NONE of
# those and the gate was effectively inert against real Compose code. Match the numeric
# core and ignore whatever suffix or extension property follows it.
NUM_RE=re.compile(r'(?<![\w.$])(\d[\d_]*(?:\.\d[\d_]*)?)')
HEXNUM_RE=re.compile(r'0[xX][0-9A-Fa-f]+')
HEX_RE=re.compile(r'#([0-9A-Fa-f]{6,8})\b|0x([0-9A-Fa-f]{8})\b')

def hexlookup(hx):
    """Compose writes colours as ARGB: 0xFFA78BFA is our #A78BFA at full alpha.
    Normalise before lookup, and use this in BOTH gate and explain so they never disagree."""
    hx=hx.upper()
    for cand in (hx, "#"+hx[3:] if len(hx)==9 and hx.startswith("#FF") else hx):
        if cand in COLORS: return COLORS[cand]
    return None

def check(path):
    bad=[]
    try: lines=open(path,encoding='utf-8',errors='ignore').read().splitlines()
    except: return bad
    for i,ln in enumerate(lines,1):
        if SKIP_LINE.match(ln) or EXEMPT.search(ln): continue
        for m in HEX_RE.finditer(ln):
            hx=("#"+(m.group(1) or m.group(2))).upper()
            if hexlookup(hx) is None: bad.append((i,hx,"colour"))
        scan=HEXNUM_RE.sub(" ",ln)
        for m in NUM_RE.finditer(scan):
            try: v=float(m.group(1).replace("_",""))
            except: continue
            if v in TRIVIAL: continue
            if v not in NUMS: bad.append((i,m.group(1),"number"))
    return bad

def explain(path):
    """Report the fact id every literal matched. Value-matching is necessary, not
    sufficient: a literal can match a fact that governs something else entirely. This
    makes that visible so the `invention` verifier lens can judge it."""
    try: lines=open(path,encoding='utf-8',errors='ignore').read().splitlines()
    except: return
    for i,ln in enumerate(lines,1):
        if SKIP_LINE.match(ln) or EXEMPT.search(ln): continue
        for m in HEX_RE.finditer(ln):
            hx=("#"+(m.group(1) or m.group(2))).upper()
            print(f"  {path}:{i}  {hx:>12}  ->  {hexlookup(hx) or 'UNGROUNDED'}")
        for m in NUM_RE.finditer(HEXNUM_RE.sub(" ",ln)):
            try: v=float(m.group(1).replace("_",""))
            except: continue
            if v in TRIVIAL: continue
            ids=NUMS.get(v)
            print(f"  {path}:{i}  {m.group(1):>10}  ->  {', '.join(ids) if ids else 'UNGROUNDED'}")

def main():
    if "--explain" in sys.argv:
        for a in sys.argv[1:]:
            if a.endswith((".kt",".kts",".js",".mjs",".xml")): explain(a)
        return
    # the regression fixture is ungrounded ON PURPOSE; never let it fail a real run
    if "--staged" in sys.argv:
        out=subprocess.run(["git","diff","--cached","--name-only"],capture_output=True,text=True).stdout
        paths=[p for p in out.split() if p.endswith((".kt",".kts",".js",".mjs",".ts",".tsx"))]
    else:
        paths=[a for a in sys.argv[1:] if a.endswith((".kt",".kts",".js",".mjs",".ts",".tsx"))]
    total=0
    for p in paths:
        for line,lit,kind in check(p):
            total+=1
            print(f"UNGROUNDED {p}:{line}  {kind} {lit}")
    if total:
        print()
        print(f"{total} ungrounded literal(s).")
        print("Each is either (a) a value you invented, which is a spec violation, or")
        print("(b) a real product value missing from graph/spec_graph.json, which is a spec bug.")
        print()
        print("Do NOT silence these by editing TRIVIAL. Either:")
        print("  1. use the value from graph/spec_graph.json, or")
        print("  2. STOP and report it, so the founder decides and it is added as a fact, or")
        print("  3. if it is genuinely structural (an index, a loop bound), append")
        print("     `// GROUNDED-EXEMPT: <one-line reason>` to that line.")
        sys.exit(1)
    print(f"grounded: {len(paths)} file(s), 0 ungrounded literals")

if __name__=="__main__": main()
