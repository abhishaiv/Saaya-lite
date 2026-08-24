#!/usr/bin/env python3
"""
Fan-out collision guard. Run AFTER a diamond node's workers finish, BEFORE the merge.

  python3 scripts/fanout_check.py T1.3

We chose disjoint contracts over git worktrees: every worker owns a set of paths nobody
else may touch, and the merge writes the shared files. That is only safe if it is actually
enforced, so this asserts it mechanically:

  1. no two workers claimed the same path
  2. no worker wrote outside its owned paths
  3. no worker wrote a shared file that belongs to the merge
  4. every worker produced its manifest

A violation means the contract was drawn wrong. Fix the contract, do not widen the guard.
"""
import json,os,sys,subprocess,fnmatch
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
g=json.load(open(os.path.join(ROOT,"graph/build_graph.json")))

def changed():
    # Git's default porcelain output collapses wholly untracked directory trees to
    # `path/`. Diamond contracts own files, not directory prefixes, so ask for every
    # untracked file or a correct worker will be reported as an unowned directory.
    out=subprocess.run(
        ["git","status","--porcelain","--untracked-files=all"],
        capture_output=True,text=True,cwd=ROOT,
    ).stdout
    return [l[3:].strip() for l in out.splitlines() if l.strip()]

def main():
    if len(sys.argv)<2: print(__doc__); sys.exit(2)
    nid=sys.argv[1]
    n=g["nodes"].get(nid)
    if not n: sys.exit(f"unknown node {nid}")
    fan=n.get("fanout")
    if not fan:
        print(f"{nid} is shape={n['shape']}, no fan-out. Nothing to check."); sys.exit(0)

    owned={}   # path-pattern -> worker id
    items=fan.get("items") or []
    ic=fan.get("item_contract")
    if ic and not items:
        print(f"{nid}: contract is per-item template; pass worker ids as extra args to check ownership")
        items=[{"id":a,"owns":[p.replace("<Name>",a).replace("<Cn>",a).replace("<Screen>",a)
                               for p in ic["owns"]]} for a in sys.argv[2:]]
    bad=0
    for it in items:
        for p in it.get("owns",[]):
            if p in owned and owned[p]!=it["id"]:
                print(f"CLAIM CLASH  {p}  claimed by {owned[p]} and {it['id']}"); bad+=1
            owned[p]=it["id"]

        manifest=it.get("manifest")
        if manifest:
            manifest_path=os.path.join(ROOT,manifest)
            if not os.path.isfile(manifest_path):
                print(f"MISSING MANIFEST  {manifest}  for {it['id']}"); bad+=1
            else:
                try:
                    payload=json.load(open(manifest_path))
                    claimed=set(payload.get("owns",payload.get("owned_paths",[])))
                    missing=set(it.get("owns",[]))-claimed
                    if missing:
                        print(f"INCOMPLETE MANIFEST  {manifest}  missing {sorted(missing)}"); bad+=1
                except (OSError,json.JSONDecodeError,TypeError) as exc:
                    print(f"INVALID MANIFEST  {manifest}  {exc}"); bad+=1

    shared=set(fan.get("shared_files_written_by_merge",[]))
    files=changed()
    for f in files:
        if any(f.endswith(s) or s.endswith(f) for s in shared):
            print(f"MERGE-OWNED FILE TOUCHED BY A WORKER  {f}")
            print("   the merge writes this, not a worker. This is exactly the collision the")
            print("   disjoint contracts exist to prevent.")
            bad+=1
            continue
        if f.startswith("build/fanout/"): continue
        if not any(fnmatch.fnmatch(f,"*"+p) or f.endswith(p) for p in owned):
            print(f"UNOWNED WRITE  {f}  (no worker declared this path)"); bad+=1

    print()
    if bad:
        print(f"{bad} violation(s). The contract was drawn wrong, or a worker went outside it.")
        print("Fix the contract in graph/build_graph.json. Do NOT widen this guard.")
        sys.exit(1)
    print(f"{nid}: {len(items)} worker(s), {len(files)} changed file(s), all within owned paths.")

if __name__=="__main__": main()
