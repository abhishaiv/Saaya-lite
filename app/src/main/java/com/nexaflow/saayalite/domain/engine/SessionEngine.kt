package com.nexaflow.saayalite.domain.engine

import java.time.Clock
import java.time.Duration
import java.time.Instant

class SessionEngine(
    private val clock: Clock,
    private val rules: Rules = Rules.DEFAULT,
) {
    fun onEvent(
        state: SessionState,
        event: SessionEvent,
        context: EngineContext,
    ): EngineResult =
        reduceSession(
            state = state,
            event = event,
            context = context.copy(now = clock.instant(), rules = rules),
        )
}

fun onEvent(
    state: SessionState,
    event: SessionEvent,
    ctx: EngineContext,
): EngineResult = reduceSession(state, event, ctx)

private fun reduceSession(
    state: SessionState,
    event: SessionEvent,
    context: EngineContext,
): EngineResult {
    if (event is SessionEvent.AppKilledRestart) {
        return recover(event.persisted, context)
    }

    validateActiveSession(state, context)

    if (state == SessionState.SOS_ACTIVE) {
        return if (event == SessionEvent.PinAccepted) {
            EngineResult(
                state = SessionState.RESOLVED,
                commands =
                    listOf(
                        Command.PatchSosStatus(SosStatus.STOPPED),
                        Command.StopForegroundService,
                    ),
                outcome = Outcome.ESCALATED_SOS,
            )
        } else {
            noOp(state)
        }
    }

    if (event is SessionEvent.PermissionRevoked && state.isActiveBeforeSos()) {
        return resolveForRevokedPermission(event.permission)
    }

    return when (state) {
        SessionState.IDLE -> reduceIdle(event, context)
        SessionState.SHADOW -> reduceShadow(event, context)
        SessionState.CHECKIN_1 -> reduceCheckInOne(event, context)
        SessionState.CHECKIN_2 -> reduceCheckInTwo(event, context)
        SessionState.FAMILY_ESCALATED -> reduceFamilyEscalated(event, context)
        SessionState.SOS_ACTIVE -> noOp(state)
        SessionState.RESOLVED -> noOp(state)
    }
}

private fun reduceIdle(
    event: SessionEvent,
    context: EngineContext,
): EngineResult =
    when (event) {
        is SessionEvent.ZoneEntered -> autoArm(event, context)
        SessionEvent.ManualArm -> manualArm(context)
        else -> noOp(SessionState.IDLE)
    }

private fun autoArm(
    event: SessionEvent.ZoneEntered,
    context: EngineContext,
): EngineResult {
    val zone = context.zone ?: return noOp(SessionState.IDLE)
    if (zone.stationId != event.zoneId) return noOp(SessionState.IDLE)

    val shouldArm =
        ArmingEvaluator(context.rules).shouldAutoArm(
            riskTier = zone.riskTier,
            hourBand = context.hourBand,
            cooldownUntil = context.cooldowns[event.zoneId],
            now = context.now,
        )
    if (!shouldArm) {
        return noOp(SessionState.IDLE)
    }

    val timer =
        scheduleAfter(
            TimerId.CHECKIN,
            IntervalCalculator(context.rules).seconds(
                riskTier = zone.riskTier,
                hourBand = context.hourBand,
                armMode = ArmMode.AUTO_ZONE,
            ),
            context,
        )
    return EngineResult(
        state = SessionState.SHADOW,
        commands =
            listOf(
                Command.PersistSessionArm(
                    armMode = ArmMode.AUTO_ZONE,
                    armedHourBand = context.hourBand,
                    armedAtEpochMs = context.now.toEpochMilli(),
                ),
                timer,
                Command.ShowArmBanner(event.zoneId, context.hourBand),
                Command.StartForegroundService,
                Command.SetLocationSampling(context.rules.samplingShadowSec),
            ),
    )
}

