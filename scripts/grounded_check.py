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
TRIVIAL={0.0,1.0,2.0,3.0,-1.0,100.0,1000.0,0.5,10.0,60.0,24.0,1024.0,255.0,4.0,8.0,16.0,32.0}
SKIP_LINE=re.compile(r'^\s*(//|\*|/\*|#)')
# Anything on a line carrying this marker is exempt, with the reason required after it.
EXEMPT=re.compile(r'GROUNDED-EXEMPT:\s*\S+')

NUM_RE=re.compile(r'(?<![\w.])(\d+\.\d+|\d+)(?![\w.])')
HEX_RE=re.compile(r'#([0-9A-Fa-f]{6,8})\b|0x([0-9A-Fa-f]{8})\b')

def check(path):
    bad=[]
    try: lines=open(path,encoding='utf-8',errors='ignore').read().splitlines()
    except: return bad
    for i,ln in enumerate(lines,1):
        if SKIP_LINE.match(ln) or EXEMPT.search(ln): continue
        for m in HEX_RE.finditer(ln):
            hx=("#"+(m.group(1) or m.group(2))).upper()
            if hx not in COLORS and hx.replace("#FF","#",1) not in COLORS:
                bad.append((i,hx,"colour"))
        for m in NUM_RE.finditer(ln):
            try: v=float(m.group(1))
            except: continue
            if v in TRIVIAL: continue
            if v not in NUMS: bad.append((i,m.group(1),"number"))
    return bad

def main():
    if "--staged" in sys.argv:
        out=subprocess.run(["git","diff","--cached","--name-only"],capture_output=True,text=True).stdout
        paths=[p for p in out.split() if p.endswith((".kt",".kts",".js",".mjs"))]
    else:
        paths=[a for a in sys.argv[1:] if a.endswith((".kt",".kts",".js",".mjs"))]
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
