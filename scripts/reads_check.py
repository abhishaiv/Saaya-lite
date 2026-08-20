#!/usr/bin/env python3
"""
Reads-completeness check. A node that cannot see the document defining what it must build
will block, and it will block correctly — the fault is the graph's, not the agent's.

  python3 scripts/reads_check.py        # exits 1 if any node is missing a doc it needs

T4.1 blocked because `Command` is defined in ARCHITECTURE.md and ARCHITECTURE.md was not in
T4.1's reads. Auditing for that class found 19 more nodes with the same hole. This makes the
class impossible to reintroduce silently.

The mapping below is: "a node producing X must be able to read DOC". Extend it when a new
artifact kind appears; never delete an entry to make the check pass.
"""
import json,os,sys
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEED={
 "ARCHITECTURE.md":["engine_pure","service_running","queue_repository","anonymiser","components_c1_c14",
                    "map_screen","home_states","onboarding","sos_screen","checkin_screens","family_screen",
                    "police_view","zone_sheet"],
 "DATA_MODEL.md":["anonymiser","sus_writer","sos_writer","queue_repository","firestore_zones_seeded",
                  "type:Zone","pin_stored_hashed","favourites_local"],
 "COMPONENT_LIBRARY.md":["components_c1_c14","map_screen","home_states","onboarding","sos_screen",
                         "checkin_screens","family_screen","police_view","zone_sheet","arm_banner"],
 "DESIGN_SYSTEM.md":["components_c1_c14","theme_tokens","map_screen","home_states"],
 "ANDROID_PLATFORM.md":["service_running","geofences_registered","timers_exact","notif_channels",
                        "fullscreen_intent","onboarding"],
 "BUSINESS_RULES.md":["engine_pure","escalation_message","nearest_station","zone_sheet","backoff_policy","pin_entry"],
 "STATE_MACHINE.md":["engine_pure","recovery_works","sos_screen","home_states"],
 "COPY.md":["onboarding","checkin_screens","family_screen","sos_screen","police_view","home_states",
            "zone_sheet","strings_en"],
 "TEST_PLAN.md":["engine_pure","anonymiser","queue_repository","v1_v8_evidence"],
}
g=json.load(open(os.path.join(R,"graph/build_graph.json")))
gaps=[]
for nid in g["order"]:
    n=g["nodes"][nid]; prod=set(n["produces"]); reads=set(n["reads"])
    for doc,trig in NEED.items():
        hit=prod & set(trig)
        if hit and doc not in reads: gaps.append((nid,doc,sorted(hit)))
for nid,doc,why in gaps:
    print(f"MISSING READ  {nid}  needs {doc}  (produces {', '.join(why)})")
if gaps:
    print(f"\n{len(gaps)} node(s) cannot see a document defining what they must build.")
    print("Add the doc to that node's `reads` in graph/build_graph.json.")
    print("Do NOT remove entries from NEED to make this pass.")
    sys.exit(1)
print(f"reads complete: {len(g['order'])} nodes, every one can see what it needs")