private fun manualArm(context: EngineContext): EngineResult {
    val timer =
        scheduleAfter(
            TimerId.CHECKIN,
            IntervalCalculator(context.rules).seconds(
                riskTier = context.zone?.riskTier,
                hourBand = context.hourBand,
                armMode = ArmMode.MANUAL,
            ),
            context,
        )
    return EngineResult(
        state = SessionState.SHADOW,
        commands =
            listOf(
                Command.PersistSessionArm(
                    armMode = ArmMode.MANUAL,
                    armedHourBand = null,
                    armedAtEpochMs = context.now.toEpochMilli(),
                ),
                timer,
                Command.StartForegroundService,
                Command.SetLocationSampling(context.rules.samplingShadowSec),
            ),
    )
}

private fun reduceShadow(
    event: SessionEvent,
    context: EngineContext,
): EngineResult =
    when (event) {
        SessionEvent.CheckInTimerFired -> showCheckInOne(context)
        is SessionEvent.ZoneExited -> zoneExit(event, context)
        SessionEvent.ManualDisarm -> manualDisarmFromShadow(context)
        SessionEvent.HelpNowTapped -> enterSos(SosTrigger.MANUAL_HELP_BUTTON, context)
        else -> noOp(SessionState.SHADOW)
    }

private fun showCheckInOne(context: EngineContext): EngineResult {
    val countdown = context.rules.checkIn1Seconds()
    return EngineResult(
        state = SessionState.CHECKIN_1,
        commands =
            listOf(
                Command.ShowCheckIn(
                    step = CHECK_IN_ONE_STEP,
                    countdownSec = countdown,
                    urgency = Urgency.GENTLE,
                ),
                scheduleAfter(TimerId.CD1, countdown, context),
            ),
    )
}

private fun zoneExit(
    event: SessionEvent.ZoneExited,
    context: EngineContext,
): EngineResult {
    if (context.armMode == ArmMode.MANUAL) {
        return noOp(SessionState.SHADOW)
    }
    return EngineResult(
        state = SessionState.RESOLVED,
        commands =
            listOf(
                Command.CancelTimer(TimerId.CHECKIN),
                Command.StopForegroundService,
                Command.LogSessionEvent(type = ZONE_EXIT_EVENT, detail = event.zoneId),
            ),
        outcome = Outcome.DISARMED,
    )
}

private fun manualDisarmFromShadow(context: EngineContext): EngineResult {
    val commands =
        buildList {
            add(Command.CancelTimer(TimerId.CHECKIN))
            add(Command.StopForegroundService)
            context.zone?.stationId?.let { zoneId ->
                add(
                    Command.StartZoneCooldown(
                        zoneId = zoneId,
                        minutes = context.rules.manualDisarmCooldownMin,
                    ),
                )
            }
        }
    return EngineResult(
        state = SessionState.RESOLVED,
        commands = commands,
        outcome = Outcome.DISARMED,
    )
}

private fun reduceCheckInOne(
    event: SessionEvent,
    context: EngineContext,
): EngineResult =
    when (event) {
        SessionEvent.OkTapped -> acknowledgeCheckIn(TimerId.CD1, context)
        is SessionEvent.CountdownExpired ->
            if (event.timer == TimerId.CD1) showCheckInTwo(context) else noOp(SessionState.CHECKIN_1)
        SessionEvent.HelpNowTapped -> enterSos(SosTrigger.MANUAL_HELP_BUTTON, context, hideCheckIn = true)
        SessionEvent.ManualDisarm -> manualDisarmFromCheckIn(TimerId.CD1, context)
        else -> noOp(SessionState.CHECKIN_1)
    }

private fun reduceCheckInTwo(
    event: SessionEvent,
    context: EngineContext,
): EngineResult =
    when (event) {
        SessionEvent.OkTapped -> acknowledgeCheckIn(TimerId.CD2, context)
        is SessionEvent.CountdownExpired ->
            if (event.timer == TimerId.CD2) enterFamilyEscalation(context) else noOp(SessionState.CHECKIN_2)
        SessionEvent.HelpNowTapped -> enterSos(SosTrigger.MANUAL_HELP_BUTTON, context, hideCheckIn = true)
        SessionEvent.ManualDisarm -> manualDisarmFromCheckIn(TimerId.CD2, context)
        else -> noOp(SessionState.CHECKIN_2)
    }

