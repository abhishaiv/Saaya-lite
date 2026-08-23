// Gate G6's own regression fixture. Ungrounded ON PURPOSE — do not "fix" the flagged lines,
// and never let this file fail a real gate run. Scope G6 to src/ and app/ when gating.
// Ported from Kotlin 2026-08-19 with the web pivot. Covers every literal form real
// TypeScript and React actually contain.

export const checkIn1Sec = 90;                    // ladder.cd1 — real
export const cardPadding = 22;                    // dim.card.padding — real
export const cardBodySize = 14;                   // type.cardBody — real
export const textOnCardAlpha = 0.75;              // alpha.textOnCard — real
export const earthRadiusM = 6_371_008.8;          // const.earth — real
export const brand = "#A78BFA";                   // color.brand — real
export const brandArgb = 0xffa78bfa;              // same colour, ARGB form — real

export const invented = 0.37;                     // INVENTED — must be flagged
export const inventedDim = 73;                     // INVENTED - must be flagged
export const wrongColour = "#123456";             // INVENTED — must be flagged

export const idx = 2;                             // structural
export const stride = 7;                          // GROUNDED-EXEMPT: array stride
