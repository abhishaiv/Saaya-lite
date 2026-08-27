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
  cdCancelEscalation: string;
  cdCloseSheet: string;
  cdCountdown: string;
  cdDemoPanel: string;
  cdImOk: string;
  cdDemoReset: string;
  cdDemoZonePicker: string;
  cdMap: string;
  cdRecentre: string;
  cdSettings: string;
  cdStationCall: string;
  cdZone: string;
  ctaCall: string;
  ctaCancelImFine: string;
  ctaContinue: string;
  ctaFinish: string;
  ctaImOk: string;
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
  errPinMismatch: string;
  errPinWeak: string;
  errZoneData: string;
  familyBody: string;
  familyCancelNote: string;
  familyMockDisclosure: string;
  familyNoContact: string;
  familySubjectFallback: string;
  familyTitle: string;
  homeArmBannerBody: string;
  homeArmBannerTitle: string;
  homeHourContext: string;
  ctaRetry: string;
  checkin1Body: string;
  checkin1Reason: string;
  checkin1Title: string;
  checkin2Body: string;
  checkin2Title: string;
  checkinPersistNote: string;
  locHelpBody: string;
  locHelpNote: string;
  locHelpTitle: string;
  locSearching: string;
  locSlow: string;
  mapOffline: string;
  onbContactBody: string;
  onbContactPrivacy: string;
  onbContactTitle: string;
  onbLocationBody: string;
  onbLocationPartial: string;
  onbLocationTitle: string;
  onbNameHint: string;
  onbNameLabel: string;
  onbPinBody: string;
  onbPinTitle: string;
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
    cdCancelEscalation: "Cancel. Your favourites will not be told.",
    cdCloseSheet: "Close",
    cdCountdown: "%1$d seconds left to answer",
    cdDemoPanel: "Open prototype demo controls",
    cdImOk: "Confirm you are safe",
    cdDemoReset: "Reset the demo session. Nothing is sent.",
    cdDemoZonePicker: "Choose a zone to simulate entering",
    cdMap: "Map of Visakhapatnam risk areas",
    cdRecentre: "Centre the map on your location",
    cdSettings: "Open settings",
    cdStationCall: "Call %1$s",
    cdZone: "%1$s, %2$s risk area. Open details.",
    ctaCall: "Call",
    ctaCancelImFine: "Cancel, I am fine",
    ctaContinue: "Continue",
    ctaFinish: "Finish",
    ctaImOk: "I am OK",
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
    errPinMismatch: "Those did not match. Try again.",
    errPinWeak: "Pick something less obvious.",
    errZoneData: "Saaya Lite could not load Visakhapatnam data. Reloading the page should fix this.",
    familyBody: "We've asked them to check on you. This is the message. You can still stop it.",
    familyCancelNote: "If you do not cancel in %1$d seconds, Saaya raises a full SOS and shares your exact location.",
    familyMockDisclosure: "Prototype: this message is composed but not actually sent. Real delivery needs Indian DLT registration.",
    familyNoContact: "You haven't added a favourite yet. Saaya will still raise an SOS.",
    familySubjectFallback: "Someone using Saaya Lite",
    familyTitle: "Your favourites are being notified",
    homeArmBannerBody: "You are in %1$s and it is %2$s. You did not have to do anything.",
    homeArmBannerTitle: "Saaya woke by itself",
    homeHourContext: "Right now, %1$s reads %2$s",
    ctaRetry: "Try again",
    checkin1Body: "All good? Tap I'm OK and we'll keep quietly watching over you.",
    checkin1Reason: "You are in %1$s, a %2$s area, at %3$s.",
    checkin1Title: "Just checking in",
    checkin2Body: "We still haven't heard from you. Tap I'm OK when you can, or we'll ask your favourites to check on you in a few minutes.",
    checkin2Title: "Quick reminder",
    checkinPersistNote: "Swiping this away does not stop the timer.",
    locHelpBody: "In your browser, open the site settings for this page and allow Location. Then come back and tap Try again.",
    locHelpNote: "Where this setting lives depends on your browser.",
    locHelpTitle: "Turn location back on",
    locSearching: "Finding you",
    locSlow: "This is taking longer than usual. Check that location is on.",
    mapOffline: "Map offline, zones still work",
    onbContactBody: "One person is enough. We only ask your favourites to check on you if you miss two check-ins.",
    onbContactPrivacy: "This stays on your phone. Saaya never uploads your favourites.",
    onbContactTitle: "Your favourites",
    onbLocationBody: "Location is how Saaya wakes without you pressing anything. It is not shared with anyone until you raise an SOS.",
    onbLocationPartial: "Saaya watches only while this page is open. Keep it open for the stretch you are on.",
    onbLocationTitle: "Saaya needs to know where the stretch is",
    onbNameHint: "So your favourites know who the alert is about",
    onbNameLabel: "Your name",
    onbPinBody: "Four digits. You will need it to stop a live SOS. Set it now, calmly, because you may need it when you are not calm.",
    onbPinTitle: "Set a PIN",
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
    cdCancelEscalation: "రద్దు చేయి. మీ ఆత్మీయులకు తెలియజేయబడదు.",
    cdCloseSheet: "మూసివేయి",
    cdCountdown: "సమాధానం ఇవ్వడానికి %1$d సెకన్లు మిగిలాయి",
    cdDemoPanel: "ప్రోటోటైప్ డెమో నియంత్రణలు తెరువు",
    cdImOk: "మీరు క్షేమంగా ఉన్నారని నిర్ధారించండి",
    cdDemoReset: "డెమో సెషన్‌ను రీసెట్ చేయి. ఏదీ పంపబడదు.",
    cdDemoZonePicker: "ప్రవేశించినట్టు చూపించడానికి ఒక జోన్ ఎంచుకోండి",
    cdMap: "విశాఖపట్నం ప్రమాద ప్రాంతాల మ్యాప్",
    cdRecentre: "మీ స్థానం మీద మ్యాప్ కేంద్రీకరించు",
    cdSettings: "సెట్టింగ్స్ తెరువు",
    cdStationCall: "%1$s కి ఫోన్ చేయి",
    cdZone: "%1$s, %2$s ప్రమాద ప్రాంతం. వివరాలు తెరువు.",
    ctaCall: "కాల్ చేయి",
    ctaCancelImFine: "రద్దు చేయి, నేను బాగున్నాను",
    ctaContinue: "కొనసాగించు",
    ctaFinish: "పూర్తి చేయి",
    ctaImOk: "నేను బాగున్నాను",
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
    errPinMismatch: "అవి సరిపోలలేదు. మళ్లీ ప్రయత్నించండి.",
    errPinWeak: "కొంచెం ఊహించలేని దాన్ని ఎంచుకోండి.",
    errZoneData: "సాయ లైట్ విశాఖపట్నం డేటాను లోడ్ చేయలేకపోయింది. పేజీని మళ్లీ లోడ్ చేస్తే సరిపోతుంది.",
    familyBody: "మిమ్మల్ని చూడమని వారిని అడిగాం. ఇదే సందేశం. మీరు ఇప్పటికీ ఆపవచ్చు.",
    familyCancelNote: "%1$d సెకన్లలో మీరు రద్దు చేయకపోతే, సాయ పూర్తి SOS ఇచ్చి మీ ఖచ్చితమైన స్థానాన్ని పంచుతుంది.",
    familyMockDisclosure: "ప్రోటోటైప్: ఈ సందేశం తయారైంది కానీ నిజంగా పంపబడలేదు. నిజమైన డెలివరీకి భారత DLT నమోదు అవసరం.",
    familyNoContact: "మీరు ఇంకా ఆత్మీయులను జోడించలేదు. అయినా సాయ SOS ఇస్తుంది.",
    familySubjectFallback: "సాయ లైట్ ఉపయోగిస్తున్న వ్యక్తి",
    familyTitle: "మీ ఆత్మీయులకు తెలియజేస్తున్నాం",
    homeArmBannerBody: "మీరు %1$s లో ఉన్నారు, ఇప్పుడు %2$s. మీరు ఏమీ చేయాల్సిన అవసరం లేదు.",
    homeArmBannerTitle: "సాయ దానంతట అదే మేల్కొంది",
    homeHourContext: "ప్రస్తుతం, %1$s %2$s గా ఉంది",
    ctaRetry: "మళ్లీ ప్రయత్నించు",
    checkin1Body: "అంతా బాగుందా? \"నేను బాగున్నాను\" నొక్కండి, మేము నిశ్శబ్దంగా మిమ్మల్ని గమనిస్తూ ఉంటాం.",
    checkin1Reason: "మీరు %3$s కి %2$s ప్రాంతమైన %1$s లో ఉన్నారు.",
    checkin1Title: "ఒకసారి చూస్తున్నాం",
    checkin2Body: "మీ నుండి ఇంకా సమాధానం రాలేదు. వీలైనప్పుడు \"నేను బాగున్నాను\" నొక్కండి, లేదంటే కొన్ని నిమిషాల్లో మీ ఆత్మీయులను చూడమని అడుగుతాం.",
    checkin2Title: "ఒక చిన్న గుర్తు",
    checkinPersistNote: "దీన్ని తీసివేయడం వల్ల టైమర్ ఆగదు.",
    locHelpBody: "మీ బ్రౌజర్‌లో ఈ పేజీ సైట్ సెట్టింగ్‌లు తెరిచి, లొకేషన్‌ను అనుమతించండి. తర్వాత తిరిగి వచ్చి \"మళ్లీ ప్రయత్నించు\" నొక్కండి.",
    locHelpNote: "ఈ సెట్టింగ్ ఎక్కడ ఉంటుందో మీ బ్రౌజర్‌ను బట్టి మారుతుంది.",
    locHelpTitle: "లొకేషన్ మళ్లీ ఆన్ చేయండి",
    locSearching: "మిమ్మల్ని కనుగొంటున్నాం",
    locSlow: "ఇది మామూలు కంటే ఎక్కువ సమయం తీసుకుంటోంది. లొకేషన్ ఆన్‌లో ఉందో చూడండి.",
    mapOffline: "మ్యాప్ ఆఫ్‌లైన్, జోన్‌లు ఇంకా పనిచేస్తాయి",
    onbContactBody: "ఒక్కరు చాలు. మీరు రెండు చెక్-ఇన్‌లు మిస్ అయితేనే మీ ఆత్మీయులను చూడమని అడుగుతాం.",
    onbContactPrivacy: "ఇది మీ ఫోన్‌లోనే ఉంటుంది. సాయ మీ ఆత్మీయులను ఎప్పుడూ అప్‌లోడ్ చేయదు.",
    onbContactTitle: "మీ ఆత్మీయులు",
    onbLocationBody: "మీరు ఏదీ నొక్కకుండా సాయ మేల్కొనేది లొకేషన్ ద్వారానే. మీరు SOS ఇచ్చే వరకు ఇది ఎవరితోనూ పంచుకోబడదు.",
    onbLocationPartial: "ఈ పేజీ తెరిచి ఉన్నప్పుడు మాత్రమే సాయ గమనిస్తుంది. మీరు వెళ్తున్న మార్గం వరకు దీన్ని తెరిచి ఉంచండి.",
    onbLocationTitle: "మార్గం ఎక్కడ ఉందో సాయకు తెలియాలి",
    onbNameHint: "హెచ్చరిక ఎవరి గురించో మీ ఆత్మీయులకు తెలియడానికి",
    onbNameLabel: "మీ పేరు",
    onbPinBody: "నాలుగు అంకెలు. ప్రత్యక్ష SOS ఆపడానికి ఇది అవసరం. ప్రశాంతంగా ఉన్నప్పుడే దీన్ని సెట్ చేయండి.",
    onbPinTitle: "ఒక PIN సెట్ చేయండి",
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
