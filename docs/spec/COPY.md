# Saaya Lite - Copy
Every user-facing string. `values/strings.xml` and `values-te/strings.xml`.

**Voice rules, inherited from the Saaya brand:**
- No em dashes. Hyphens, commas and parentheses only.
- No AI-tells: never "actually", "essentially", "ultimately", "seamless", "empower".
- Never call her a victim, never say "rescue", never say "protect you".
- She is witnessed, not saved. Second person, calm, short sentences.
- Never alarm without giving her an action in the same breath.

**Telugu strings below are a first pass and need native review by the founder before E9.**
Mark them verified in `CODEX_LOG.md` once checked. Do not ship unverified Telugu in the
demo video.

| Key | English | తెలుగు |
|---|---|---|
| `app_name` | Saaya Lite | సాయ లైట్ |
| **Onboarding** | | |
| `onb_welcome_title` | You do not have to press anything | మీరు ఏదీ నొక్కాల్సిన అవసరం లేదు |
| `onb_welcome_body` | Saaya watches the stretch, not you. It wakes on its own when you enter an area that has a record, at an hour that matters. | సాయ మిమ్మల్ని కాదు, మార్గాన్ని గమనిస్తుంది. రికార్డు ఉన్న ప్రాంతంలోకి, ముఖ్యమైన సమయంలో మీరు ప్రవేశించినప్పుడు అది దానంతట అదే మేల్కొంటుంది. |
| `onb_name_label` | Your name | మీ పేరు |
| `onb_name_hint` | So your favourites know who the alert is about | హెచ్చరిక ఎవరి గురించో మీ ఆత్మీయులకు తెలియడానికి |
| `family_subject_fallback` | Someone using Saaya Lite | సాయ లైట్ ఉపయోగిస్తున్న వ్యక్తి |
| `onb_contact_title` | Your favourites | మీ ఆత్మీయులు |
| `onb_contact_body` | One person is enough. We only ask your favourites to check on you if you miss two check-ins. | ఒక్కరు చాలు. మీరు రెండు చెక్-ఇన్‌లు మిస్ అయితేనే మీ ఆత్మీయులను చూడమని అడుగుతాం. |
| `onb_contact_privacy` | This stays on your phone. Saaya never uploads your favourites. | ఇది మీ ఫోన్‌లోనే ఉంటుంది. సాయ మీ ఆత్మీయులను ఎప్పుడూ అప్‌లోడ్ చేయదు. |
| `onb_location_title` | Saaya needs to know where the stretch is | మార్గం ఎక్కడ ఉందో సాయకు తెలియాలి |
| `onb_location_body` | Location is how Saaya wakes without you pressing anything. It is not shared with anyone until you raise an SOS. | మీరు ఏదీ నొక్కకుండా సాయ మేల్కొనేది లొకేషన్ ద్వారానే. మీరు SOS ఇచ్చే వరకు ఇది ఎవరితోనూ పంచుకోబడదు. |
| `onb_location_partial` | Saaya watches only while this page is open. Keep it open for the stretch you are on. | ఈ పేజీ తెరిచి ఉన్నప్పుడు మాత్రమే సాయ గమనిస్తుంది. మీరు వెళ్తున్న మార్గం వరకు దీన్ని తెరిచి ఉంచండి. |
| `onb_pin_title` | Set a PIN | ఒక PIN సెట్ చేయండి |
| `onb_pin_body` | Four digits. You will need it to stop a live SOS. Set it now, calmly, because you may need it when you are not calm. | నాలుగు అంకెలు. ప్రత్యక్ష SOS ఆపడానికి ఇది అవసరం. ప్రశాంతంగా ఉన్నప్పుడే దీన్ని సెట్ చేయండి. |
| **Home** | | |
| `status_idle` | Not watching | గమనించడం లేదు |
| `status_shadow_auto` | Watching this stretch | ఈ మార్గాన్ని గమనిస్తోంది |
| `status_shadow_manual` | Watching, you turned this on | గమనిస్తోంది, మీరు దీన్ని ఆన్ చేశారు |
| `status_checkin1` | Checking in | చెక్-ఇన్ చేస్తోంది |
| `status_checkin2` | Still there? | ఇంకా అక్కడ ఉన్నారా? |
| `status_family` | Telling your favourites | మీ ఆత్మీయులకు చెబుతోంది |
| `status_sos` | SOS active | SOS యాక్టివ్ |
| `state_working` | Working | పని జరుగుతోంది |
| `home_arm_banner_title` | Saaya woke by itself | సాయ దానంతట అదే మేల్కొంది |
| `home_arm_banner_body` | You are in %1$s and it is %2$s. You did not have to do anything. | మీరు %1$s లో ఉన్నారు, ఇప్పుడు %2$s. మీరు ఏమీ చేయాల్సిన అవసరం లేదు. |
| `home_hour_context` | Right now, %1$s reads %2$s | ప్రస్తుతం, %1$s %2$s గా ఉంది |
| `cta_arm_manually` | Watch this journey | ఈ ప్రయాణాన్ని గమనించు |
| `cta_im_home` | I am home | నేను ఇంటికి చేరాను |
| `warn_location_denied` | Saaya cannot wake on its own without location. | లొకేషన్ లేకుండా సాయ దానంతట అదే మేల్కొనదు. |
| `loc_help_title` | Turn location back on | లొకేషన్ మళ్లీ ఆన్ చేయండి |
| `loc_help_body` | In your browser, open the site settings for this page and allow Location. Then come back and tap Try again. | మీ బ్రౌజర్‌లో ఈ పేజీ సైట్ సెట్టింగ్‌లు తెరిచి, లొకేషన్‌ను అనుమతించండి. తర్వాత తిరిగి వచ్చి "మళ్లీ ప్రయత్నించు" నొక్కండి. |
| `loc_help_note` | Where this setting lives depends on your browser. | ఈ సెట్టింగ్ ఎక్కడ ఉంటుందో మీ బ్రౌజర్‌ను బట్టి మారుతుంది. |
| `cta_retry` | Try again | మళ్లీ ప్రయత్నించు |
| `warn_queue_failed` | An alert could not be sent. Tap to retry. | ఒక హెచ్చరిక పంపబడలేదు. మళ్లీ ప్రయత్నించడానికి నొక్కండి. |
| **Zone detail** | | |
| `zone_station_approx` | This station location is approximate to the locality. | ఈ స్టేషన్ స్థానం ఆ ప్రాంతానికి సుమారుగా ఉంది. |
| `zone_safe_no_data` | This area has few records. Fewer records is not the same as safe, it can also mean fewer reports. | ఈ ప్రాంతంలో తక్కువ రికార్డులు ఉన్నాయి. తక్కువ రికార్డులు అంటే సురక్షితం అని కాదు, తక్కువ ఫిర్యాదులు అని కూడా కావచ్చు. |
| `zone_data_source` | Visakhapatnam records, calibrated against NCRB 2023 city data. | విశాఖపట్నం రికార్డులు, NCRB 2023 నగర డేటా ఆధారంగా. |
| `zone_stat_incidents` | Total incidents | మొత్తం ఘటనలు |
| `zone_stat_women` | Women-safety incidents | మహిళా భద్రత ఘటనలు |
| `zone_top_crimes` | Most common | ఎక్కువగా జరిగేవి |
| `zone_station` | Nearest station | సమీప స్టేషన్ |
| `zone_distance_m` | %1$d m away | %1$d మీ. దూరంలో |
| `zone_distance_km` | %1$s km away | %1$s కి.మీ. దూరంలో |
| `cta_call` | Call | కాల్ చేయి |
| `risk_band_low` | Low | తక్కువ |
| `risk_band_moderate` | Moderate | మధ్యస్థం |
| `risk_band_elevated` | Elevated | ఎక్కువ |
| `risk_band_high` | High | అత్యధికం |
| **Check-ins** | | |
| `checkin1_title` | Just checking in | ఒకసారి చూస్తున్నాం |
| `checkin1_body` **(iOS verbatim)** | All good? Tap I'm OK and we'll keep quietly watching over you. | అంతా బాగుందా? "నేను బాగున్నాను" నొక్కండి, మేము నిశ్శబ్దంగా మిమ్మల్ని గమనిస్తూ ఉంటాం. |
| `checkin1_reason` | You are in %1$s, a %2$s area, at %3$s. | మీరు %3$s కి %2$s ప్రాంతమైన %1$s లో ఉన్నారు. |
| `checkin_persist_note` | Swiping this away does not stop the timer. | దీన్ని తీసివేయడం వల్ల టైమర్ ఆగదు. |
| `cta_im_ok` | I am OK | నేను బాగున్నాను |
| `cta_help_now` | I need help now | నాకు ఇప్పుడే సహాయం కావాలి |
| `checkin2_title` **(iOS verbatim)** | Quick reminder | ఒక చిన్న గుర్తు |
| `checkin2_body` **(iOS verbatim)** | We still haven't heard from you. Tap I'm OK when you can, or we'll ask your favourites to check on you in a few minutes. | మీ నుండి ఇంకా సమాధానం రాలేదు. వీలైనప్పుడు "నేను బాగున్నాను" నొక్కండి, లేదంటే కొన్ని నిమిషాల్లో మీ ఆత్మీయులను చూడమని అడుగుతాం. |
| **Family escalation** | | |
| `family_title` **(iOS verbatim)** | Your favourites are being notified | మీ ఆత్మీయులకు తెలియజేస్తున్నాం |
| `family_body` | We've asked them to check on you. This is the message. You can still stop it. | మిమ్మల్ని చూడమని వారిని అడిగాం. ఇదే సందేశం. మీరు ఇప్పటికీ ఆపవచ్చు. |
| `family_cancel_note` | If you do not cancel in %1$d seconds, Saaya raises a full SOS and shares your exact location. | %1$d సెకన్లలో మీరు రద్దు చేయకపోతే, సాయ పూర్తి SOS ఇచ్చి మీ ఖచ్చితమైన స్థానాన్ని పంచుతుంది. |
| `family_mock_disclosure` | Prototype: this message is composed but not actually sent. Real delivery needs Indian DLT registration. | ప్రోటోటైప్: ఈ సందేశం తయారైంది కానీ నిజంగా పంపబడలేదు. నిజమైన డెలివరీకి భారత DLT నమోదు అవసరం. |
| `family_no_contact` | You haven't added a favourite yet. Saaya will still raise an SOS. | మీరు ఇంకా ఆత్మీయులను జోడించలేదు. అయినా సాయ SOS ఇస్తుంది. |
| `cta_cancel_im_fine` | Cancel, I am fine | రద్దు చేయి, నేను బాగున్నాను |
| **SOS** | | |
| `sos_title` | SOS active | SOS యాక్టివ్ |
| `sos_state_notified` | The state view now has this. Your exact location and the last few minutes were sent. This is the first moment anything identifying left your phone. | రాష్ట్ర వ్యూకి ఇది ఇప్పుడు అందింది. మీ ఖచ్చితమైన స్థానం, గత కొన్ని నిమిషాలు పంపబడ్డాయి. మీ ఫోన్ నుండి గుర్తింపు సమాచారం వెళ్లిన మొదటి క్షణం ఇదే. |
| `sos_queued` | No network. This is saved and will send the moment you are connected. | నెట్‌వర్క్ లేదు. ఇది సేవ్ అయింది, కనెక్ట్ అయిన వెంటనే పంపబడుతుంది. |
| `cta_stop_sos` | Stop SOS | SOS ఆపు |
| `pin_title` | Enter your PIN to stop | ఆపడానికి మీ PIN నమోదు చేయండి |
| `pin_no_recovery` | There is no way around this PIN. If there were, anyone holding your phone could use it. | ఈ PIN ని దాటవేసే మార్గం లేదు. ఉంటే, మీ ఫోన్ పట్టుకున్న ఎవరైనా దాన్ని వాడగలరు. |
| `err_pin_wrong` | Wrong PIN. %1$d attempts left. | తప్పు PIN. %1$d ప్రయత్నాలు మిగిలాయి. |
| `err_pin_locked` | Too many attempts. Try again in %1$s. | చాలా ప్రయత్నాలు. %1$s తర్వాత మళ్లీ ప్రయత్నించండి. |
| `err_pin_weak` | Pick something less obvious. | కొంచెం ఊహించలేని దాన్ని ఎంచుకోండి. |
| `err_pin_mismatch` | Those did not match. Try again. | అవి సరిపోలలేదు. మళ్లీ ప్రయత్నించండి. |
| **Police view** | | |
| `police_title` | What the police see | పోలీసులు ఏమి చూస్తారు |
| `police_now_nothing` | Right now: nothing. | ప్రస్తుతం: ఏమీ లేదు. |
| `police_now_body` | While Saaya is watching, nothing about you leaves this phone. | సాయ గమనిస్తున్నంత సేపు, మీ గురించి ఏదీ ఈ ఫోన్ నుండి బయటకు వెళ్లదు. |
| `police_sus_title` | If you miss two check-ins | మీరు రెండు చెక్-ఇన్‌లు మిస్ అయితే |
| `police_sus_body` | Only this: the area, the hour, the date. No location point, no name, nothing linking it to any other trip you have taken. | ఇది మాత్రమే: ప్రాంతం, గంట, తేదీ. లొకేషన్ పాయింట్ లేదు, పేరు లేదు, మీ ఇతర ప్రయాణాలతో లింక్ ఏదీ లేదు. |
| `police_sos_title` | If you raise an SOS | మీరు SOS ఇస్తే |
| `police_sos_body` | Your exact location, the last few minutes, and the nearest station. This is the only moment identity crosses. | మీ ఖచ్చితమైన స్థానం, గత కొన్ని నిమిషాలు, సమీప స్టేషన్. గుర్తింపు దాటే ఏకైక క్షణం ఇదే. |
| `police_no_govt_link` | Saaya Lite is a prototype. It is not connected to AP Police, Shakthi, T-Safe, 112 or ERSS, and it is not a government product. | సాయ లైట్ ఒక ప్రోటోటైప్. ఇది AP పోలీస్, శక్తి, T-Safe, 112 లేదా ERSS తో అనుసంధానించబడలేదు, ఇది ప్రభుత్వ ఉత్పత్తి కాదు. |

