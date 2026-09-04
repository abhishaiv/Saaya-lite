export type SaayaLocale = "en" | "te";

export type M4Copy = Readonly<{
  aboutAttribFonts: string;
  aboutAttribMap: string;
  aboutAttribTitle: string;
  aboutContactTitle: string;
  aboutDataBody: string;
  aboutDataTitle: string;
  aboutMockConsole: string;
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
  annFamily: string;
  appName: string;
  cdBack: string;
  cdCancelEscalation: string;
  cdCloseSheet: string;
  cdCountdown: string;
  cdDemoPanel: string;
  cdHelpNow: string;
  cdImOk: string;
  cdPinBox: string;
  cdDemoReset: string;
  cdDemoZonePicker: string;
  cdMap: string;
  cdRecentre: string;
  cdSettings: string;
  cdStationCall: string;
  cdStopSos: string;
  cdZone: string;
  ctaCall: string;
  ctaCancelImFine: string;
  ctaCountdown: string;
  ctaContinue: string;
  ctaDemo: string;
  ctaEndSus: string;
  ctaFinish: string;
  ctaHelpNow: string;
  ctaImOk: string;
  ctaArmManually: string;
  ctaImHome: string;
  ctaOpenDemo: string;
  ctaSendSms: string;
  ctaSendWhatsapp: string;
  ctaSos: string;
  ctaSus: string;
  demoJumpFamily: string;
  demoMissCheckin: string;
  demoModeActive: string;
  demoPanelHeader: string;
  demoPickZone: string;
  demoPickZoneHint: string;
  demoReset: string;
  demoResetDone: string;
  demoSessionLiveReason: string;
  demoSpeedNoteFast: string;
  demoSpeedNoteNormal: string;
  demoSpeedToggle: string;
  demoTriggerSos: string;
  errPinLocked: string;
  errPinMismatch: string;
  errPinWrong: string;
  errPinWeak: string;
  errZoneData: string;
  familyBody: string;
  familyCancelNote: string;
  familyMessageTemplate: string;
  familyMockDisclosure: string;
  familyNoContact: string;
  familySubjectFallback: string;
  familyTitle: string;
  homeArmBannerBody: string;
  homeArmBannerTitle: string;
  homeHourContext: string;
  ctaRetry: string;
  ctaStopSos: string;
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
  onbFavouriteNameLabel: string;
  onbFavouritePhoneLabel: string;
  onbLocationBody: string;
  onbLocationPartial: string;
  onbLocationTitle: string;
  onbNameHint: string;
  onbNameLabel: string;
  onbPinBody: string;
  onbPinTitle: string;
  onbBetaVizag: string;
  onbTourBody: string;
  onbTourCheckins: string;
  onbTourShadow: string;
  onbTourSos: string;
  onbTourTitle: string;
  onbWelcomeBody: string;
  onbWelcomeTitle: string;
  pinNoRecovery: string;
  pinTitle: string;
  policeNoGovtLink: string;
  errNoStation: string;
  riskBandElevated: string;
  riskBandHigh: string;
  riskBandLow: string;
  riskBandModerate: string;
  riskLevelElevated: string;
  riskLevelHigh: string;
  riskLevelModerate: string;
  stateWorking: string;
  setAbout: string;
  setDemo: string;
  setDemoSub: string;
  setFavourites: string;
  setFavouritesSub: string;
  setLanguage: string;
  setLanguageEnglish: string;
  setLanguageTelugu: string;
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
  sosLocalOnly: string;
  sosTitle: string;
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
    aboutAttribMap: "© OpenStreetMap contributors",
    aboutAttribTitle: "Attribution",
    aboutContactTitle: "Contact",
    aboutDataBody: "Visakhapatnam records, calibrated against NCRB 2023 city data. Every demo record is synthetic.",
    aboutDataTitle: "Data",
    aboutMockConsole: "No state-view console is included in this Lite round.",
    aboutMockTitle: "What is mocked",
    aboutNoAiBody: "Every decision this app makes is a fixed rule you could read. There is no model in it.",
    aboutNoAiTitle: "No AI",
    aboutNotTitle: "What this is not",
    aboutRealArm: "Automatic arming, with nothing pressed",
    aboutRealConsole: "State-view console (round two, not in Lite)",
    aboutRealDetail: "Zone detail and the nearest station",
    aboutRealFamily: "Family escalation, composed with context",
    aboutRealLadder: "The four-step check-in ladder, on real timings",
    aboutRealMap: "The Visakhapatnam map, 24 zones from real records",
    aboutRealSos: "PIN-protected SOS",
    aboutRealTitle: "What is real",
    aboutRealWrites: "State-view writes (round two, not in Lite)",
    aboutTitle: "About",
    aboutVersion: "Version %1$s (%2$d)",
    aboutWhatBody: "Saaya Lite is a prototype built for Build What Moves India. It shows the tier missing below India's emergency apps: the one that works before anything has happened.",
    aboutWhatTitle: "What this is",
    annFamily: "Saaya prepared this message on this phone. Choose a messaging app below to review it and send it yourself.",
    appName: "Saaya Lite",
    cdBack: "Go back",
    cdCancelEscalation: "Cancel this preview. It stays on your phone.",
    cdCloseSheet: "Close",
    cdCountdown: "%1$d seconds left to answer",
    cdDemoPanel: "Open prototype demo controls",
    cdHelpNow: "Start an emergency SOS immediately",
    cdImOk: "Confirm you are safe",
    cdPinBox: "PIN digit %1$d of 4",
    cdDemoReset: "Reset the demo session.",
    cdDemoZonePicker: "Choose a zone to simulate entering",
    cdMap: "Map of Visakhapatnam risk areas",
    cdRecentre: "Centre the map on your location",
    cdSettings: "Open settings",
    cdStationCall: "Call %1$s",
    cdStopSos: "Stop the SOS. Needs your PIN.",
    cdZone: "%1$s, %2$s risk area. Open details.",
    ctaCall: "Call",
    ctaCancelImFine: "Cancel, I am fine",
    ctaCountdown: "%1$s · %2$ds",
    ctaContinue: "Continue",
    ctaDemo: "Demo",
    ctaEndSus: "End SUS",
    ctaFinish: "Finish",
    ctaHelpNow: "I need help now",
    ctaImOk: "I am OK",
    ctaArmManually: "Start Shadow",
    ctaImHome: "I am home",
    ctaOpenDemo: "Open the demo",
    ctaSendSms: "Open text message",
    ctaSendWhatsapp: "Open WhatsApp",
    ctaSos: "SOS",
    ctaSus: "SUS",
    demoJumpFamily: "Jump to family escalation",
    demoMissCheckin: "Simulate a missed check-in",
    demoModeActive: "Demo speed is on. Timers are 6x faster than the real product.",
    demoPanelHeader: "These are prototype controls for demonstrating the journey. They are not product features.",
    demoPickZone: "Simulate entering a zone",
    demoPickZoneHint: "Choose any of the 24 Visakhapatnam zones.",
    demoReset: "Reset session",
    demoResetDone: "Session reset.",
    demoSessionLiveReason: "Finish or stop the current session first",
    demoSpeedNoteFast: "Timers run %1$dx faster. The full ladder takes %2$d seconds instead of %3$d.",
    demoSpeedNoteNormal: "Timers run at normal speed (%1$dx). The full ladder takes %3$d seconds.",
    demoSpeedToggle: "Demo speed",
    demoTriggerSos: "Trigger SOS",
    errPinLocked: "Too many attempts. Try again in %1$s.",
    errPinMismatch: "Those did not match. Try again.",
    errPinWrong: "Wrong PIN. %1$d attempts left.",
    errPinWeak: "Pick something less obvious.",
    errZoneData: "Saaya Lite could not load Visakhapatnam data. Reloading the page should fix this.",
    familyBody: "Saaya prepared this message on this phone. Choose a messaging app below to review it and send it yourself.",
    familyCancelNote: "If you do not cancel in %1$d seconds, Saaya opens the local-only SOS screen.",
    familyMessageTemplate: `Saaya alert - %1$s may need help.

%1$s did not answer two safety check-ins.

Where: %2$s area, Visakhapatnam
When: %3$s, %4$s
Area risk: %5$s - %6$d women-safety cases on record here
Last seen: near %7$s

Nearest police station: %8$s, %9$s (%10$d m away)

She has %11$d seconds to cancel this. If she does not, Saaya opens a local SOS screen.

Prepared locally by Saaya Lite.`,
    familyMockDisclosure: "Saaya Lite does not send this message or know whether it was sent. Your tap tries to open your messaging app with the message ready.",
    familyNoContact: "You haven't added a favourite yet. Saaya can still open an SOS.",
    familySubjectFallback: "Someone using Saaya Lite",
    familyTitle: "What your favourite would receive",
    homeArmBannerBody: "You are in %1$s and it is %2$s. You did not have to do anything.",
    homeArmBannerTitle: "Saaya woke by itself",
    homeHourContext: "Right now, %1$s reads %2$s",
    ctaRetry: "Try again",
    ctaStopSos: "Stop SOS",
    checkin1Body: "All good? Tap I'm OK and we'll keep quietly watching over you.",
    checkin1Reason: "You are in %1$s, a %2$s area, at %3$s.",
    checkin1Title: "Just checking in",
    checkin2Body: "We still haven't heard from you. Tap I'm OK when you can, or Saaya will show a local message preview in a few minutes.",
    checkin2Title: "Quick reminder",
    checkinPersistNote: "Swiping this away does not stop the timer.",
    locHelpBody: "In your browser, open the site settings for this page and allow Location. Then come back and tap Try again.",
    locHelpNote: "Where this setting lives depends on your browser.",
    locHelpTitle: "Turn location back on",
    locSearching: "Finding you",
    locSlow: "This is taking longer than usual. Check that location is on.",
    mapOffline: "Map offline, zones still work",
    onbContactBody: "One person is enough. If you miss two check-ins, Saaya shows the message they would receive.",
    onbContactPrivacy: "This stays on your phone. Saaya never uploads your favourites.",
    onbContactTitle: "Your favourites",
    onbFavouriteNameLabel: "Their name",
    onbFavouritePhoneLabel: "Their phone number",
    onbLocationBody: "Location is how Saaya wakes without you pressing anything. In this beta, it stays on your phone.",
    onbLocationPartial: "Saaya watches only while this page is open. Keep it open for the stretch you are on.",
    onbLocationTitle: "Saaya needs to know where the stretch is",
    onbNameHint: "So the local message has a subject",
    onbNameLabel: "Your name",
    onbPinBody: "Four digits. You will need it to stop a live SOS. Set it now, calmly, because you may need it when you are not calm.",
    onbPinTitle: "Set a PIN",
    onbBetaVizag: "Beta: tuned to Vizag data only.",
    onbTourBody: "Before you need it, run the guided demo on the map.",
    onbTourCheckins: "Miss a check-in to see the timed reminders and family escalation.",
    onbTourShadow: "Open the demo, turn on Demo speed, and choose a zone to see Shadow start.",
    onbTourSos: "Tap I need help now at any point to open SOS, then choose Call 112 to use your phone's dialler.",
    onbTourTitle: "See the safety flow first",
    onbWelcomeBody: "Saaya watches the stretch, not you. It wakes on its own when you enter an area that has a record, at an hour that matters.",
    onbWelcomeTitle: "You do not have to press anything",
    pinNoRecovery: "There is no way around this PIN. If there were, anyone holding your phone could use it.",
    pinTitle: "Enter your PIN to stop",
    policeNoGovtLink: "Saaya Lite is a prototype. It is not connected to AP Police, Shakthi, T-Safe, 112 or ERSS, and it is not a government product.",
    errNoStation: "No police station within 20 km.",
    riskBandElevated: "Elevated",
    riskBandHigh: "High",
    riskBandLow: "Low",
    riskBandModerate: "Moderate",
    riskLevelElevated: "Elevated Risk",
    riskLevelHigh: "High Risk",
    riskLevelModerate: "Moderate Risk",
    stateWorking: "Working",
    setAbout: "About",
    setDemo: "Demo panel",
    setDemoSub: "Prototype controls, not product features",
    setFavourites: "Favourites",
    setFavouritesSub: "Whose local message preview you can review",
    setLanguage: "Language",
    setLanguageEnglish: "English",
    setLanguageTelugu: "Telugu",
    setPin: "Change PIN",
    setPinSub: "Needs your current PIN",
    setPolice: "State view (round two)",
    setTitle: "Settings",
    statusCheckin1: "Checking in",
    statusCheckin2: "Still there?",
    statusFamily: "Preparing a message",
    statusIdle: "Not watching",
    statusShadowAuto: "Watching this stretch",
    statusShadowManual: "Watching, you turned this on",
    statusSos: "SOS active",
    sosLocalOnly: "SOS is active. This beta does not send a report. Choose a call below to open your phone's dialler.",
    sosTitle: "SOS active",
    warnKeepOpenBody: "Keep this tab open while you are on the stretch. If you close it, Saaya stops watching.",
    warnLocationDenied: "Saaya cannot wake on its own without location.",
    warnPageStopped: "Your browser stopped Saaya while you were travelling.",
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
    aboutAttribMap: "© OpenStreetMap contributors",
    aboutAttribTitle: "ఆపాదింపు",
    aboutContactTitle: "సంప్రదించండి",
    aboutDataBody: "విశాఖపట్నం రికార్డులు, NCRB 2023 నగర డేటా ఆధారంగా. ప్రతి డెమో రికార్డు కృత్రిమమైనది.",
    aboutDataTitle: "డేటా",
    aboutMockConsole: "ఈ Lite రౌండ్‌లో రాష్ట్ర వ్యూ కన్సోల్ లేదు.",
    aboutMockTitle: "ఏది నమూనా మాత్రమే",
    aboutNoAiBody: "ఈ యాప్ తీసుకునే ప్రతి నిర్ణయం మీరు చదవగలిగే స్థిర నియమం. ఇందులో ఏ మోడల్ లేదు.",
    aboutNoAiTitle: "AI లేదు",
    aboutNotTitle: "ఇది ఏమి కాదు",
    aboutRealArm: "ఏదీ నొక్కకుండా ఆటోమేటిక్ ఆర్మింగ్",
    aboutRealConsole: "రాష్ట్ర వ్యూ కన్సోల్ (రెండో రౌండ్, Lite లో లేదు)",
    aboutRealDetail: "జోన్ వివరాలు, సమీప స్టేషన్",
    aboutRealFamily: "సందర్భంతో తయారైన ఆత్మీయుల హెచ్చరిక",
    aboutRealLadder: "నాలుగు దశల చెక్-ఇన్ నిచ్చెన, నిజమైన సమయాలతో",
    aboutRealMap: "విశాఖపట్నం మ్యాప్, నిజమైన రికార్డుల నుండి 24 జోన్లు",
    aboutRealSos: "PIN రక్షణ ఉన్న SOS",
    aboutRealTitle: "ఏది నిజం",
    aboutRealWrites: "రాష్ట్ర వ్యూ రాతలు (రెండో రౌండ్, Lite లో లేవు)",
    aboutTitle: "గురించి",
    aboutVersion: "వెర్షన్ %1$s (%2$d)",
    aboutWhatBody: "సాయ లైట్ అనేది Build What Moves India కోసం తయారుచేసిన ప్రోటోటైప్. భారత అత్యవసర యాప్‌ల కింద లేని ఒక దశను ఇది చూపిస్తుంది: ఏదీ జరగకముందే పనిచేసేది.",
    aboutWhatTitle: "ఇది ఏమిటి",
    annFamily: "సాయ ఈ సందేశాన్ని మీ ఫోన్‌లో తయారుచేసింది. దాన్ని పరిశీలించి మీరే పంపడానికి దిగువన ఉన్న మెసేజింగ్ యాప్‌ను ఎంచుకోండి.",
    appName: "సాయ లైట్",
    cdBack: "వెనక్కి వెళ్ళు",
    cdCancelEscalation: "ఈ ప్రివ్యూను రద్దు చేయి. ఇది మీ ఫోన్‌లోనే ఉంటుంది.",
    cdCloseSheet: "మూసివేయి",
    cdCountdown: "సమాధానం ఇవ్వడానికి %1$d సెకన్లు మిగిలాయి",
    cdDemoPanel: "ప్రోటోటైప్ డెమో నియంత్రణలు తెరువు",
    cdHelpNow: "వెంటనే అత్యవసర SOS ప్రారంభించు",
    cdImOk: "మీరు క్షేమంగా ఉన్నారని నిర్ధారించండి",
    cdPinBox: "4 లో %1$d వ PIN అంకె",
    cdDemoReset: "డెమో సెషన్‌ను రీసెట్ చేయి.",
    cdDemoZonePicker: "ప్రవేశించినట్టు చూపించడానికి ఒక జోన్ ఎంచుకోండి",
    cdMap: "విశాఖపట్నం ప్రమాద ప్రాంతాల మ్యాప్",
    cdRecentre: "మీ స్థానం మీద మ్యాప్ కేంద్రీకరించు",
    cdSettings: "సెట్టింగ్స్ తెరువు",
    cdStationCall: "%1$s కి ఫోన్ చేయి",
    cdStopSos: "SOS ఆపు. మీ PIN అవసరం.",
    cdZone: "%1$s, %2$s ప్రమాద ప్రాంతం. వివరాలు తెరువు.",
    ctaCall: "కాల్ చేయి",
    ctaCancelImFine: "రద్దు చేయి, నేను బాగున్నాను",
    ctaCountdown: "%1$s · %2$d సెకన్లు",
    ctaContinue: "కొనసాగించు",
    ctaDemo: "డెమో",
    ctaEndSus: "SUS ఆపు",
    ctaFinish: "పూర్తి చేయి",
    ctaHelpNow: "నాకు ఇప్పుడే సహాయం కావాలి",
    ctaImOk: "నేను బాగున్నాను",
    ctaArmManually: "షాడో ప్రారంభించు",
    ctaImHome: "నేను ఇంటికి చేరాను",
    ctaOpenDemo: "డెమో తెరువు",
    ctaSendSms: "టెక్స్ట్ సందేశాన్ని తెరువు",
    ctaSendWhatsapp: "WhatsApp తెరువు",
    ctaSos: "SOS",
    ctaSus: "SUS",
    demoJumpFamily: "ఆత్మీయుల దశకు వెళ్లు",
    demoMissCheckin: "చెక్-ఇన్ మిస్ అయినట్టు చూపించు",
    demoModeActive: "డెమో వేగం ఆన్‌లో ఉంది. టైమర్లు అసలు ఉత్పత్తి కంటే 6 రెట్లు వేగంగా ఉన్నాయి.",
    demoPanelHeader: "ఇవి ప్రయాణాన్ని చూపించడానికి ప్రోటోటైప్ నియంత్రణలు. ఇవి ఉత్పత్తి ఫీచర్లు కావు.",
    demoPickZone: "ఒక జోన్‌లోకి ప్రవేశించినట్టు చూపించు",
    demoPickZoneHint: "విశాఖపట్నంలోని 24 జోన్లలో ఏదైనా ఎంచుకోండి.",
    demoReset: "సెషన్‌ను రీసెట్ చేయి",
    demoResetDone: "సెషన్ రీసెట్ అయింది.",
    demoSessionLiveReason: "ముందుగా ప్రస్తుత సెషన్‌ను పూర్తి చేయండి లేదా ఆపండి",
    demoSpeedNoteFast: "టైమర్లు %1$d రెట్లు వేగంగా నడుస్తాయి. పూర్తి నిచ్చెన %3$d సెకన్లకు బదులు %2$d సెకన్లు పడుతుంది.",
    demoSpeedNoteNormal: "టైమర్లు సాధారణ వేగంతో (%1$dx) నడుస్తాయి. పూర్తి నిచ్చెనకు %3$d సెకన్లు పడతాయి.",
    demoSpeedToggle: "డెమో వేగం",
    demoTriggerSos: "SOS ప్రారంభించు",
    errPinLocked: "చాలా ప్రయత్నాలు. %1$s తర్వాత మళ్లీ ప్రయత్నించండి.",
    errPinMismatch: "అవి సరిపోలలేదు. మళ్లీ ప్రయత్నించండి.",
    errPinWrong: "తప్పు PIN. %1$d ప్రయత్నాలు మిగిలాయి.",
    errPinWeak: "కొంచెం ఊహించలేని దాన్ని ఎంచుకోండి.",
    errZoneData: "సాయ లైట్ విశాఖపట్నం డేటాను లోడ్ చేయలేకపోయింది. పేజీని మళ్లీ లోడ్ చేస్తే సరిపోతుంది.",
    familyBody: "సాయ ఈ సందేశాన్ని మీ ఫోన్‌లో తయారుచేసింది. దాన్ని పరిశీలించి మీరే పంపడానికి దిగువన ఉన్న మెసేజింగ్ యాప్‌ను ఎంచుకోండి.",
    familyCancelNote: "%1$d సెకన్లలో మీరు రద్దు చేయకపోతే, సాయ స్థానిక SOS స్క్రీన్‌ను తెరుస్తుంది.",
    familyMessageTemplate: `సాయ హెచ్చరిక - %1$s కు సహాయం అవసరం కావచ్చు.

%1$s రెండు భద్రతా చెక్-ఇన్‌లకు స్పందించలేదు.

ఎక్కడ: విశాఖపట్నంలోని %2$s ప్రాంతం
ఎప్పుడు: %3$s, %4$s
ప్రాంత ప్రమాద స్థాయి: %5$s - ఇక్కడ నమోదైన మహిళా భద్రతా కేసులు %6$d
చివరిసారిగా కనిపించిన చోటు: %7$s సమీపంలో

సమీప పోలీస్ స్టేషన్: %8$s, %9$s (%10$d మీ. దూరంలో)

దీన్ని రద్దు చేయడానికి ఆమెకు %11$d సెకన్లు ఉన్నాయి. ఆమె రద్దు చేయకపోతే, సాయ స్థానిక SOS స్క్రీన్‌ను తెరుస్తుంది.

సాయ లైట్ ఈ సందేశాన్ని ఈ ఫోన్‌లోనే తయారుచేసింది.`,
    familyMockDisclosure: "సాయ లైట్ ఈ సందేశాన్ని పంపదు లేదా అది పంపబడిందో లేదో తెలుసుకోదు. మీ ట్యాప్‌తో సందేశం సిద్ధంగా ఉన్న మీ మెసేజింగ్ యాప్‌ను తెరవడానికి ప్రయత్నం జరుగుతుంది.",
    familyNoContact: "మీరు ఇంకా ఆత్మీయులను జోడించలేదు. అయినా సాయ SOS తెరవగలదు.",
    familySubjectFallback: "సాయ లైట్ ఉపయోగిస్తున్న వ్యక్తి",
    familyTitle: "మీ ఆత్మీయుడు పొందే సందేశం",
    homeArmBannerBody: "మీరు %1$s లో ఉన్నారు, ఇప్పుడు %2$s. మీరు ఏమీ చేయాల్సిన అవసరం లేదు.",
    homeArmBannerTitle: "సాయ దానంతట అదే మేల్కొంది",
    homeHourContext: "ప్రస్తుతం, %1$s %2$s గా ఉంది",
    ctaRetry: "మళ్లీ ప్రయత్నించు",
    ctaStopSos: "SOS ఆపు",
    checkin1Body: "అంతా బాగుందా? \"నేను బాగున్నాను\" నొక్కండి, మేము నిశ్శబ్దంగా మిమ్మల్ని గమనిస్తూ ఉంటాం.",
    checkin1Reason: "మీరు %3$s కి %2$s ప్రాంతమైన %1$s లో ఉన్నారు.",
    checkin1Title: "ఒకసారి చూస్తున్నాం",
    checkin2Body: "మీ నుండి ఇంకా సమాధానం రాలేదు. వీలైనప్పుడు \"నేను బాగున్నాను\" నొక్కండి, లేదంటే కొన్ని నిమిషాల్లో సాయ స్థానిక సందేశ ప్రివ్యూను చూపిస్తుంది.",
    checkin2Title: "ఒక చిన్న గుర్తు",
    checkinPersistNote: "దీన్ని తీసివేయడం వల్ల టైమర్ ఆగదు.",
    locHelpBody: "మీ బ్రౌజర్‌లో ఈ పేజీ సైట్ సెట్టింగ్‌లు తెరిచి, లొకేషన్‌ను అనుమతించండి. తర్వాత తిరిగి వచ్చి \"మళ్లీ ప్రయత్నించు\" నొక్కండి.",
    locHelpNote: "ఈ సెట్టింగ్ ఎక్కడ ఉంటుందో మీ బ్రౌజర్‌ను బట్టి మారుతుంది.",
    locHelpTitle: "లొకేషన్ మళ్లీ ఆన్ చేయండి",
    locSearching: "మిమ్మల్ని కనుగొంటున్నాం",
    locSlow: "ఇది మామూలు కంటే ఎక్కువ సమయం తీసుకుంటోంది. లొకేషన్ ఆన్‌లో ఉందో చూడండి.",
    mapOffline: "మ్యాప్ ఆఫ్‌లైన్, జోన్‌లు ఇంకా పనిచేస్తాయి",
    onbContactBody: "ఒక్కరు చాలు. మీరు రెండు చెక్-ఇన్‌లు మిస్ అయితే, వారు పొందే సందేశాన్ని సాయ చూపిస్తుంది.",
    onbContactPrivacy: "ఇది మీ ఫోన్‌లోనే ఉంటుంది. సాయ మీ ఆత్మీయులను ఎప్పుడూ అప్‌లోడ్ చేయదు.",
    onbContactTitle: "మీ ఆత్మీయులు",
    onbFavouriteNameLabel: "వారి పేరు",
    onbFavouritePhoneLabel: "వారి ఫోన్ నంబర్",
    onbLocationBody: "మీరు ఏదీ నొక్కకుండా సాయ మేల్కొనేది లొకేషన్ ద్వారానే. ఈ బీటాలో ఇది మీ ఫోన్‌లోనే ఉంటుంది.",
    onbLocationPartial: "ఈ పేజీ తెరిచి ఉన్నప్పుడు మాత్రమే సాయ గమనిస్తుంది. మీరు వెళ్తున్న మార్గం వరకు దీన్ని తెరిచి ఉంచండి.",
    onbLocationTitle: "మార్గం ఎక్కడ ఉందో సాయకు తెలియాలి",
    onbNameHint: "ఈ స్థానిక సందేశం ఎవరి గురించో చూపించడానికి",
    onbNameLabel: "మీ పేరు",
    onbPinBody: "నాలుగు అంకెలు. ప్రత్యక్ష SOS ఆపడానికి ఇది అవసరం. ప్రశాంతంగా ఉన్నప్పుడే దీన్ని సెట్ చేయండి.",
    onbPinTitle: "ఒక PIN సెట్ చేయండి",
    onbBetaVizag: "బీటా: విశాఖపట్నం డేటాకే సర్దుబాటు చేయబడింది.",
    onbTourBody: "అవసరం రాకముందే మ్యాప్‌లో గైడెడ్ డెమో నడపండి.",
    onbTourCheckins: "సమయంతో కూడిన గుర్తింపులు, ఆత్మీయుల దశ చూడటానికి ఒక చెక్-ఇన్ మిస్ అయినట్టు చూపించండి.",
    onbTourShadow: "డెమో తెరిచి, డెమో వేగాన్ని ఆన్ చేసి, షాడో ఎలా ప్రారంభమవుతుందో చూడటానికి ఒక జోన్ ఎంచుకోండి.",
    onbTourSos: "ఎప్పుడైనా నాకు ఇప్పుడే సహాయం కావాలి నొక్కి SOS తెరిచి, మీ ఫోన్ డయలర్‌లో 112కి కాల్ చేయండి.",
    onbTourTitle: "ముందుగా భద్రతా ప్రయాణాన్ని చూడండి",
    onbWelcomeBody: "సాయ మిమ్మల్ని కాదు, మార్గాన్ని గమనిస్తుంది. రికార్డు ఉన్న ప్రాంతంలోకి, ముఖ్యమైన సమయంలో మీరు ప్రవేశించినప్పుడు అది దానంతట అదే మేల్కొంటుంది.",
    onbWelcomeTitle: "మీరు ఏదీ నొక్కాల్సిన అవసరం లేదు",
    pinNoRecovery: "ఈ PIN ని దాటవేసే మార్గం లేదు. ఉంటే, మీ ఫోన్ పట్టుకున్న ఎవరైనా దాన్ని వాడగలరు.",
    pinTitle: "ఆపడానికి మీ PIN నమోదు చేయండి",
    policeNoGovtLink: "సాయ లైట్ ఒక ప్రోటోటైప్. ఇది AP పోలీస్, శక్తి, T-Safe, 112 లేదా ERSS తో అనుసంధానించబడలేదు, ఇది ప్రభుత్వ ఉత్పత్తి కాదు.",
    errNoStation: "20 కి.మీ. లోపు పోలీస్ స్టేషన్ లేదు.",
    riskBandElevated: "ఎక్కువ",
    riskBandHigh: "అత్యధికం",
    riskBandLow: "తక్కువ",
    riskBandModerate: "మధ్యస్థం",
    riskLevelElevated: "పెరిగిన ప్రమాదం",
    riskLevelHigh: "అధిక ప్రమాదం",
    riskLevelModerate: "మధ్యస్థ ప్రమాదం",
    stateWorking: "పని జరుగుతోంది",
    setAbout: "గురించి",
    setDemo: "డెమో ప్యానెల్",
    setDemoSub: "ప్రోటోటైప్ నియంత్రణలు, ఉత్పత్తి ఫీచర్లు కావు",
    setFavourites: "ఆత్మీయులు",
    setFavouritesSub: "మీ స్థానిక సందేశ ప్రివ్యూ ఎవరికి సంబంధించినదో",
    setLanguage: "భాష",
    setLanguageEnglish: "ఇంగ్లీష్",
    setLanguageTelugu: "తెలుగు",
    setPin: "PIN మార్చు",
    setPinSub: "మీ ప్రస్తుత PIN అవసరం",
    setPolice: "రాష్ట్ర వ్యూ (రెండో రౌండ్)",
    setTitle: "సెట్టింగ్‌లు",
    statusCheckin1: "చెక్-ఇన్ చేస్తోంది",
    statusCheckin2: "ఇంకా అక్కడ ఉన్నారా?",
    statusFamily: "సందేశం సిద్ధం చేస్తోంది",
    statusIdle: "గమనించడం లేదు",
    statusShadowAuto: "ఈ మార్గాన్ని గమనిస్తోంది",
    statusShadowManual: "గమనిస్తోంది, మీరు దీన్ని ఆన్ చేశారు",
    statusSos: "SOS యాక్టివ్",
    sosLocalOnly: "SOS యాక్టివ్‌గా ఉంది. ఈ బీటా నివేదికను పంపదు. మీ ఫోన్ డయలర్‌ను తెరవడానికి దిగువన ఉన్న కాల్ ఎంపికను ఉపయోగించండి.",
    sosTitle: "SOS యాక్టివ్",
    warnKeepOpenBody: "మీరు ఆ మార్గంలో ఉన్నంత సేపు ఈ ట్యాబ్ తెరిచి ఉంచండి. మూసివేస్తే సాయ గమనించడం ఆగిపోతుంది.",
    warnLocationDenied: "లొకేషన్ లేకుండా సాయ దానంతట అదే మేల్కొనదు.",
    warnPageStopped: "మీరు ప్రయాణిస్తున్నప్పుడు మీ బ్రౌజర్ సాయను ఆపింది.",
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