private fun acknowledgeCheckIn(
    timerId: TimerId,
    context: EngineContext,
): EngineResult {
    val intervalHourBand = context.intervalHourBand()
    val commands =
        buildList {
            add(Command.CancelTimer(timerId))
            add(Command.HideCheckIn)
            add(
                scheduleAfter(
                    TimerId.CHECKIN,
                    IntervalCalculator(context.rules).seconds(
                        riskTier = context.zone?.riskTier,
                        hourBand = intervalHourBand,
                        armMode = context.armMode,
                    ),
                    context,
                ),
            )
            context.zone?.stationId?.let { zoneId ->
                add(Command.StartZoneCooldown(zoneId, context.rules.okCooldownMin))
            }
        }
    return EngineResult(SessionState.SHADOW, commands)
}

private fun showCheckInTwo(context: EngineContext): EngineResult {
    val countdown = context.rules.checkIn2Seconds()
    return EngineResult(
        state = SessionState.CHECKIN_2,
        commands =
            listOf(
                Command.ShowCheckIn(
                    step = CHECK_IN_TWO_STEP,
                    countdownSec = countdown,
                    urgency = Urgency.URGENT,
                ),
                Command.PlayUrgentAlert,
                scheduleAfter(TimerId.CD2, countdown, context),
            ),
    )
}

private fun manualDisarmFromCheckIn(
    timerId: TimerId,
    context: EngineContext,
): EngineResult {
    val commands =
        buildList {
            add(Command.CancelTimer(timerId))
            add(Command.HideCheckIn)
            add(Command.StopForegroundService)
            context.zone?.stationId?.let { zoneId ->
                add(Command.StartZoneCooldown(zoneId, context.rules.manualDisarmCooldownMin))
            }
        }
    return EngineResult(
        state = SessionState.RESOLVED,
        commands = commands,
        outcome = Outcome.DISARMED,
    )
}

private fun enterFamilyEscalation(context: EngineContext): EngineResult {
    val countdown = context.rules.cancelWindowSeconds()
    return EngineResult(
        state = SessionState.FAMILY_ESCALATED,
        commands =
            listOf(
                Command.WriteSusEvent,
                Command.NotifyFamily,
                Command.ShowFamilyScreen,
                scheduleAfter(TimerId.CANCEL, countdown, context),
            ),
    )
}

private fun reduceFamilyEscalated(
    event: SessionEvent,
    context: EngineContext,
): EngineResult =
    when (event) {
        SessionEvent.CancelTapped ->
            EngineResult(
                state = SessionState.RESOLVED,
                commands =
                    listOf(
                        Command.CancelTimer(TimerId.CANCEL),
                        Command.PatchSusOutcome(SusOutcome.CANCELLED_BY_USER),
                        Command.CancelFamilyNotification,
                    ),
                outcome = Outcome.CANCELLED,
            )
        is SessionEvent.CountdownExpired ->
            if (event.timer == TimerId.CANCEL) {
                enterSos(SosTrigger.LADDER_LAPSE, context)
            } else {
                noOp(SessionState.FAMILY_ESCALATED)
            }
        SessionEvent.HelpNowTapped -> enterSos(SosTrigger.MANUAL_HELP_BUTTON, context)
        else -> noOp(SessionState.FAMILY_ESCALATED)
    }

private fun enterSos(
    trigger: SosTrigger,
    context: EngineContext,
    hideCheckIn: Boolean = false,
): EngineResult {
    val commands =
        buildList {
            if (hideCheckIn) add(Command.HideCheckIn)
            add(Command.LogSessionEvent(SOS_TRIGGERED_EVENT))
            add(Command.WriteSosIncident(trigger))
            if (!context.susEventWritten) add(Command.WriteSusEvent)
            add(Command.PatchSusOutcome(SusOutcome.ESCALATED_TO_SOS))
            add(Command.NotifyFamily)
            add(Command.ShowSos)
            add(Command.SetLocationSampling(context.rules.samplingSosSec))
            add(Command.RequirePinToStop)
        }
    return EngineResult(SessionState.SOS_ACTIVE, commands)
}

