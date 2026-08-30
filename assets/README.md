# Bundled source data

Four files, copied byte-for-byte into `src/data/zone/assets/` and `public/assets/`. **Do not
regenerate or "improve" them.** They are audited, and they anchor the submission's evidence
chain.

| File | Contents |
|---|---|
| `vizag_heatmap.geojson` | 24 Polygon zones, each a Visakhapatnam police station jurisdiction. Carries `risk_tier`, `risk_score`, `color`, `opacity`, `total_cases`, `women_safety_cases`, `crime_breakdown`, `geofence_radius_m`. |
| `vizag_heatmap_points.json` | 104 immutable, aggregate locality anchors. SHA-256: `c35870b194851f5ed2d25840c17bb0669781c439bbad1b246e8c366118c4f5ec`. Derives 70 visible red/orange/yellow hotspot circles; it is not individual incident data. |
| `zone_info_cards.json` | 19 detail cards keyed by `station_id`. Only the 19 non-`safe` zones have one, which is why this is 19 and not 24. |
| `vizag_police_points.json` | 37 stations with published landline numbers and addresses. |

**Parse assertions** (`ZoneParsingTest`): 24 zones — HIGH 6, MODERATE 9, ELEVATED 4, SAFE 5;
19 cards; 37 stations; 104 aggregate anchors; every centroid, vertex and anchor within
`lat 17.4..18.1, lon 82.9..83.7`.

GeoJSON coordinates are `[longitude, latitude]`. Reading them the other way round puts
Visakhapatnam in the Indian Ocean, which is what the range assertion catches.

## Provenance

Built by the founder for Saaya. Aggregate counts and locality anchors calibrated against
**NCRB Crime in India 2023** city tables (5,746 total, 997 crimes against women), zone
boundaries drawn to police-station jurisdictions, risk notes derived from publicly published
news reports. The anchors are synthetic/aggregate localities, never an attempt to plot an
individual survivor or reported incident.

**No personal or restricted information.** These hold aggregate counts per jurisdiction.
There is no victim, no accused, no address, no FIR number and no individual case record.
Nothing here identifies a person. Full statement: `docs/COMPLIANCE.md` §3.
