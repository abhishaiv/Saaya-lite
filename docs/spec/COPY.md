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
| `onb_contact_title` | Your favourites | మీ ఆత్మీయులు |
| `onb_contact_body` | One person is enough. We only ask your favourites to check on you if you miss two check-ins. | ఒక్కరు చాలు. మీరు రెండు చెక్-ఇన్‌లు మిస్ అయితేనే మీ ఆత్మీయులను చూడమని అడుగుతాం. |
| `onb_contact_privacy` | This stays on your phone. Saaya never uploads your favourites. | ఇది మీ ఫోన్‌లోనే ఉంటుంది. సాయ మీ ఆత్మీయులను ఎప్పుడూ అప్‌లోడ్ చేయదు. |
| `onb_location_title` | Saaya needs to know where the stretch is | మార్గం ఎక్కడ ఉందో సాయకు తెలియాలి |
| `onb_location_body` | Location is how Saaya wakes without you pressing anything. It is not shared with anyone until you raise an SOS. | మీరు ఏదీ నొక్కకుండా సాయ మేల్కొనేది లొకేషన్ ద్వారానే. మీరు SOS ఇచ్చే వరకు ఇది ఎవరితోనూ పంచుకోబడదు. |
| `onb_location_partial` | Without background access, Saaya can only wake while the app is open. You can change this later in Settings. | బ్యాక్‌గ్రౌండ్ అనుమతి లేకపోతే, యాప్ తెరిచి ఉన్నప్పుడే సాయ మేల్కొంటుంది. దీన్ని తర్వాత సెట్టింగ్స్‌లో మార్చవచ్చు. |
| `onb_pin_title` | Set a PIN | ఒక PIN సెట్ చేయండి |
| `onb_pin_body` | Four digits. You will need it to stop a live SOS. Set it now, calmly, because you may need it when you are not calm. | నాలుగు అంకెలు. ప్రత్యక్ష SOS ఆపడానికి ఇది అవసరం. ప్రశాంతంగా ఉన్నప్పుడే దీన్ని సెట్ చేయండి. |
| **Home** | | |
| `status_idle` | Not watching | గమనించడం లేదు |
| `status_shadow_auto` | Watching this stretch | ఈ మార్గాన్ని గమనిస్తోంది |
| `status_shadow_manual` | Watching, you turned this on | గమనిస్తోంది, మీరు దీన్ని ఆన్ చేశారు |
| `home_arm_banner_title` | Saaya woke by itself | సాయ దానంతట అదే మేల్కొంది |
| `home_arm_banner_body` | You are in %1$s and it is %2$s. You did not have to do anything. | మీరు %1$s లో ఉన్నారు, ఇప్పుడు %2$s. మీరు ఏమీ చేయాల్సిన అవసరం లేదు. |
| `home_hour_context` | Right now, %1$s reads %2$s | ప్రస్తుతం, %1$s %2$s గా ఉంది |
| `cta_arm_manually` | Watch this journey | ఈ ప్రయాణాన్ని గమనించు |
| `cta_im_home` | I am home | నేను ఇంటికి చేరాను |
| `warn_location_denied` | Saaya cannot wake on its own without location. | లొకేషన్ లేకుండా సాయ దానంతట అదే మేల్కొనదు. |
| `warn_queue_failed` | An alert could not be sent. Tap to retry. | ఒక హెచ్చరిక పంపబడలేదు. మళ్లీ ప్రయత్నించడానికి నొక్కండి. |
| **Zone detail** | | |
| `zone_station_approx` | This station location is approximate to the locality. | ఈ స్టేషన్ స్థానం ఆ ప్రాంతానికి సుమారుగా ఉంది. |
| `zone_safe_no_data` | This area has few records. Fewer records is not the same as safe, it can also mean fewer reports. | ఈ ప్రాంతంలో తక్కువ రికార్డులు ఉన్నాయి. తక్కువ రికార్డులు అంటే సురక్షితం అని కాదు, తక్కువ ఫిర్యాదులు అని కూడా కావచ్చు. |
| `zone_data_source` | Visakhapatnam records, calibrated against NCRB 2023 city data. | విశాఖపట్నం రికార్డులు, NCRB 2023 నగర డేటా ఆధారంగా. |
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
| **Demo** | | |
| `demo_mode_active` | Demo speed is on. Timers are 6x faster than the real product. | డెమో వేగం ఆన్‌లో ఉంది. టైమర్లు అసలు ఉత్పత్తి కంటే 6 రెట్లు వేగంగా ఉన్నాయి. |
| `demo_panel_header` | These are prototype controls for demonstrating the journey. They are not product features. | ఇవి ప్రయాణాన్ని చూపించడానికి ప్రోటోటైప్ నియంత్రణలు. ఇవి ఉత్పత్తి ఫీచర్లు కావు. |
| **Common** | | |
| `cta_continue` | Continue | కొనసాగించు |
| `cta_add_another` | Add another favourite | మరో ఆత్మీయుడిని జోడించు |
| `cta_finish` | Finish | పూర్తి చేయి |
| `notif_channel_shadow` | Saaya is watching | సాయ గమనిస్తోంది |
| `notif_shadow_text` | Watching %1$s. Tap to open. | %1$s ని గమనిస్తోంది. తెరవడానికి నొక్కండి. |

