# Demo timing amendment — 2026-09-07

Founder requested a visible acceleration disclosure and at least a couple of seconds
between check-ins. Use two seconds between demo prompts; normal SUS is unchanged.

Demo: C1 appears at 0s and expires at 10s (one family request); C2 appears at 12s
and expires at 22s; C3 appears at 24s and expires at 34s, immediately entering SOS.
Every visible answer window remains 10s. OK still schedules the next C1 after 10s.
Gaps belong to the next rung's absolute deadline, so reload cannot restart them.
SOS remains accessible during the gaps. No additional session states or send effects.

Visible copy: “Demo accelerated · %1$ds per check-in · %2$ds between prompts”.
Parameters come from the demo timing profile. There is no single accurate multiplier:
normal windows are 120/60/60s, whereas all demo answer windows are 10s.
This supersedes the previous demo 0/10/20/30 recording schedule, not normal cadence.