### Settings (S11)

| Key | English | తెలుగు |
|---|---|---|
| `set_title` | Settings | సెట్టింగ్‌లు |
| `set_favourites` | Favourites | ఆత్మీయులు |
| `set_favourites_sub` | Who we ask to check on you | మిమ్మల్ని చూడమని ఎవరిని అడగాలి |
| `set_language` | Language | భాష |
| `set_pin` | Change PIN | PIN మార్చు |
| `set_pin_sub` | Needs your current PIN | మీ ప్రస్తుత PIN అవసరం |
| `set_police` | What the police see | పోలీసులు ఏమి చూస్తారు |
| `set_about` | About | గురించి |
| `set_demo` | Demo panel | డెమో ప్యానెల్ |
| `set_demo_sub` | Prototype controls, not product features | ప్రోటోటైప్ నియంత్రణలు, ఉత్పత్తి ఫీచర్లు కావు |

### About (S13)

| Key | English | తెలుగు |
|---|---|---|
| `about_title` | About | గురించి |
| `about_version` | Version %1$s (%2$d) | వెర్షన్ %1$s (%2$d) |
| `about_what_title` | What this is | ఇది ఏమిటి |
| `about_what_body` | Saaya Lite is a prototype built for Build What Moves India. It shows the tier missing below India's emergency apps: the one that works before anything has happened. | సాయ లైట్ అనేది Build What Moves India కోసం తయారుచేసిన ప్రోటోటైప్. భారత అత్యవసర యాప్‌ల కింద లేని ఒక దశను ఇది చూపిస్తుంది: ఏదీ జరగకముందే పనిచేసేది. |
| `about_real_title` | What is real | ఏది నిజం |
| `about_real_map` | The Visakhapatnam map, 24 zones from real records | విశాఖపట్నం మ్యాప్, నిజమైన రికార్డుల నుండి 24 జోన్లు |
| `about_real_detail` | Zone detail and the nearest station | జోన్ వివరాలు, సమీప స్టేషన్ |
| `about_real_arm` | Automatic arming, with nothing pressed | ఏదీ నొక్కకుండా ఆటోమేటిక్ ఆర్మింగ్ |
| `about_real_ladder` | The four-step check-in ladder, on real timings | నాలుగు దశల చెక్-ఇన్ నిచ్చెన, నిజమైన సమయాలతో |
| `about_real_family` | Family escalation, composed with context | సందర్భంతో తయారైన ఆత్మీయుల హెచ్చరిక |
| `about_real_sos` | PIN-protected SOS | PIN రక్షణ ఉన్న SOS |
| `about_real_writes` | Both writes to the state view | రాష్ట్ర వ్యూకి రెండు రాతలు |
| `about_real_console` | The live console | ప్రత్యక్ష కన్సోల్ |
| `about_mock_title` | What is mocked | ఏది నమూనా మాత్రమే |
| `about_mock_delivery` | SMS and WhatsApp messages are composed and shown on screen, never sent. Real delivery needs Indian DLT registration. | SMS, WhatsApp సందేశాలు తయారై స్క్రీన్‌పై కనిపిస్తాయి, ఎప్పుడూ పంపబడవు. నిజమైన డెలివరీకి భారత DLT నమోదు అవసరం. |
| `about_mock_console` | The console demonstrates the receiving end. It is not a police system and no police force uses it. | కన్సోల్ స్వీకరించే వైపును చూపిస్తుంది. ఇది పోలీస్ వ్యవస్థ కాదు, ఏ పోలీసు శాఖా దీన్ని ఉపయోగించడం లేదు. |
| `about_not_title` | What this is not | ఇది ఏమి కాదు |
| `about_noai_title` | No AI | AI లేదు |
| `about_noai_body` | Every decision this app makes is a fixed rule you could read. There is no model in it. | ఈ యాప్ తీసుకునే ప్రతి నిర్ణయం మీరు చదవగలిగే స్థిర నియమం. ఇందులో ఏ మోడల్ లేదు. |
| `about_data_title` | Data | డేటా |
| `about_data_body` | Visakhapatnam records, calibrated against NCRB 2023 city data. Every demo record is synthetic. | విశాఖపట్నం రికార్డులు, NCRB 2023 నగర డేటా ఆధారంగా. ప్రతి డెమో రికార్డు కృత్రిమమైనది. |
| `about_attrib_title` | Attribution | ఆపాదింపు |
| `about_attrib_map` | © OpenStreetMap contributors © CARTO | © OpenStreetMap contributors © CARTO |
| `about_attrib_fonts` | Poppins and Noto Sans Telugu under the SIL Open Font License. Material Symbols under Apache 2.0. | Poppins, Noto Sans Telugu SIL ఓపెన్ ఫాంట్ లైసెన్స్ కింద. Material Symbols Apache 2.0 కింద. |
| `about_contact_title` | Contact | సంప్రదించండి |
| **Demo** | | |
| `demo_mode_active` | Demo speed is on. Timers are 6x faster than the real product. | డెమో వేగం ఆన్‌లో ఉంది. టైమర్లు అసలు ఉత్పత్తి కంటే 6 రెట్లు వేగంగా ఉన్నాయి. |
| `demo_panel_header` | These are prototype controls for demonstrating the journey. They are not product features. | ఇవి ప్రయాణాన్ని చూపించడానికి ప్రోటోటైప్ నియంత్రణలు. ఇవి ఉత్పత్తి ఫీచర్లు కావు. |
| `demo_speed_toggle` | Demo speed | డెమో వేగం |
| `demo_speed_note` | Timers run %1$dx faster. The full ladder takes %2$d seconds instead of %3$d. | టైమర్లు %1$d రెట్లు వేగంగా నడుస్తాయి. పూర్తి నిచ్చెన %3$d సెకన్లకు బదులు %2$d సెకన్లు పడుతుంది. |
| `demo_pick_zone` | Simulate entering a zone | ఒక జోన్‌లోకి ప్రవేశించినట్టు చూపించు |
| `demo_pick_zone_hint` | Choose any of the 24 Visakhapatnam zones. | విశాఖపట్నంలోని 24 జోన్లలో ఏదైనా ఎంచుకోండి. |
| `demo_miss_checkin` | Simulate a missed check-in | చెక్-ఇన్ మిస్ అయినట్టు చూపించు |
| `demo_jump_family` | Jump to family escalation | ఆత్మీయుల దశకు వెళ్లు |
| `demo_trigger_sos` | Trigger SOS | SOS ప్రారంభించు |
| `demo_reset` | Reset session | సెషన్‌ను రీసెట్ చేయి |
| `demo_reset_done` | Session reset. Nothing was sent. | సెషన్ రీసెట్ అయింది. ఏదీ పంపబడలేదు. |
| `demo_session_live_reason` | Finish or stop the current session first | ముందుగా ప్రస్తుత సెషన్‌ను పూర్తి చేయండి లేదా ఆపండి |
| **Common** | | |
| `cta_continue` | Continue | కొనసాగించు |
| `cta_add_another` | Add another favourite | మరో ఆత్మీయుడిని జోడించు |
| `cta_finish` | Finish | పూర్తి చేయి |
| `notif_channel_shadow` | Saaya is watching | సాయ గమనిస్తోంది |
| `notif_shadow_text` | Watching %1$s. Tap to open. | %1$s ని గమనిస్తోంది. తెరవడానికి నొక్కండి. |