## Notification channel names

| Channel id | Name | Importance |
|---|---|---|
| `saaya_shadow` | Watching | LOW, no sound, ongoing |
| `saaya_checkin` | Check-ins | HIGH, sound, heads-up |
| `saaya_urgent` | Urgent check-ins | HIGH, alarm sound, bypass DND |
| `saaya_sos` | SOS | HIGH, ongoing, not dismissible |


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
| `err_zone_data` | Saaya Lite could not load Visakhapatnam data. Reinstalling should fix this. | సాయ లైట్ విశాఖపట్నం డేటాను లోడ్ చేయలేకపోయింది. మళ్లీ ఇన్‌స్టాల్ చేస్తే సరిపోతుంది. |
| `err_no_station` | No police station within 20 km. | 20 కి.మీ. లోపు పోలీస్ స్టేషన్ లేదు. |
| `warn_battery_title` | Android may stop Saaya in the background | ఆండ్రాయిడ్ సాయను బ్యాక్‌గ్రౌండ్‌లో ఆపవచ్చు |
| `warn_battery_body` | To keep watching while your screen is off, Saaya needs to be left running. | మీ స్క్రీన్ ఆఫ్ ఉన్నప్పుడూ గమనించాలంటే, సాయ నడుస్తూ ఉండాలి. |
| `cta_battery_allow` | Allow | అనుమతించు |
| `warn_autostart_title` | One more step on your phone | మీ ఫోన్‌లో ఇంకో అడుగు |
| `warn_autostart_body` | %1$s phones need Autostart switched on for Saaya, or it will be closed in the background. | %1$s ఫోన్‌లకు సాయ కోసం ఆటోస్టార్ట్ ఆన్ చేయాలి, లేదంటే బ్యాక్‌గ్రౌండ్‌లో మూసివేయబడుతుంది. |
| `warn_service_killed` | Your phone stopped Saaya while you were travelling. Nothing was sent. | మీరు ప్రయాణిస్తున్నప్పుడు మీ ఫోన్ సాయను ఆపింది. ఏదీ పంపబడలేదు. |
| `warn_notif_denied` | Without notifications you may miss a check-in when the app is closed. | నోటిఫికేషన్‌లు లేకపోతే యాప్ మూసి ఉన్నప్పుడు చెక్-ఇన్ మిస్ కావచ్చు. |
| `warn_exact_alarm` | Saaya needs permission for exact timing, or check-ins may arrive late. | ఖచ్చితమైన సమయం కోసం సాయకు అనుమతి కావాలి, లేదంటే చెక్-ఇన్‌లు ఆలస్యంగా రావచ్చు. |
| `loc_searching` | Finding you | మిమ్మల్ని కనుగొంటున్నాం |
| `loc_slow` | This is taking longer than usual. Check that location is on. | ఇది మామూలు కంటే ఎక్కువ సమయం తీసుకుంటోంది. లొకేషన్ ఆన్‌లో ఉందో చూడండి. |
| `loc_last_known` | Last known, %1$s ago | చివరిగా తెలిసినది, %1$s క్రితం |
| `map_offline` | Map offline, zones still work | మ్యాప్ ఆఫ్‌లైన్, జోన్‌లు ఇంకా పనిచేస్తాయి |
