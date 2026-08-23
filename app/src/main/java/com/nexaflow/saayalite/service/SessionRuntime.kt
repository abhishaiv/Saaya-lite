package com.nexaflow.saayalite.service

import com.nexaflow.saayalite.data.repository.SessionRepository
import com.nexaflow.saayalite.data.repository.ZoneRepository
import com.nexaflow.saayalite.domain.engine.ArmMode
import com.nexaflow.saayalite.domain.engine.Command
import com.nexaflow.saayalite.domain.engine.EngineContext
import com.nexaflow.saayalite.domain.engine.EngineResult
import com.nexaflow.saayalite.domain.engine.HourBand
import com.nexaflow.saayalite.domain.engine.PersistedSession
import com.nexaflow.saayalite.domain.engine.Rules
import com.nexaflow.saayalite.domain.engine.SessionEngine
import com.nexaflow.saayalite.domain.engine.SessionEvent
import com.nexaflow.saayalite.domain.engine.SessionState
import com.nexaflow.saayalite.domain.model.Zone
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import javax.inject.Inject
import javax.inject.Singleton

data class SessionExecution(
    val previousState: SessionState,
    val result: EngineResult,
    val zone: Zone?,
)

@Singleton
class SessionRuntime @Inject constructor(
    private val clock: Clock,
    private val rules: Rules,
    private val sessionRepository: SessionRepository,
    private val zoneRepository: ZoneRepository,
    private val timerScheduler: ExactAlarmScheduler,
    private val geofenceRegistrar: GeofenceRegistrar,
    private val operationalState: OperationalStateStore,
) {
    private val engine = SessionEngine(clock, rules)
    private val timeZone = ZoneId.of(SAAYA_TIME_ZONE)

    suspend fun handle(
        event: SessionEvent,
        eventZoneId: String? = null,
    ): SessionExecution {
        val persisted = sessionRepository.current()
        val isRecovery = event is SessionEvent.AppKilledRestart
        val previousState =
            when {
                isRecovery -> persisted?.state ?: SessionState.IDLE
                persisted?.state == SessionState.RESOLVED -> SessionState.IDLE
                else -> persisted?.state ?: SessionState.IDLE
            }
        val zoneId = eventZoneId ?: persisted?.zoneId
        val zone = zoneId?.let(zoneRepository::zone)
        val now = clock.instant()
        val cooldowns = sessionRepository.cooldowns()
        val result =
            engine.onEvent(
                previousState,
                event,
                context(now, zone, persisted, cooldowns),
            )

        executeLocalCommands(result, zone, now)
        val beganSession = result.commands.any { it is Command.PersistSessionArm }
        val hadActiveSession =
            persisted != null &&
                persisted.state != SessionState.IDLE &&
                persisted.state != SessionState.RESOLVED
        if (beganSession || hadActiveSession || isRecovery) {
            sessionRepository.updateState(result.state, result.outcome)
        }
        return SessionExecution(previousState, result, zone)
    }

    suspend fun recover(): SessionExecution? {
        val persisted = sessionRepository.current() ?: return null
        if (persisted.state == SessionState.IDLE || persisted.state == SessionState.RESOLVED) return null
        return handle(SessionEvent.AppKilledRestart(persisted))
    }

    suspend fun activeSession(): PersistedSession? =
        sessionRepository.current()?.takeIf {
            it.state != SessionState.IDLE && it.state != SessionState.RESOLVED
        }

    private fun context(
        now: Instant,
        zone: Zone?,
        persisted: PersistedSession?,
        cooldowns: Map<String, Instant>,
    ): EngineContext =
        EngineContext(
            now = now,
            zone = zone,
            hourBand = rules.hourBand(LocalDateTime.ofInstant(now, timeZone).toLocalTime()),
            armedHourBand = persisted?.armedHourBand,
            rules = rules,
            armMode = persisted?.armMode ?: ArmMode.AUTO_ZONE,
            armedAt = persisted?.armedAtEpochMs?.let(Instant::ofEpochMilli),
            deadline = persisted?.deadlineEpochMs?.let(Instant::ofEpochMilli),
            cooldowns = cooldowns,
            hasFavourite = false,
            susEventWritten = persisted?.susEventWritten ?: false,
        )

    private suspend fun executeLocalCommands(
        result: EngineResult,
        zone: Zone?,
        now: Instant,
    ) {
        result.commands.forEach { command ->
            when (command) {
                is Command.PersistSessionArm -> {
                    sessionRepository.begin(
                        state = result.state,
                        armMode = command.armMode,
                        zoneId = zone?.stationId,
                        armedHourBand = command.armedHourBand,
                        armedAtEpochMs = command.armedAtEpochMs,
                    )
                    operationalState.setShadowLabel(zone?.stationName)
                    operationalState.setSessionNotificationActive(true)
                }
                is Command.ScheduleTimer -> {
                    sessionRepository.updateDeadline(command.deadlineEpochMs)
                    timerScheduler.schedule(command)
                }
                is Command.CancelTimer -> {
                    timerScheduler.cancel(command.id)
                    sessionRepository.updateDeadline(null)
                }
                is Command.LogSessionEvent ->
                    sessionRepository.logEvent(command.type, command.detail, now)
                is Command.StartZoneCooldown ->
                    sessionRepository.startCooldown(
                        command.zoneId,
                        now.plus(Duration.ofMinutes(command.minutes.toLong())),
                    )
                Command.ReRegisterGeofences -> geofenceRegistrar.register()
                else -> Unit
            }
        }
    }
}

private const val SAAYA_TIME_ZONE = "Asia/Kolkata" // grounded: const.tz