private fun resolveForRevokedPermission(permission: String): EngineResult =
    EngineResult(
        state = SessionState.RESOLVED,
        commands =
            TimerId.entries.map(Command::CancelTimer) +
                listOf(
                    Command.HideCheckIn,
                    Command.StopForegroundService,
                    Command.ShowPermissionWarning(permission),
                ),
        outcome = Outcome.DISARMED,
    )

private fun recover(
    persisted: PersistedSession,
    context: EngineContext,
): EngineResult {
    validatePersistedSession(persisted)
    val restoredContext =
        context.copy(
            armMode = persisted.armMode,
            armedHourBand = persisted.armedHourBand,
            armedAt = Instant.ofEpochMilli(persisted.armedAtEpochMs),
            deadline = persisted.deadlineEpochMs?.let(Instant::ofEpochMilli),
            susEventWritten = persisted.susEventWritten,
        )
    return when (persisted.state) {
        SessionState.IDLE -> noOp(SessionState.IDLE)
        SessionState.RESOLVED ->
            EngineResult(
                state = SessionState.RESOLVED,
                commands = emptyList(),
                outcome = persisted.outcome,
            )
        SessionState.SHADOW -> recoverShadow(restoredContext)
        SessionState.CHECKIN_1 -> recoverCheckInOne(restoredContext)
        SessionState.CHECKIN_2 -> recoverCheckInTwo(restoredContext)
        SessionState.FAMILY_ESCALATED -> recoverFamily(restoredContext)
        SessionState.SOS_ACTIVE ->
            EngineResult(
                state = SessionState.SOS_ACTIVE,
                commands =
                    listOf(
                        Command.StartForegroundService,
                        Command.ShowSos,
                        Command.SetLocationSampling(restoredContext.rules.samplingSosSec),
                        Command.RequirePinToStop,
                    ),
            )
    }
}

private fun recoverShadow(context: EngineContext): EngineResult {
    val deadline = requireNotNull(context.deadline) { "SHADOW recovery requires a deadline" }
    val recoveryCommands =
        listOf(
            Command.ReRegisterGeofences,
            Command.StartForegroundService,
            Command.SetLocationSampling(context.rules.samplingShadowSec),
        )
    if (!deadline.isAfter(context.now)) {
        val advanced = showCheckInOne(context)
        return advanced.copy(commands = recoveryCommands + advanced.commands)
    }
    return EngineResult(
        state = SessionState.SHADOW,
        commands =
            recoveryCommands +
                restoreTimer(TimerId.CHECKIN, remainingSeconds(context.now, deadline), deadline),
    )
}

private fun recoverCheckInOne(context: EngineContext): EngineResult {
    val deadline = requireNotNull(context.deadline) { "CHECKIN_1 recovery requires a deadline" }
    if (!deadline.isAfter(context.now)) {
        val advanced = showCheckInTwo(context)
        return advanced.copy(commands = listOf(Command.StartForegroundService) + advanced.commands)
    }
    val remaining = remainingSeconds(context.now, deadline)
    return EngineResult(
        state = SessionState.CHECKIN_1,
        commands =
            listOf(
                Command.StartForegroundService,
                Command.ShowCheckIn(CHECK_IN_ONE_STEP, remaining, Urgency.GENTLE),
                restoreTimer(TimerId.CD1, remaining, deadline),
            ),
    )
}

private fun recoverCheckInTwo(context: EngineContext): EngineResult {
    val deadline = requireNotNull(context.deadline) { "CHECKIN_2 recovery requires a deadline" }
    if (!deadline.isAfter(context.now)) {
        val advanced = enterFamilyEscalation(context)
        return advanced.copy(commands = listOf(Command.StartForegroundService) + advanced.commands)
    }
    val remaining = remainingSeconds(context.now, deadline)
    return EngineResult(
        state = SessionState.CHECKIN_2,
        commands =
            listOf(
                Command.StartForegroundService,
                Command.ShowCheckIn(CHECK_IN_TWO_STEP, remaining, Urgency.URGENT),
                restoreTimer(TimerId.CD2, remaining, deadline),
            ),
    )
}

