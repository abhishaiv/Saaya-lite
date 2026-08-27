export type SaayaLocale = "en" | "te";

export type M4Copy = Readonly<{
  aboutAttribFonts: string;
  aboutAttribMap: string;
  aboutAttribTitle: string;
  aboutContactTitle: string;
  aboutDataBody: string;
  aboutDataTitle: string;
  aboutMockConsole: string;
  aboutMockDelivery: string;
  aboutMockTitle: string;
  aboutNoAiBody: string;
  aboutNoAiTitle: string;
  aboutNotTitle: string;
  aboutRealArm: string;
  aboutRealConsole: string;
  aboutRealDetail: string;
  aboutRealFamily: string;
  aboutRealLadder: string;
  aboutRealMap: string;
  aboutRealSos: string;
  aboutRealTitle: string;
  aboutRealWrites: string;
  aboutTitle: string;
  aboutVersion: string;
  aboutWhatBody: string;
  aboutWhatTitle: string;
  appName: string;
  cdBack: string;
  cdCloseSheet: string;
  cdDemoPanel: string;
  cdDemoReset: string;
  cdDemoZonePicker: string;
  cdMap: string;
  cdRecentre: string;
  cdSettings: string;
  cdStationCall: string;
  cdZone: string;
  ctaCall: string;
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
  demoSessionLiveReason: string;
  demoSpeedNote: string;
  demoSpeedToggle: string;
  demoTriggerSos: string;
  errZoneData: string;
  homeArmBannerBody: string;
  homeArmBannerTitle: string;
  homeHourContext: string;
  ctaRetry: string;
  locHelpBody: string;
  locHelpNote: string;
  locHelpTitle: string;
  locSearching: string;
  locSlow: string;
  mapOffline: string;
  policeNoGovtLink: string;
  errNoStation: string;
  riskBandElevated: string;
  riskBandHigh: string;
  riskBandLow: string;
  riskBandModerate: string;
  stateWorking: string;
  setAbout: string;
  setDemo: string;
  setDemoSub: string;
  setFavourites: string;
  setFavouritesSub: string;
  setLanguage: string;
  setPin: string;
  setPinSub: string;
  setPolice: string;
  setTitle: string;
  statusCheckin1: string;
  statusCheckin2: string;
  statusFamily: string;
  statusIdle: string;
  statusShadowAuto: string;
  statusShadowManual: string;
  statusSos: string;
  warnKeepOpenBody: string;
  warnLocationDenied: string;
  warnPageStopped: string;
  zoneDataSource: string;
  zoneDistanceKm: string;
  zoneDistanceM: string;
  zoneSafeNoData: string;
  zoneStatIncidents: string;
  zoneStatWomen: string;
  zoneStation: string;
  zoneStationApprox: string;
  zoneTopCrimes: string;
}>;

