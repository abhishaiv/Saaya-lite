#!/usr/bin/env python3
"""
Knowledge graph v2. Codex uses this after EVERY node. Never hand-edit the JSON.

Built on the 9-stage pipeline. This tool enforces stages 7 (quality gate), 8 (fusion)
and 9 (serve to LLMs) so they cannot be skipped.

  add-entity <id> <Class> <label> [k=v ...]     stage 4
  add-edge   <from> <rel> <to> [by=..] [confidence=..]   stage 5, domain/range checked
  event      <type> <detail> [refs=a,b] [node=..]        stage 6
  check                                          stage 7, quality gate. exit 1 on error.
  fuse                                           stage 8, report likely duplicate entities
  context    <id> [--depth 2]                    stage 9, bounded subgraph for an LLM
  query      <substring>
  supersede  <old> <new>
  ontology                                       print classes and relations

Why the constraints exist
  - domain/range: a bare connection is not a fact. An edge that types wrongly is a bug.
  - at/by on every edge: provenance, or you cannot audit a claim later.
  - never delete: supersede. History is the point.
  - only an Anchor or Verification may verify a Claim. Self-assertion is not verification.
"""
import json,os,sys,datetime,difflib,re
P=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),"graph/knowledge_graph.json")
def load(): return json.load(open(P))
def save(k):
    k["counts"]={"entities":len(k["entities"]),"edges":len(k["edges"]),"events":len(k["events"])}
    json.dump(k,open(P,"w"),indent=1)
def today(): return datetime.date.today().isoformat()