## Notification kinds

The web Notification API has no channels and no importance levels, and nothing can bypass
Do Not Disturb. These are the three kinds we post and the options each uses.

| Kind | Title | Options |
|---|---|---|
| shadow | Watching | `silent: true`, `tag: "saaya-shadow"`, re-posted rather than stacked |
| check-in | Check-ins | default sound, `tag: "saaya-checkin"` |
| urgent | Urgent check-ins | `requireInteraction: true`, urgent sound played in-page when audible |
| sos | SOS | `requireInteraction: true`, `tag: "saaya-sos"`. A web notification **can** be dismissed; SOS is re-presented on the next `visibilitychange` instead. |

## Vocabulary, locked 2026-08-18

| Never say | Always say | Why |
|---|---|---|
| trusted contact, emergency contact | **favourites** | The iOS app's word. They are people she chose, not an emergency list. |
| victim, protect you, rescue | witnessed, watching over you | The brand's whole positioning. |
| geofence, H3, coarsened, escalation ladder | plain description of what happens | She is not an engineer. |
| alert (as a noun for the family message) | we'll ask your favourites to check on you | Warmer, and more accurate. |
| Saaya (as the app's own name on screen) | **Saaya Lite** | Founder decision. Honest about what this is. |

## Copy reuse policy, locked 2026-08-18

Founder decision: **reuse the iOS strings verbatim wherever the moment matches.** Rows
marked **(iOS verbatim)** above are copied character for character from
`WomenSafetyApp/Views/SUSCheckInCardView.swift`. Do not reword them, do not "improve" them,
do not remove the contraction. They are already in the brand voice and already demo-tested.

Write fresh copy **only** for moments Lite has that iOS does not: the police view, the
demo panel, the zone map's hour context, and the prototype disclosures.

## Content descriptions

`ACCESSIBILITY_SPEC.md` requires every interactive element to describe its **action**, not
its picture. These are the strings. A `contentDescription` that names an icon
("shield icon") is a spec violation.

| Key | English | తెలుగు |
|---|---|---|
| `cd_settings` | Open settings | సెట్టింగ్స్ తెరువు |
| `cd_recentre` | Centre the map on your location | మీ స్థానం మీద మ్యాప్ కేంద్రీకరించు |
| `cd_police_view` | See exactly what the police can see | పోలీసులు ఏమి చూడగలరో చూడండి |
| `cd_zone` | %1$s, %2$s risk area. Open details. | %1$s, %2$s ప్రమాద ప్రాంతం. వివరాలు తెరువు. |
| `cd_map` | Map of Visakhapatnam risk areas | విశాఖపట్నం ప్రమాద ప్రాంతాల మ్యాప్ |
| `cd_your_location` | Your location | మీ స్థానం |
| `cd_station_call` | Call %1$s | %1$s కి ఫోన్ చేయి |
| `cd_im_ok` | Confirm you are safe | మీరు క్షేమంగా ఉన్నారని నిర్ధారించండి |
| `cd_help_now` | Start an emergency SOS immediately | వెంటనే అత్యవసర SOS ప్రారంభించు |
| `cd_cancel_escalation` | Cancel. Your favourites will not be told. | రద్దు చేయి. మీ ఆత్మీయులకు తెలియజేయబడదు. |
| `cd_stop_sos` | Stop the SOS. Needs your PIN. | SOS ఆపు. మీ PIN అవసరం. |
| `cd_arm` | Start watching this journey | ఈ ప్రయాణాన్ని గమనించడం ప్రారంభించు |
| `cd_disarm` | Stop watching. You are home. | గమనించడం ఆపు. మీరు ఇంటికి చేరారు. |
| `cd_countdown` | %1$d seconds left to answer | సమాధానం ఇవ్వడానికి %1$d సెకన్లు మిగిలాయి |
| `cd_pin_box` | PIN digit %1$d of 4 | 4 లో %1$d వ PIN అంకె |
| `cd_add_favourite` | Add a favourite | ఒక ఆత్మీయుడిని జోడించు |
| `cd_delete_favourite` | Remove %1$s from your favourites | %1$s ని మీ ఆత్మీయుల నుండి తొలగించు |
| `cd_back` | Go back | వెనక్కి వెళ్ళు |
| `cd_close_sheet` | Close | మూసివేయి |
| `cd_demo_panel` | Open prototype demo controls | ప్రోటోటైప్ డెమో నియంత్రణలు తెరువు |
| `cd_demo_zone_picker` | Choose a zone to simulate entering | ప్రవేశించినట్టు చూపించడానికి ఒక జోన్ ఎంచుకోండి |
| `cd_demo_reset` | Reset the demo session. Nothing is sent. | డెమో సెషన్‌ను రీసెట్ చేయి. ఏదీ పంపబడదు. |

### Announcements (`LiveRegion`, not visible text)

| Key | English | తెలుగు |
|---|---|---|
| `ann_armed` | Saaya is now watching this stretch | సాయ ఇప్పుడు ఈ మార్గాన్ని గమనిస్తోంది |
| `ann_checkin` | Saaya is checking in. Confirm you are safe. | సాయ చెక్ చేస్తోంది. మీరు క్షేమమని నిర్ధారించండి. |
| `ann_family` | Saaya is telling your favourites | సాయ మీ ఆత్మీయులకు తెలియజేస్తోంది |
| `ann_sos` | SOS is active. The state view has your location. | SOS యాక్టివ్. రాష్ట్ర వ్యూ దగ్గర మీ స్థానం ఉంది. |
| `ann_resolved` | Saaya has stopped watching | సాయ గమనించడం ఆపింది |

## Error, warning and system strings

| Key | English | తెలుగు |
|---|---|---|
| `err_network` | No connection. Saaya is still watching, and this will send when you are back online. | కనెక్షన్ లేదు. సాయ ఇంకా గమనిస్తోంది, ఆన్‌లైన్‌కి వచ్చాక ఇది పంపబడుతుంది. |
| `err_sync_failed` | Could not send this. Tap to try again. | దీన్ని పంపలేకపోయాం. మళ్లీ ప్రయత్నించడానికి నొక్కండి. |
| `err_zone_data` | Saaya Lite could not load Visakhapatnam data. Reloading the page should fix this. | సాయ లైట్ విశాఖపట్నం డేటాను లోడ్ చేయలేకపోయింది. పేజీని మళ్లీ లోడ్ చేస్తే సరిపోతుంది. |
| `err_no_station` | No police station within 20 km. | 20 కి.మీ. లోపు పోలీస్ స్టేషన్ లేదు. |
| `warn_keep_open_title` | Saaya only watches while this page is open | ఈ పేజీ తెరిచి ఉన్నప్పుడు మాత్రమే సాయ గమనిస్తుంది |
| `warn_keep_open_body` | Keep this tab open while you are on the stretch. If you close it, Saaya stops watching. | మీరు ఆ మార్గంలో ఉన్నంత సేపు ఈ ట్యాబ్ తెరిచి ఉంచండి. మూసివేస్తే సాయ గమనించడం ఆగిపోతుంది. |
| `warn_page_stopped` | Your browser stopped Saaya while you were travelling. Nothing was sent. | మీరు ప్రయాణిస్తున్నప్పుడు మీ బ్రౌజర్ సాయను ఆపింది. ఏదీ పంపబడలేదు. |
| `warn_notif_denied` | Without notifications you may miss a check-in when this tab is in the background. | నోటిఫికేషన్‌లు లేకపోతే ఈ ట్యాబ్ వెనుక ఉన్నప్పుడు చెక్-ఇన్ మిస్ కావచ్చు. |
| `loc_searching` | Finding you | మిమ్మల్ని కనుగొంటున్నాం |
| `loc_slow` | This is taking longer than usual. Check that location is on. | ఇది మామూలు కంటే ఎక్కువ సమయం తీసుకుంటోంది. లొకేషన్ ఆన్‌లో ఉందో చూడండి. |
| `loc_last_known` | Last known, %1$s ago | చివరిగా తెలిసినది, %1$s క్రితం |
| `map_offline` | Map offline, zones still work | మ్యాప్ ఆఫ్‌లైన్, జోన్‌లు ఇంకా పనిచేస్తాయి |
