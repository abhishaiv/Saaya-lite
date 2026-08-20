package com.nexaflow.saayalite.domain.engine

import com.nexaflow.saayalite.domain.model.Zone
import java.time.Instant

enum class SessionState {
    IDLE,
    SHADOW,
    CHECKIN_1,
    CHECKIN_2,
    FAMILY_ESCALATED,
    SOS_ACTIVE,
    RESOLVED,
}

enum class Outcome {
    RESOLVED_OK,
    CANCELLED,
    ESCALATED_SOS,
    DISARMED,
}

enum class ArmMode {
    AUTO_ZONE,
    MANUAL,
}

enum class Urgency {
    GENTLE,
    URGENT,
    CRITICAL,
}

enum class TimerId {
    CHECKIN,
    CD1,
    CD2,
    CANCEL,
}

enum class HourBand {
    NIGHT_DEEP,
    DAWN,
    DAY,
    NIGHT_EARLY,
    NIGHT_LATE,
}

sealed interface SessionEvent {
    data class ZoneEntered(val zoneId: String) : SessionEvent

    data class ZoneExited(val zoneId: String) : SessionEvent

    data object ManualArm : SessionEvent

    data object ManualDisarm : SessionEvent

    data object CheckInTimerFired : SessionEvent

    data class CountdownExpired(val timer: TimerId) : SessionEvent

    data object OkTapped : SessionEvent

    data object HelpNowTapped : SessionEvent

    data object CancelTapped : SessionEvent

    data object PinAccepted : SessionEvent

    data class PermissionRevoked(val permission: String) : SessionEvent

    data class AppKilledRestart(val persisted: PersistedSession) : SessionEvent
}

data class EngineContext(
    val now: Instant,
    val zone: Zone?,
    val hourBand: HourBand,
    val armedHourBand: HourBand?,
    val rules: Rules,
    val armMode: ArmMode,
    val armedAt: Instant?,
    val deadline: Instant?,
    val cooldowns: Map<String, Instant>,
    val hasFavourite: Boolean,
    val susEventWritten: Boolean,
)

data class EngineResult(
    val state: SessionState,
    val commands: List<Command>,
    val outcome: Outcome? = null,
)

sealed interface Command {
    data class ShowCheckIn(
        val step: Int,
        val countdownSec: Int,
        val urgency: Urgency,
    ) : Command

    data object HideCheckIn : Command

    data class ShowArmBanner(
        val zoneId: String,
        val band: HourBand,
    ) : Command

    data object ShowFamilyScreen : Command

    data object ShowSos : Command

    data object NotifyFamily : Command

    data object CancelFamilyNotification : Command

    data object WriteSusEvent : Command

    data class PatchSusOutcome(val outcome: SusOutcome) : Command

    data class WriteSosIncident(val trigger: SosTrigger) : Command

    data class PatchSosStatus(val status: SosStatus) : Command

    data class ScheduleTimer(
        val id: TimerId,
        val delaySec: Int,
        val deadlineEpochMs: Long,
    ) : Command

    data class CancelTimer(val id: TimerId) : Command

    data object StartForegroundService : Command

    data object StopForegroundService : Command

    data class SetLocationSampling(val intervalSec: Int) : Command

    data object ReRegisterGeofences : Command

    data class LogSessionEvent(
        val type: String,
        val detail: String? = null,
    ) : Command

    data class PersistSessionArm(
        val armMode: ArmMode,
        val armedHourBand: HourBand?,
        val armedAtEpochMs: Long,
    ) : Command

    data class StartZoneCooldown(
        val zoneId: String,
        val minutes: Int,
    ) : Command

    data object PlayUrgentAlert : Command

    data object RequirePinToStop : Command

    data class ShowPermissionWarning(val permission: String) : Command
}

enum class SosTrigger {
    LADDER_LAPSE,
    MANUAL_HELP_BUTTON,
}

enum class SosStatus {
    ACTIVE,
    STOPPED,
}

enum class SusOutcome {
    PENDING,
    CANCELLED_BY_USER,
    ESCALATED_TO_SOS,
    RESOLVED_LATE,
}

data class PersistedSession(
    val sessionId: String,
    val state: SessionState,
    val armMode: ArmMode,
    val zoneId: String?,
    val armedHourBand: HourBand?,
    val armedAtEpochMs: Long,
    val deadlineEpochMs: Long?,
    val susEventWritten: Boolean,
    val outcome: Outcome? = null,
)
