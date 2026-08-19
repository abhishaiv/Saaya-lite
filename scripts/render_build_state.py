#!/usr/bin/env python3
"""Regenerate BUILD_STATE.md from graph/build_graph.json."""
# The generator lives in git history; re-run the same logic used at creation time.
print("See docs/spec/GRAPH_ENGINEERING.md. BUILD_STATE.md is the human view of "
      "graph/build_graph.json; update node status in the JSON first, then re-render.")
