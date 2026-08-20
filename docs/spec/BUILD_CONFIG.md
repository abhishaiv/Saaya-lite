# Saaya Lite - Build Configuration
Everything Gradle, manifest and tooling. **Codex must not choose a version, a flag or a
file location.** If something here fails to resolve, follow the resolution rule and log it.

---

## 1. Version catalog: `gradle/libs.versions.toml`

```toml
[versions]
gradle             = "8.9"          # wrapper. AGP 8.7.3 requires 8.9 or newer.
agp                = "8.7.3"
kotlin             = "2.0.21"
ksp                = "2.0.21-1.0.28"
composeBom         = "2024.12.01"
coreKtx            = "1.13.1"      # 1.15.0 requires compileSdk 35; latest stable compatible with compileSdk 34.
lifecycle          = "2.8.7"
activityCompose    = "1.9.3"
navigationCompose  = "2.8.5"
hilt               = "2.53"
hiltNavCompose     = "1.2.0"
room               = "2.6.1"
securityCrypto     = "1.1.0-alpha06"
playServicesLoc    = "21.3.0"
firebaseBom        = "33.7.0"
googleServices     = "4.4.2"
osmdroid           = "6.1.20"
splashscreen       = "1.0.1"        # androidx.core:core-splashscreen
desugarJdkLibs     = "2.0.4"        # core library desugaring; java.time on minSdk 24
kotlinxSerialization = "1.7.3"
coroutines         = "1.9.0"
junit              = "4.13.2"
androidxTestJunit  = "1.2.1"
espresso           = "3.6.1"
turbine            = "1.2.0"
mockk              = "1.13.13"
```

### Resolution rule, and it is the only latitude you have

If a version above fails to resolve or is incompatible with the installed toolchain:

1. Resolve to the **latest stable release in the same major line**. Never change a major
   version, never move to an alpha or beta unless the pinned value already is one.
2. **Record the change in `CODEX_LOG.md`** with the old value, the new value and the error.
3. **Update this file** so the catalog stays the source of truth.
4. If a major version bump appears unavoidable, **STOP and report.** It is not your call.

`securityCrypto` is deliberately pinned to an alpha because the 1.0.0 stable line is
deprecated. This is intentional, do not "fix" it.

## 1b. `gradle.properties` — build memory

Committed at the repository root. Set on 2026-08-19 after `T1.1` exhausted Gradle's 512 MiB
default during KSP.

| Setting | Value | Why |
|---|---|---|
| `org.gradle.jvmargs` | `-Xmx1536m -XX:MaxMetaspaceSize=768m` | `build.gradle.heap`, `build.gradle.metaspace` |
| `kotlin.daemon.jvmargs` | `-Xmx1536m` | `build.kotlin.daemon.heap`. **KSP runs in the Kotlin daemon**, not the Gradle daemon. |
| `org.gradle.workers.max` | `2` | `build.workers.max`. 8 cores but 8 GB. |
| `org.gradle.parallel` | `false` | parallelism is not the bottleneck at this size |

**These are deliberately not the usual 2g heap / 1g metaspace advice.** That is sized for a
16 GB machine. The founder's is 8 GB, and over-allocating causes swap thrashing, which makes
builds slower and less reliable rather than more.

**If a build still runs out of memory**, the escalation order is in the comments at the top
of `gradle.properties`. Raise `kotlin.daemon.jvmargs` **first**, because KSP is where the
pressure is. Raising the Gradle heap first is the common mistake.

## 1c. Core library desugaring — required, not optional

`minSdk` is 24 and the domain layer uses `java.time`, which needs API 26. Rather than raise
`minSdk` (F31 is about reach on low-end phones) or swap the domain to epoch millis (which
would make every timing rule harder to read), enable desugaring:

```kotlin
android {
    compileOptions { isCoreLibraryDesugaringEnabled = true }
}
dependencies {
    coreLibraryDesugaring(libs.desugar.jdk.libs)
}
```

An explicit, named addition to the closed dependency list, resolved 2026-08-19 when `T4.1`
blocked on it. Fact: `dep.desugar`.

## 2. `app/build.gradle.kts` essentials

| Setting | Value |
|---|---|
| `namespace` | `com.nexaflow.saayalite` |
| `applicationId` | `com.nexaflow.saayalite` |
| `minSdk` | 24 |
| `targetSdk` | 34 |
| `compileSdk` | 34 |
| `versionCode` | 1, increment per APK you hand the founder |
| `versionName` | `"1.0.0"` |
| `jvmTarget` / `sourceCompatibility` | 17 |
| `buildFeatures.compose` | true |
| `vectorDrawables.useSupportLibrary` | true |
| `resourceConfigurations` | `["en", "te"]`. One line, keeps the APK tidy. Do not tune further. |
| `packaging.resources.excludes` | `/META-INF/{AL2.0,LGPL2.1}` |

### Build types

| | `debug` | `release` |
|---|---|---|
| `applicationIdSuffix` | `.debug` | none |
| `isDebuggable` | true | false |
| `isMinifyEnabled` | false | **false** (prototype posture, see `SPEC_README.md`) |
| `isShrinkResources` | false | **false** |
| Demo panel | visible | **visible and labelled** (deliberate, see `ARCHITECTURE.md`) |
| Logging | full | full. **Never log the PIN, a phone number, a favourite's name or a precise coordinate**, in either build type. |

