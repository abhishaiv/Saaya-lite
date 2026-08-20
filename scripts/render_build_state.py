#!/usr/bin/env python3
"""Regenerate BUILD_STATE.md from graph/build_graph.json. The JSON is the source of truth."""
import json,os,io
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
g=json.load(open(os.path.join(R,"graph/build_graph.json")))
N,O=g["nodes"],g["order"]
done=[n for n in O if N[n].get("status")=="complete"]
nxt=next((n for n in O if N[n].get("status")!="complete"),None)
L=["# Saaya Lite - Build State","",
 "**Generated from `graph/build_graph.json`. That file is the source of truth.**",
 "Regenerate with `python3 scripts/render_build_state.py`.","",
 "## Execution","","| Field | Value |","|---|---|",
 "| Mode | **single continuous run**, order below |",
 f"| Next node | **{nxt or 'all complete'}**{(' - '+N[nxt]['title']) if nxt else ''} |",
 f"| Nodes complete | {len(done)} of {len(O)} |",
 f"| Total work | {g['total_hours']:.1f} h |","",
 "## Node ledger","",
 "Risk-first: the two most dangerous nodes clear early and the live demo link exists by",
 "hour 14 rather than hour 24. Reasoning in `docs/spec/GRAPH_ENGINEERING.md`.","",
 "| # | Node | Title | Risk | Shape | Cum h | Verify | Status |","|---|---|---|---|---|---|---|---|"]
for n in O:
    d=N[n]
    L.append(f"| {d['seq']} | `{n}` | {d['title']} | {d['risk']} | {d['shape']} | "
             f"{d['cumulative_hours']:.1f} | {', '.join(d['verify_lenses']) or '-'} | {d.get('status','pending')} |")
L+=["","## Human gates","","Stop and wait. A gate is permission; an anchor is a measurement.","",
    "| Node | When | Gate |","|---|---|---|"]
for h in g["human_gates"]:
    L.append(f"| {h.get('before') or h.get('after')} | {'before' if 'before' in h else 'after'} | {h['gate']} |")
L+=["","## Spec amendments","",
    "When the spec was silent and the founder answered, record it here, in the spec doc, and",
    "as a fact in `graph/spec_graph.json` if it is a value.","",
    "| Date | Node | What was missing | Decision | Fact id |","|---|---|---|---|---|","| | | | | |",""]
io.open(os.path.join(R,"BUILD_STATE.md"),"w",encoding="utf-8").write("\n".join(L))
print(f"BUILD_STATE.md regenerated: {len(done)}/{len(O)} complete, next {nxt}")