def main():
    if len(sys.argv)<2: print(__doc__); sys.exit(2)
    c=sys.argv[1]; k=load()
    ont=k["ontology"]; CL=ont["classes"]; REL=ont["relations"]
    ent={e["id"]:e for e in k["entities"]}

    if c=="ontology":
        print("CLASSES");  [print(f"  {n:14} {v['desc']}") for n,v in CL.items()]
        print("\nRELATIONS (domain -> range)")
        for n,v in REL.items(): print(f"  {n:14} {'|'.join(v['domain']):32} -> {'|'.join(v['range'])}")

    elif c=="add-entity":
        eid,cls,label=sys.argv[2],sys.argv[3],sys.argv[4]
        if cls not in CL: sys.exit(f"unknown class '{cls}'. Run: kg.py ontology")
        if eid in ent: sys.exit(f"'{eid}' exists. Supersede it, never overwrite.")
        # stage 8 fusion: warn on a near-duplicate before it enters the graph
        near=difflib.get_close_matches(label.lower(),[e.get("label","").lower() for e in k["entities"]],n=1,cutoff=0.86)
        d={"id":eid,"class":cls,"label":label}
        for kv in sys.argv[5:]:
            key,_,val=kv.partition("="); d[key]=val
        k["entities"].append(d); save(k)
        print("added",eid)
        if near: print(f"  FUSION WARNING: close to an existing label -> {near[0]!r}. Run `kg.py fuse` and supersede if they are the same thing.")

    elif c=="add-edge":
        s,rel,o=sys.argv[2],sys.argv[3],sys.argv[4]
        if rel not in REL: sys.exit(f"unknown relation '{rel}'. Run: kg.py ontology")
        for x in (s,o):
            if x not in ent: sys.exit(f"'{x}' does not exist. Add the entity first.")
        dom,rng=REL[rel]["domain"],REL[rel]["range"]
        sc,oc=ent[s]["class"],ent[o]["class"]
        if "*" not in dom and sc not in dom: sys.exit(f"domain violation: {rel} needs {dom}, got {sc}")
        if "*" not in rng and oc not in rng: sys.exit(f"range violation: {rel} needs {rng}, got {oc}")
        e={"from":s,"rel":rel,"to":o,"at":today(),"by":"codex","confidence":"high"}
        for kv in sys.argv[5:]:
            key,_,val=kv.partition("="); e[key]=val
        k["edges"].append(e); save(k); print(f"added edge {s} --{rel}--> {o}")

    elif c=="event":
        typ,detail=sys.argv[2],sys.argv[3]
        if typ not in k["event_types"]: sys.exit(f"unknown event type. Declared: {k['event_types']}")
        nxt=1+max([int(re.sub(r"\D","",x["id"]) or 0) for x in k["events"]] or [0])
        ev={"id":"ev.%04d"%nxt,"type":typ,"at":today(),"actor":"codex","detail":detail}
        for kv in sys.argv[4:]:
            key,_,val=kv.partition("=")
            ev[key]=val.split(",") if key=="refs" else val
        k["events"].append(ev); save(k); print("logged",ev["id"],typ)

    elif c=="check":
        bad=0
        for e in k["entities"]:
            if e["class"] not in CL: print("BAD CLASS",e["id"],e["class"]); bad+=1
        for x in k["edges"]:
            if x["rel"] not in REL: print("BAD REL",x); bad+=1; continue
            if not x.get("at") or not x.get("by"): print("NO PROVENANCE",x); bad+=1
            for side in ("from","to"):
                if x[side] not in ent: print("DANGLING",x[side],"in",x); bad+=1
            if x["from"] in ent and x["to"] in ent:
                dom,rng=REL[x["rel"]]["domain"],REL[x["rel"]]["range"]
                if "*" not in dom and ent[x["from"]]["class"] not in dom:
                    print("DOMAIN",x); bad+=1
                if "*" not in rng and ent[x["to"]]["class"] not in rng:
                    print("RANGE",x); bad+=1
        evids=[e["id"] for e in k["events"]]
        dupe=[i for i in set(evids) if evids.count(i)>1]
        if dupe: print("DUPLICATE EVENT IDS",sorted(dupe)); bad+=len(dupe)
        # a Claim verified by anything other than an Anchor or Verification is self-assertion
        for x in k["edges"]:
            if x["rel"]=="verified_by" and x["to"] in ent and ent[x["to"]]["class"] not in ("Anchor","Verification"):
                print("SELF-ASSERTION",x); bad+=1
        print(f"{len(k['entities'])} entities, {len(k['edges'])} edges, {len(k['events'])} events, {bad} problem(s)")
        sys.exit(1 if bad else 0)

    elif c=="fuse":
        seen=[]; dup=0
        for e in k["entities"]:
            for o in seen:
                r=difflib.SequenceMatcher(None,e.get("label","").lower(),o.get("label","").lower()).ratio()
                if r>0.88 and e["class"]==o["class"]:
                    print(f"POSSIBLE DUPLICATE ({r:.2f})  {e['id']}  <->  {o['id']}"); dup+=1
            seen.append(e)
        print(f"{dup} candidate(s). A false merge is worse than a duplicate: supersede only when certain.")

    elif c=="context":
        n=sys.argv[2]; depth=2
        if "--depth" in sys.argv: depth=int(sys.argv[sys.argv.index("--depth")+1])
        keep={n}; frontier={n}
        for _ in range(depth):
            nxt=set()
            for x in k["edges"]:
                if x["from"] in frontier: nxt.add(x["to"])
                if x["to"] in frontier: nxt.add(x["from"])
            nxt-=keep; keep|=nxt; frontier=nxt
        sub={"root":n,
             "entities":[e for e in k["entities"] if e["id"] in keep],
             "edges":[x for x in k["edges"] if x["from"] in keep and x["to"] in keep],
             "events":[e for e in k["events"] if n in e.get("refs",[]) or e.get("node")==n]}
        print(json.dumps(sub,indent=1))

    elif c=="query":
        q=sys.argv[2].lower()
        for e in k["entities"]:
            if q in e["id"].lower() or q in str(e.get("label","")).lower():
                print(f"{e['id']:34} [{e['class']:12}] {e.get('label','')}")
    elif c=="supersede":
        old,new=sys.argv[2],sys.argv[3]
        for x in (old,new):
            if x not in ent: sys.exit(f"'{x}' does not exist")
        k["edges"].append({"from":new,"rel":"supersedes","to":old,"at":today(),"by":"codex","confidence":"high"})
        save(k); print(f"{new} supersedes {old}. Nothing deleted.")
    else: print(__doc__); sys.exit(2)

if __name__=="__main__": main()