private fun recoverFamily(context: EngineContext): EngineResult {
    val deadline = requireNotNull(context.deadline) { "FAMILY_ESCALATED recovery requires a deadline" }
    if (!deadline.isAfter(context.now)) {
        val advanced = enterSos(SosTrigger.LADDER_LAPSE, context)
        return advanced.copy(commands = listOf(Command.StartForegroundService) + advanced.commands)
    }
    return EngineResult(
        state = SessionState.FAMILY_ESCALATED,
        commands =
            listOf(
                Command.StartForegroundService,
                Command.ShowFamilyScreen,
                restoreTimer(TimerId.CANCEL, remainingSeconds(context.now, deadline), deadline),
            ),
    )
}

private fun remainingSeconds(
    now: Instant,
    deadline: Instant,
): Int {
    val remainingMillis = Duration.between(now, deadline).toMillis()
    val millisPerSecond = Duration.ofSeconds(ONE_SECOND.toLong()).toMillis()
    return Math.toIntExact((remainingMillis + millisPerSecond - ONE_SECOND) / millisPerSecond)
}

private fun scheduleAfter(
    id: TimerId,
    delaySec: Int,
    context: EngineContext,
): Command.ScheduleTimer =
    Command.ScheduleTimer(
        id = id,
        delaySec = delaySec,
        deadlineEpochMs = context.now.plusSeconds(delaySec.toLong()).toEpochMilli(),
    )

private fun restoreTimer(
    id: TimerId,
    delaySec: Int,
    deadline: Instant,
): Command.ScheduleTimer =
    Command.ScheduleTimer(
        id = id,
        delaySec = delaySec,
        deadlineEpochMs = deadline.toEpochMilli(),
    )

private fun SessionState.isActiveBeforeSos(): Boolean =
    this == SessionState.SHADOW ||
        this == SessionState.CHECKIN_1 ||
        this == SessionState.CHECKIN_2 ||
        this == SessionState.FAMILY_ESCALATED

private fun SessionState.isActiveSession(): Boolean =
    this == SessionState.SHADOW ||
        this == SessionState.CHECKIN_1 ||
        this == SessionState.CHECKIN_2 ||
        this == SessionState.FAMILY_ESCALATED ||
        this == SessionState.SOS_ACTIVE

private fun validateActiveSession(
    state: SessionState,
    context: EngineContext,
) {
    if (!state.isActiveSession()) return
    when (context.armMode) {
        ArmMode.AUTO_ZONE ->
            requireNotNull(context.armedHourBand) {
                "Active AUTO_ZONE session requires armedHourBand"
            }
        ArmMode.MANUAL ->
            require(context.armedHourBand == null) {
                "MANUAL session must not carry armedHourBand"
            }
    }
}

private fun validatePersistedSession(persisted: PersistedSession) {
    if (!persisted.state.isActiveSession()) return
    when (persisted.armMode) {
        ArmMode.AUTO_ZONE ->
            requireNotNull(persisted.armedHourBand) {
                "Recovered AUTO_ZONE session requires persisted armedHourBand"
            }
        ArmMode.MANUAL ->
            require(persisted.armedHourBand == null) {
                "Recovered MANUAL session must not carry armedHourBand"
            }
    }
}

private fun EngineContext.intervalHourBand(): HourBand =
    when (armMode) {
        ArmMode.AUTO_ZONE ->
            requireNotNull(armedHourBand) {
                "AUTO_ZONE reschedule requires armedHourBand"
            }
        ArmMode.MANUAL -> {
            require(armedHourBand == null) { "MANUAL reschedule must not carry armedHourBand" }
            hourBand
        }
    }

private fun noOp(state: SessionState): EngineResult = EngineResult(state, emptyList())

private const val CHECK_IN_ONE_STEP = 1 // grounded: ladder step index
private const val CHECK_IN_TWO_STEP = 2 // grounded: ladder step index
private const val ONE_SECOND = 1 // grounded: one-second conversion
private const val ZONE_EXIT_EVENT = "ZONE_EXIT"
private const val SOS_TRIGGERED_EVENT = "SOS_TRIGGERED"