## 3. Signing

**Debug signing. No keystore.** Prototype posture: a debug-signed APK sideloads and installs
exactly as well as a release-signed one, and the keystore ceremony buys us nothing a judge
can see.

Ship `assembleDebug` output, renamed `saaya-lite-v1.0.0.apk` for the landing page.

The landing page already tells the installer this is a prototype and that they will need to
allow installs from unknown sources, so nothing here surprises anyone.

`.gitignore` must contain: `google-services.json`, `local.properties`, `/build`, `.gradle`,
`.idea`, `*.apk`.

## 4. R8 / ProGuard

**Not used.** `isMinifyEnabled = false` in both build types.

R8 breaking Room, Hilt or kotlinx.serialization is a well-known way to lose an evening to
a `ClassNotFoundException` that only appears in the release build. There is no prototype
benefit that justifies the risk. No `proguard-rules.pro` file is needed.

<details>
<summary>Kept for reference only, in case a future production build needs it</summary>

```proguard

```proguard
# Keep the domain layer readable in stack traces. It is pure Kotlin and small.
-keep class com.nexaflow.saayalite.domain.** { *; }

# kotlinx.serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class com.nexaflow.saayalite.** {
    *** Companion;
}
-keepclasseswithmembers class com.nexaflow.saayalite.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Room
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# osmdroid
-keep class org.osmdroid.** { *; }
-dontwarn org.osmdroid.**

# Strip all logging from release. Nothing about a session should be recoverable
# from logcat on a shipped build.
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
}
```
</details>

## 5. Manifest privacy flags. **These are not optional.**

```xml
<application
    android:allowBackup="false"
    android:dataExtractionRules="@xml/data_extraction_rules"
    android:fullBackupContent="false"
    android:networkSecurityConfig="@xml/network_security_config"
    android:usesCleartextTraffic="false"
    ... >
```

**Why `allowBackup="false"` matters more than it looks.** It defaults to `true`. Left on,
Android automatically backs up the Room database and shared preferences to the user's
Google Drive. That would push **her favourites and the PIN hash off the device**, breaking
hard rule 4 in `README.md` and making a claim in the write-up false. Turning it off is the
only correct setting, and it is worth one line in the write-up.

`res/xml/data_extraction_rules.xml` (Android 12+ belt and braces):
```xml
<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup><exclude domain="root" /></cloud-backup>
    <device-transfer><exclude domain="root" /></device-transfer>
</data-extraction-rules>
```

`res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors><certificates src="system" /></trust-anchors>
    </base-config>
</network-security-config>
```

Everything we contact is HTTPS: CARTO tiles and Firestore. Cleartext is never needed, so
disallowing it costs nothing and is another verifiable line in the honesty section.

## 6. Splash

**Dependency:** `androidx.core:core-splashscreen:1.0.1`. This is an explicit, named addition
to the closed dependency list, resolved on 2026-08-19 when T1.1 blocked on it. It is the
platform's own splash API; hand-rolling a splash Activity is worse in every way.

**Gradle wrapper:** `gradle-8.9-bin.zip`. Set it with
`./gradlew wrapper --gradle-version 8.9 --distribution-type bin`, or write
`gradle/wrapper/gradle-wrapper.properties` directly.


Use the AndroidX **core-splashscreen** API, not a custom activity.

| Setting | Value |
|---|---|
| `windowSplashScreenBackground` | `#0B0B0F` |
| Icon | `ic_launcher_foreground`, the Saaya mark in `#A78BFA` |
| Animation | none |
| Duration | system default. **Never add an artificial delay.** |
| Exit | fade 150 ms |

The Gate screen (S1) runs behind the splash. If routing takes under 300 ms, she never sees
a second screen, which is the intent.

## 7. File and test layout

```
app/src/main/java/com/nexaflow/saayalite/...   per ARCHITECTURE.md
app/src/main/res/values/strings.xml            English
app/src/main/res/values-te/strings.xml         Telugu
app/src/main/res/xml/                          data_extraction_rules, network_security_config
app/src/main/assets/                           the three Vizag data files
app/src/test/java/com/nexaflow/saayalite/      JVM tests, TEST_PLAN.md layer 1
app/src/androidTest/java/com/nexaflow/saayalite/  instrumented, layer 2
```

| Kind | Naming |
|---|---|
| Composable file | matches the screen, e.g. `HomeScreen.kt` |
| ViewModel | `HomeViewModel.kt` |
| Test class | subject plus `Test`, e.g. `SessionEngineTest.kt` |
| Test method | backticked sentences: `` `family escalation writes exactly one sus event`() `` |

One public composable per file. Private helpers may share the file.

## 8. Git

| Rule | Value |
|---|---|
| Remote | `origin` = https://github.com/abhishaiv/Saaya-lite (public) |
| Default branch | `main` |
| Branching | commit straight to `main`. One continuous run, one author, no review gate to serve. |
| Commit granularity | **one commit per completed node**, never per file, and only after all 9 gates pass |
| Commit subject | `T4.1 session engine with full transition table` |
| Push | after every node, so the founder can follow along |
| Commit body | what changed, which gates passed, anything corrected |
| Never commit | keystore, `keystore.properties`, `google-services.json`, `local.properties` |

Commit only after **all nine verification gates pass.** A red commit makes bisecting a
nine-evening build impossible, and there is no time for that.
