export type SaayaLocale = "en" | "te";

export type M4Copy = Readonly<{
  appName: string;
  cdCloseSheet: string;
  cdDemoPanel: string;
  cdDemoReset: string;
  cdDemoZonePicker: string;
  cdMap: string;
  cdRecentre: string;
  cdSettings: string;
  cdZone: string;
  ctaArmManually: string;
  ctaImHome: string;
  demoJumpFamily: string;
  demoMissCheckin: string;
  demoModeActive: string;
  demoPanelHeader: string;
  demoPickZone: string;
  demoPickZoneHint: string;
  demoReset: string;
  demoResetDone: string;
  demoSpeedNote: string;
  demoSpeedToggle: string;
  demoTriggerSos: string;
  homeArmBannerBody: string;
  homeArmBannerTitle: string;
  homeHourContext: string;
  locSearching: string;
  locSlow: string;
  mapOffline: string;
  stateWorking: string;
  statusCheckin1: string;
  statusCheckin2: string;
  statusFamily: string;
  statusIdle: string;
  statusShadowAuto: string;
  statusShadowManual: string;
  statusSos: string;
  warnKeepOpenBody: string;
  warnLocationDenied: string;
}>;

export const M4_COPY: Readonly<Record<SaayaLocale, M4Copy>> = {
  en: {
    appName: "Saaya Lite",
    cdCloseSheet: "Close",
    cdDemoPanel: "Open prototype demo controls",
    cdDemoReset: "Reset the demo session. Nothing is sent.",
    cdDemoZonePicker: "Choose a zone to simulate entering",
    cdMap: "Map of Visakhapatnam risk areas",
    cdRecentre: "Centre the map on your location",
    cdSettings: "Open settings",
    cdZone: "%1$s, %2$s risk area. Open details.",
    ctaArmManually: "Watch this journey",
    ctaImHome: "I am home",
    demoJumpFamily: "Jump to family escalation",
    demoMissCheckin: "Simulate a missed check-in",
    demoModeActive: "Demo speed is on. Timers are 6x faster than the real product.",
    demoPanelHeader: "These are prototype controls for demonstrating the journey. They are not product features.",
    demoPickZone: "Simulate entering a zone",
    demoPickZoneHint: "Choose any of the 24 Visakhapatnam zones.",
    demoReset: "Reset session",
    demoResetDone: "Session reset. Nothing was sent.",
    demoSpeedNote: "Timers run %1$dx faster. The full ladder takes %2$d seconds instead of %3$d.",
    demoSpeedToggle: "Demo speed",
    demoTriggerSos: "Trigger SOS",
    homeArmBannerBody: "You are in %1$s and it is %2$s. You did not have to do anything.",
    homeArmBannerTitle: "Saaya woke by itself",
    homeHourContext: "Right now, %1$s reads %2$s",
    locSearching: "Finding you",
    locSlow: "This is taking longer than usual. Check that location is on.",
    mapOffline: "Map offline, zones still work",
    stateWorking: "Working",
    statusCheckin1: "Checking in",
    statusCheckin2: "Still there?",
    statusFamily: "Telling your favourites",
    statusIdle: "Not watching",
    statusShadowAuto: "Watching this stretch",
    statusShadowManual: "Watching, you turned this on",
    statusSos: "SOS active",
    warnKeepOpenBody: "Keep this tab open while you are on the stretch. If you close it, Saaya stops watching.",
    warnLocationDenied: "Saaya cannot wake on its own without location.",
  },
  te: {
    appName: "సాయ లైట్",
    cdCloseSheet: "మూసివేయి",
    cdDemoPanel: "ప్రోటోటైప్ డెమో నియంత్రణలు తెరువు",
    cdDemoReset: "డెమో సెషన్‌ను రీసెట్ చేయి. ఏదీ పంపబడదు.",
    cdDemoZonePicker: "ప్రవేశించినట్టు చూపించడానికి ఒక జోన్ ఎంచుకోండి",
    cdMap: "విశాఖపట్నం ప్రమాద ప్రాంతాల మ్యాప్",
    cdRecentre: "మీ స్థానం మీద మ్యాప్ కేంద్రీకరించు",
    cdSettings: "సెట్టింగ్స్ తెరువు",
    cdZone: "%1$s, %2$s ప్రమాద ప్రాంతం. వివరాలు తెరువు.",
    ctaArmManually: "ఈ ప్రయాణాన్ని గమనించు",
    ctaImHome: "నేను ఇంటికి చేరాను",
    demoJumpFamily: "ఆత్మీయుల దశకు వెళ్లు",
    demoMissCheckin: "చెక్-ఇన్ మిస్ అయినట్టు చూపించు",
    demoModeActive: "డెమో వేగం ఆన్‌లో ఉంది. టైమర్లు అసలు ఉత్పత్తి కంటే 6 రెట్లు వేగంగా ఉన్నాయి.",
    demoPanelHeader: "ఇవి ప్రయాణాన్ని చూపించడానికి ప్రోటోటైప్ నియంత్రణలు. ఇవి ఉత్పత్తి ఫీచర్లు కావు.",
    demoPickZone: "ఒక జోన్‌లోకి ప్రవేశించినట్టు చూపించు",
    demoPickZoneHint: "విశాఖపట్నంలోని 24 జోన్లలో ఏదైనా ఎంచుకోండి.",
    demoReset: "సెషన్‌ను రీసెట్ చేయి",
    demoResetDone: "సెషన్ రీసెట్ అయింది. ఏదీ పంపబడలేదు.",
    demoSpeedNote: "టైమర్లు %1$d రెట్లు వేగంగా నడుస్తాయి. పూర్తి నిచ్చెన %3$d సెకన్లకు బదులు %2$d సెకన్లు పడుతుంది.",
    demoSpeedToggle: "డెమో వేగం",
    demoTriggerSos: "SOS ప్రారంభించు",
    homeArmBannerBody: "మీరు %1$s లో ఉన్నారు, ఇప్పుడు %2$s. మీరు ఏమీ చేయాల్సిన అవసరం లేదు.",
    homeArmBannerTitle: "సాయ దానంతట అదే మేల్కొంది",
    homeHourContext: "ప్రస్తుతం, %1$s %2$s గా ఉంది",
    locSearching: "మిమ్మల్ని కనుగొంటున్నాం",
    locSlow: "ఇది మామూలు కంటే ఎక్కువ సమయం తీసుకుంటోంది. లొకేషన్ ఆన్‌లో ఉందో చూడండి.",
    mapOffline: "మ్యాప్ ఆఫ్‌లైన్, జోన్‌లు ఇంకా పనిచేస్తాయి",
    stateWorking: "పని జరుగుతోంది",
    statusCheckin1: "చెక్-ఇన్ చేస్తోంది",
    statusCheckin2: "ఇంకా అక్కడ ఉన్నారా?",
    statusFamily: "మీ ఆత్మీయులకు చెబుతోంది",
    statusIdle: "గమనించడం లేదు",
    statusShadowAuto: "ఈ మార్గాన్ని గమనిస్తోంది",
    statusShadowManual: "గమనిస్తోంది, మీరు దీన్ని ఆన్ చేశారు",
    statusSos: "SOS యాక్టివ్",
    warnKeepOpenBody: "మీరు ఆ మార్గంలో ఉన్నంత సేపు ఈ ట్యాబ్ తెరిచి ఉంచండి. మూసివేస్తే సాయ గమనించడం ఆగిపోతుంది.",
    warnLocationDenied: "లొకేషన్ లేకుండా సాయ దానంతట అదే మేల్కొనదు.",
  },
};

export function formatCopy(
  template: string,
  ...values: readonly (number | string)[]
): string {
  return template.replace(/%(\d+)\$[ds]/g, (_match, rawIndex: string) => {
    const value = values[Number(rawIndex) - 1];
    if (value === undefined) {
      throw new Error(`Missing copy argument ${rawIndex} for ${template}`);
    }
    return String(value);
  });
}