export const M4_COPY: Readonly<Record<SaayaLocale, M4Copy>> = {
  en: {
    aboutAttribFonts: "Poppins and Noto Sans Telugu under the SIL Open Font License. Material Symbols under Apache 2.0.",
    aboutAttribMap: "© OpenStreetMap contributors © CARTO",
    aboutAttribTitle: "Attribution",
    aboutContactTitle: "Contact",
    aboutDataBody: "Visakhapatnam records, calibrated against NCRB 2023 city data. Every demo record is synthetic.",
    aboutDataTitle: "Data",
    aboutMockConsole: "The console demonstrates the receiving end. It is not a police system and no police force uses it.",
    aboutMockDelivery: "SMS and WhatsApp messages are composed and shown on screen, never sent. Real delivery needs Indian DLT registration.",
    aboutMockTitle: "What is mocked",
    aboutNoAiBody: "Every decision this app makes is a fixed rule you could read. There is no model in it.",
    aboutNoAiTitle: "No AI",
    aboutNotTitle: "What this is not",
    aboutRealArm: "Automatic arming, with nothing pressed",
    aboutRealConsole: "The live console",
    aboutRealDetail: "Zone detail and the nearest station",
    aboutRealFamily: "Family escalation, composed with context",
    aboutRealLadder: "The four-step check-in ladder, on real timings",
    aboutRealMap: "The Visakhapatnam map, 24 zones from real records",
    aboutRealSos: "PIN-protected SOS",
    aboutRealTitle: "What is real",
    aboutRealWrites: "Both writes to the state view",
    aboutTitle: "About",
    aboutVersion: "Version %1$s (%2$d)",
    aboutWhatBody: "Saaya Lite is a prototype built for Build What Moves India. It shows the tier missing below India's emergency apps: the one that works before anything has happened.",
    aboutWhatTitle: "What this is",
    appName: "Saaya Lite",
    cdBack: "Go back",
    cdCloseSheet: "Close",
    cdDemoPanel: "Open prototype demo controls",
    cdDemoReset: "Reset the demo session. Nothing is sent.",
    cdDemoZonePicker: "Choose a zone to simulate entering",
    cdMap: "Map of Visakhapatnam risk areas",
    cdRecentre: "Centre the map on your location",
    cdSettings: "Open settings",
    cdStationCall: "Call %1$s",
    cdZone: "%1$s, %2$s risk area. Open details.",
    ctaCall: "Call",
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
    demoSessionLiveReason: "Finish or stop the current session first",
    demoSpeedNote: "Timers run %1$dx faster. The full ladder takes %2$d seconds instead of %3$d.",
    demoSpeedToggle: "Demo speed",
    demoTriggerSos: "Trigger SOS",
    errZoneData: "Saaya Lite could not load Visakhapatnam data. Reloading the page should fix this.",
    homeArmBannerBody: "You are in %1$s and it is %2$s. You did not have to do anything.",
    homeArmBannerTitle: "Saaya woke by itself",
    homeHourContext: "Right now, %1$s reads %2$s",
    ctaRetry: "Try again",
    locHelpBody: "In your browser, open the site settings for this page and allow Location. Then come back and tap Try again.",
    locHelpNote: "Where this setting lives depends on your browser.",
    locHelpTitle: "Turn location back on",
    locSearching: "Finding you",
    locSlow: "This is taking longer than usual. Check that location is on.",
    mapOffline: "Map offline, zones still work",
    policeNoGovtLink: "Saaya Lite is a prototype. It is not connected to AP Police, Shakthi, T-Safe, 112 or ERSS, and it is not a government product.",
    errNoStation: "No police station within 20 km.",
    riskBandElevated: "Elevated",
    riskBandHigh: "High",
    riskBandLow: "Low",
    riskBandModerate: "Moderate",
    stateWorking: "Working",
    setAbout: "About",
    setDemo: "Demo panel",
    setDemoSub: "Prototype controls, not product features",
    setFavourites: "Favourites",
    setFavouritesSub: "Who we ask to check on you",
    setLanguage: "Language",
    setPin: "Change PIN",
    setPinSub: "Needs your current PIN",
    setPolice: "What the police see",
    setTitle: "Settings",
    statusCheckin1: "Checking in",
    statusCheckin2: "Still there?",
    statusFamily: "Telling your favourites",
    statusIdle: "Not watching",
    statusShadowAuto: "Watching this stretch",
    statusShadowManual: "Watching, you turned this on",
    statusSos: "SOS active",
    warnKeepOpenBody: "Keep this tab open while you are on the stretch. If you close it, Saaya stops watching.",
    warnLocationDenied: "Saaya cannot wake on its own without location.",
    warnPageStopped: "Your browser stopped Saaya while you were travelling. Nothing was sent.",
    zoneDataSource: "Visakhapatnam records, calibrated against NCRB 2023 city data.",
    zoneDistanceKm: "%1$s km away",
    zoneDistanceM: "%1$d m away",
    zoneSafeNoData: "This area has few records. Fewer records is not the same as safe, it can also mean fewer reports.",
    zoneStatIncidents: "Total incidents",
    zoneStatWomen: "Women-safety incidents",
    zoneStation: "Nearest station",
    zoneStationApprox: "This station location is approximate to the locality.",
    zoneTopCrimes: "Most common",
  },
  te: {
    aboutAttribFonts: "Poppins, Noto Sans Telugu SIL ఓపెన్ ఫాంట్ లైసెన్స్ కింద. Material Symbols Apache 2.0 కింద.",
    aboutAttribMap: "© OpenStreetMap contributors © CARTO",
    aboutAttribTitle: "ఆపాదింపు",
    aboutContactTitle: "సంప్రదించండి",
    aboutDataBody: "విశాఖపట్నం రికార్డులు, NCRB 2023 నగర డేటా ఆధారంగా. ప్రతి డెమో రికార్డు కృత్రిమమైనది.",
    aboutDataTitle: "డేటా",
    aboutMockConsole: "కన్సోల్ స్వీకరించే వైపును చూపిస్తుంది. ఇది పోలీస్ వ్యవస్థ కాదు, ఏ పోలీసు శాఖా దీన్ని ఉపయోగించడం లేదు.",
    aboutMockDelivery: "SMS, WhatsApp సందేశాలు తయారై స్క్రీన్‌పై కనిపిస్తాయి, ఎప్పుడూ పంపబడవు. నిజమైన డెలివరీకి భారత DLT నమోదు అవసరం.",
    aboutMockTitle: "ఏది నమూనా మాత్రమే",
    aboutNoAiBody: "ఈ యాప్ తీసుకునే ప్రతి నిర్ణయం మీరు చదవగలిగే స్థిర నియమం. ఇందులో ఏ మోడల్ లేదు.",
    aboutNoAiTitle: "AI లేదు",
    aboutNotTitle: "ఇది ఏమి కాదు",
    aboutRealArm: "ఏదీ నొక్కకుండా ఆటోమేటిక్ ఆర్మింగ్",
    aboutRealConsole: "ప్రత్యక్ష కన్సోల్",
    aboutRealDetail: "జోన్ వివరాలు, సమీప స్టేషన్",
    aboutRealFamily: "సందర్భంతో తయారైన ఆత్మీయుల హెచ్చరిక",
    aboutRealLadder: "నాలుగు దశల చెక్-ఇన్ నిచ్చెన, నిజమైన సమయాలతో",
    aboutRealMap: "విశాఖపట్నం మ్యాప్, నిజమైన రికార్డుల నుండి 24 జోన్లు",
    aboutRealSos: "PIN రక్షణ ఉన్న SOS",
    aboutRealTitle: "ఏది నిజం",
    aboutRealWrites: "రాష్ట్ర వ్యూకి రెండు రాతలు",
    aboutTitle: "గురించి",
    aboutVersion: "వెర్షన్ %1$s (%2$d)",
    aboutWhatBody: "సాయ లైట్ అనేది Build What Moves India కోసం తయారుచేసిన ప్రోటోటైప్. భారత అత్యవసర యాప్‌ల కింద లేని ఒక దశను ఇది చూపిస్తుంది: ఏదీ జరగకముందే పనిచేసేది.",
    aboutWhatTitle: "ఇది ఏమిటి",
    appName: "సాయ లైట్",
    cdBack: "వెనక్కి వెళ్ళు",
    cdCloseSheet: "మూసివేయి",
    cdDemoPanel: "ప్రోటోటైప్ డెమో నియంత్రణలు తెరువు",
    cdDemoReset: "డెమో సెషన్‌ను రీసెట్ చేయి. ఏదీ పంపబడదు.",
    cdDemoZonePicker: "ప్రవేశించినట్టు చూపించడానికి ఒక జోన్ ఎంచుకోండి",
    cdMap: "విశాఖపట్నం ప్రమాద ప్రాంతాల మ్యాప్",
    cdRecentre: "మీ స్థానం మీద మ్యాప్ కేంద్రీకరించు",
    cdSettings: "సెట్టింగ్స్ తెరువు",
    cdStationCall: "%1$s కి ఫోన్ చేయి",
    cdZone: "%1$s, %2$s ప్రమాద ప్రాంతం. వివరాలు తెరువు.",
    ctaCall: "కాల్ చేయి",
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
    demoSessionLiveReason: "ముందుగా ప్రస్తుత సెషన్‌ను పూర్తి చేయండి లేదా ఆపండి",
    demoSpeedNote: "టైమర్లు %1$d రెట్లు వేగంగా నడుస్తాయి. పూర్తి నిచ్చెన %3$d సెకన్లకు బదులు %2$d సెకన్లు పడుతుంది.",
    demoSpeedToggle: "డెమో వేగం",
    demoTriggerSos: "SOS ప్రారంభించు",
    errZoneData: "సాయ లైట్ విశాఖపట్నం డేటాను లోడ్ చేయలేకపోయింది. పేజీని మళ్లీ లోడ్ చేస్తే సరిపోతుంది.",
    homeArmBannerBody: "మీరు %1$s లో ఉన్నారు, ఇప్పుడు %2$s. మీరు ఏమీ చేయాల్సిన అవసరం లేదు.",
    homeArmBannerTitle: "సాయ దానంతట అదే మేల్కొంది",
    homeHourContext: "ప్రస్తుతం, %1$s %2$s గా ఉంది",
    ctaRetry: "మళ్లీ ప్రయత్నించు",
    locHelpBody: "మీ బ్రౌజర్‌లో ఈ పేజీ సైట్ సెట్టింగ్‌లు తెరిచి, లొకేషన్‌ను అనుమతించండి. తర్వాత తిరిగి వచ్చి \"మళ్లీ ప్రయత్నించు\" నొక్కండి.",
    locHelpNote: "ఈ సెట్టింగ్ ఎక్కడ ఉంటుందో మీ బ్రౌజర్‌ను బట్టి మారుతుంది.",
    locHelpTitle: "లొకేషన్ మళ్లీ ఆన్ చేయండి",
    locSearching: "మిమ్మల్ని కనుగొంటున్నాం",
    locSlow: "ఇది మామూలు కంటే ఎక్కువ సమయం తీసుకుంటోంది. లొకేషన్ ఆన్‌లో ఉందో చూడండి.",
    mapOffline: "మ్యాప్ ఆఫ్‌లైన్, జోన్‌లు ఇంకా పనిచేస్తాయి",
    policeNoGovtLink: "సాయ లైట్ ఒక ప్రోటోటైప్. ఇది AP పోలీస్, శక్తి, T-Safe, 112 లేదా ERSS తో అనుసంధానించబడలేదు, ఇది ప్రభుత్వ ఉత్పత్తి కాదు.",
    errNoStation: "20 కి.మీ. లోపు పోలీస్ స్టేషన్ లేదు.",
    riskBandElevated: "ఎక్కువ",
    riskBandHigh: "అత్యధికం",
    riskBandLow: "తక్కువ",
    riskBandModerate: "మధ్యస్థం",
    stateWorking: "పని జరుగుతోంది",
    setAbout: "గురించి",
    setDemo: "డెమో ప్యానెల్",
    setDemoSub: "ప్రోటోటైప్ నియంత్రణలు, ఉత్పత్తి ఫీచర్లు కావు",
    setFavourites: "ఆత్మీయులు",
    setFavouritesSub: "మిమ్మల్ని చూడమని ఎవరిని అడగాలి",
    setLanguage: "భాష",
    setPin: "PIN మార్చు",
    setPinSub: "మీ ప్రస్తుత PIN అవసరం",
    setPolice: "పోలీసులు ఏమి చూస్తారు",
    setTitle: "సెట్టింగ్‌లు",
    statusCheckin1: "చెక్-ఇన్ చేస్తోంది",
    statusCheckin2: "ఇంకా అక్కడ ఉన్నారా?",
    statusFamily: "మీ ఆత్మీయులకు చెబుతోంది",
    statusIdle: "గమనించడం లేదు",
    statusShadowAuto: "ఈ మార్గాన్ని గమనిస్తోంది",
    statusShadowManual: "గమనిస్తోంది, మీరు దీన్ని ఆన్ చేశారు",
    statusSos: "SOS యాక్టివ్",
    warnKeepOpenBody: "మీరు ఆ మార్గంలో ఉన్నంత సేపు ఈ ట్యాబ్ తెరిచి ఉంచండి. మూసివేస్తే సాయ గమనించడం ఆగిపోతుంది.",
    warnLocationDenied: "లొకేషన్ లేకుండా సాయ దానంతట అదే మేల్కొనదు.",
    warnPageStopped: "మీరు ప్రయాణిస్తున్నప్పుడు మీ బ్రౌజర్ సాయను ఆపింది. ఏదీ పంపబడలేదు.",
    zoneDataSource: "విశాఖపట్నం రికార్డులు, NCRB 2023 నగర డేటా ఆధారంగా.",
    zoneDistanceKm: "%1$s కి.మీ. దూరంలో",
    zoneDistanceM: "%1$d మీ. దూరంలో",
    zoneSafeNoData: "ఈ ప్రాంతంలో తక్కువ రికార్డులు ఉన్నాయి. తక్కువ రికార్డులు అంటే సురక్షితం అని కాదు, తక్కువ ఫిర్యాదులు అని కూడా కావచ్చు.",
    zoneStatIncidents: "మొత్తం ఘటనలు",
    zoneStatWomen: "మహిళా భద్రత ఘటనలు",
    zoneStation: "సమీప స్టేషన్",
    zoneStationApprox: "ఈ స్టేషన్ స్థానం ఆ ప్రాంతానికి సుమారుగా ఉంది.",
    zoneTopCrimes: "ఎక్కువగా జరిగేవి",
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
