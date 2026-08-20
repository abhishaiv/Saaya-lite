package com.nexaflow.saayalite.domain.engine

import com.nexaflow.saayalite.domain.model.LatLng
import com.nexaflow.saayalite.domain.model.RiskTier
import com.nexaflow.saayalite.domain.model.Zone
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionEngineTest {
    private val clock = MutableClock()
    private val rules = Rules.DEFAULT
    private val engine = SessionEngine(clock, rules)
    private val highZone = zone("zone-high", RiskTier.HIGH)

    @Test
    fun `high zone at deep night arms shadow and schedules one check-in`() {
        val result =
            engine.onEvent(
                SessionState.IDLE,
                SessionEvent.ZoneEntered(highZone.stationId),
                context(),
            )

        assertEquals(SessionState.SHADOW, result.state)
        val timer = result.commands.filterIsInstance<Command.ScheduleTimer>().single()
        assertEquals(TimerId.CHECKIN, timer.id)
        assertEquals(Duration.ofMinutes(5).seconds.toInt(), timer.delaySec)
        assertEquals(clock.instant().plusSeconds(timer.delaySec.toLong()).toEpochMilli(), timer.deadlineEpochMs)
        assertEquals(
            Command.PersistSessionArm(
                armMode = ArmMode.AUTO_ZONE,
                armedHourBand = HourBand.NIGHT_DEEP,
                armedAtEpochMs = clock.instant().toEpochMilli(),
            ),
            result.commands.filterIsInstance<Command.PersistSessionArm>().single(),
        )
    }

    @Test
    fun `safe zone never arms and emits nothing`() {
        val safeZone = zone("zone-safe", RiskTier.SAFE)
        val result =
            engine.onEvent(
                SessionState.IDLE,
                SessionEvent.ZoneEntered(safeZone.stationId),
                context(zone = safeZone),
            )

        assertEquals(SessionState.IDLE, result.state)
        assertTrue(result.commands.isEmpty())
    }

    @Test
    fun `manual arm captures no frozen band and schedules ten minutes`() {
        val result =
            engine.onEvent(
                SessionState.IDLE,
                SessionEvent.ManualArm,
                context(
                    zone = null,
                    armMode = ArmMode.MANUAL,
                    hourBand = HourBand.DAY,
                    armedHourBand = null,
                ),
            )

        assertEquals(SessionState.SHADOW, result.state)
        val timer = result.commands.filterIsInstance<Command.ScheduleTimer>().single()
        assertEquals(
            Duration.ofMinutes(Rules.MANUAL_INTERVAL_MINUTES.toLong()).seconds.toInt(),
            timer.delaySec,
        )
        assertEquals(
            Command.PersistSessionArm(
                armMode = ArmMode.MANUAL,
                armedHourBand = null,
                armedAtEpochMs = clock.instant().toEpochMilli(),
            ),
            result.commands.filterIsInstance<Command.PersistSessionArm>().single(),
        )
    }

    @Test
    fun `full ladder emits exact frozen countdowns and crosses boundaries in order`() {
        val checkInOne = engine.onEvent(SessionState.SHADOW, SessionEvent.CheckInTimerFired, context())
        val checkInTwo =
            engine.onEvent(
                SessionState.CHECKIN_1,
                SessionEvent.CountdownExpired(TimerId.CD1),
                context(),
            )
        val family =
            engine.onEvent(
                SessionState.CHECKIN_2,
                SessionEvent.CountdownExpired(TimerId.CD2),
                context(),
            )
        val sos =
            engine.onEvent(
                SessionState.FAMILY_ESCALATED,
                SessionEvent.CountdownExpired(TimerId.CANCEL),
                context(susEventWritten = true),
            )

        assertEquals(SessionState.CHECKIN_1, checkInOne.state)
        assertEquals(SessionState.CHECKIN_2, checkInTwo.state)
        assertEquals(SessionState.FAMILY_ESCALATED, family.state)
        assertEquals(SessionState.SOS_ACTIVE, sos.state)

        val delays =
            listOf(checkInOne, checkInTwo, family)
                .map { it.commands.filterIsInstance<Command.ScheduleTimer>().single().delaySec }
        assertEquals(listOf(90, 60, 60), delays)
        assertEquals(210, delays.sum())
    }

    @Test
    fun `OK at step one returns to shadow reschedules and starts cooldown`() {
        val result = engine.onEvent(SessionState.CHECKIN_1, SessionEvent.OkTapped, context())

        assertEquals(SessionState.SHADOW, result.state)
        assertTrue(result.commands.contains(Command.CancelTimer(TimerId.CD1)))
        assertTrue(result.commands.contains(Command.HideCheckIn))
        assertTrue(result.commands.any { it is Command.ScheduleTimer && it.id == TimerId.CHECKIN })
        assertTrue(
            result.commands.contains(
                Command.StartZoneCooldown(highZone.stationId, Rules.OK_COOLDOWN_MINUTES),
            ),
        )
    }

    @Test
    fun `OK at step two returns to shadow reschedules and starts cooldown`() {
        val result = engine.onEvent(SessionState.CHECKIN_2, SessionEvent.OkTapped, context())

        assertEquals(SessionState.SHADOW, result.state)
        assertTrue(result.commands.contains(Command.CancelTimer(TimerId.CD2)))
        assertTrue(result.commands.contains(Command.HideCheckIn))
        assertTrue(result.commands.any { it is Command.ScheduleTimer && it.id == TimerId.CHECKIN })
        assertTrue(
            result.commands.contains(
                Command.StartZoneCooldown(highZone.stationId, Rules.OK_COOLDOWN_MINUTES),
            ),
        )
    }

    @Test
    fun `manual disarm from check-in one resolves locally with exact cleanup`() {
        val result = engine.onEvent(SessionState.CHECKIN_1, SessionEvent.ManualDisarm, context())

        assertEquals(SessionState.RESOLVED, result.state)
        assertEquals(Outcome.DISARMED, result.outcome)
        assertEquals(
            listOf(
                Command.CancelTimer(TimerId.CD1),
                Command.HideCheckIn,
                Command.StopForegroundService,
                Command.StartZoneCooldown(highZone.stationId, Rules.MANUAL_DISARM_COOLDOWN_MINUTES),
            ),
            result.commands,
        )
        assertTrue(result.commands.none(::isOutboundEffect))
    }

    @Test
    fun `manual disarm from check-in two resolves locally with exact cleanup`() {
        val result = engine.onEvent(SessionState.CHECKIN_2, SessionEvent.ManualDisarm, context())

        assertEquals(SessionState.RESOLVED, result.state)
        assertEquals(Outcome.DISARMED, result.outcome)
        assertEquals(
            listOf(
                Command.CancelTimer(TimerId.CD2),
                Command.HideCheckIn,
                Command.StopForegroundService,
                Command.StartZoneCooldown(highZone.stationId, Rules.MANUAL_DISARM_COOLDOWN_MINUTES),
            ),
            result.commands,
        )
        assertTrue(result.commands.none(::isOutboundEffect))
    }

    @Test
    fun `family cancel resolves and patches the anonymous signal`() {
        val result =
            engine.onEvent(
                SessionState.FAMILY_ESCALATED,
                SessionEvent.CancelTapped,
                context(susEventWritten = true),
            )

        assertEquals(SessionState.RESOLVED, result.state)
        assertEquals(Outcome.CANCELLED, result.outcome)
        assertTrue(
            result.commands.contains(Command.PatchSusOutcome(SusOutcome.CANCELLED_BY_USER)),
        )
        assertTrue(result.commands.contains(Command.CancelFamilyNotification))
    }

    @Test
    fun `help now from shadow creates both catch-up civic signal and detailed incident`() {
        val result = engine.onEvent(SessionState.SHADOW, SessionEvent.HelpNowTapped, context())

        assertEquals(SessionState.SOS_ACTIVE, result.state)
        assertTrue(result.commands.contains(Command.WriteSusEvent))
        assertTrue(
            result.commands.contains(
                Command.WriteSosIncident(SosTrigger.MANUAL_HELP_BUTTON),
            ),
        )
        assertTrue(result.commands.contains(Command.RequirePinToStop))
    }

    @Test
    fun `SOS is sticky for every event except accepted PIN`() {
        val persisted =
            PersistedSession(
                sessionId = "synthetic-session",
                state = SessionState.SOS_ACTIVE,
                armMode = ArmMode.AUTO_ZONE,
                zoneId = highZone.stationId,
                armedHourBand = HourBand.NIGHT_DEEP,
                armedAtEpochMs = Instant.EPOCH.toEpochMilli(),
                deadlineEpochMs = null,
                susEventWritten = true,
            )
        val ignoredEvents =
            listOf(
                SessionEvent.ZoneEntered(highZone.stationId),
                SessionEvent.ZoneExited(highZone.stationId),
                SessionEvent.ManualArm,
                SessionEvent.ManualDisarm,
                SessionEvent.CheckInTimerFired,
                SessionEvent.CountdownExpired(TimerId.CD1),
                SessionEvent.OkTapped,
                SessionEvent.HelpNowTapped,
                SessionEvent.CancelTapped,
                SessionEvent.PermissionRevoked("location"),
                SessionEvent.AppKilledRestart(persisted),
            )

        ignoredEvents.forEach { event ->
            assertEquals(
                event.toString(),
                SessionState.SOS_ACTIVE,
                engine.onEvent(SessionState.SOS_ACTIVE, event, context(susEventWritten = true)).state,
            )
        }

        val stopped = engine.onEvent(SessionState.SOS_ACTIVE, SessionEvent.PinAccepted, context())
        assertEquals(SessionState.RESOLVED, stopped.state)
        assertEquals(Outcome.ESCALATED_SOS, stopped.outcome)
    }

    @Test
    fun `zone exit during check-in two cannot rescue the ladder`() {
        val result =
            engine.onEvent(
                SessionState.CHECKIN_2,
                SessionEvent.ZoneExited(highZone.stationId),
                context(),
            )

        assertEquals(SessionState.CHECKIN_2, result.state)
        assertTrue(result.commands.isEmpty())
    }

    @Test
    fun `zone exit while manually armed stays in shadow`() {
        val result =
            engine.onEvent(
                SessionState.SHADOW,
                SessionEvent.ZoneExited(highZone.stationId),
                context(armMode = ArmMode.MANUAL),
            )

        assertEquals(SessionState.SHADOW, result.state)
        assertTrue(result.commands.isEmpty())
    }

    @Test
    fun `auto zone exit resolves even when the current zone snapshot is unavailable`() {
        val result =
            engine.onEvent(
                SessionState.SHADOW,
                SessionEvent.ZoneExited(highZone.stationId),
                context(zone = null, armMode = ArmMode.AUTO_ZONE),
            )

        assertEquals(SessionState.RESOLVED, result.state)
        assertEquals(Outcome.DISARMED, result.outcome)
        assertTrue(result.commands.contains(Command.StopForegroundService))
    }

    @Test
    fun `overlapping zones choose higher tier then higher score`() {
        val moderate = zone("zone-moderate", RiskTier.MODERATE, Math.nextDown(1.0))
        val high = zone("zone-highest-tier", RiskTier.HIGH, Math.nextUp(0.0))
        assertEquals(high, selectHighestRiskZone(listOf(moderate, high)))

        val lowerScore = zone("zone-lower-score", RiskTier.HIGH, Math.nextUp(0.0))
        val higherScore = zone("zone-higher-score", RiskTier.HIGH, Math.nextDown(1.0))
        assertEquals(higherScore, selectHighestRiskZone(listOf(lowerScore, higherScore)))
    }

    @Test
    fun `enter dwell requires continuous containment for the full duration`() {
        val evaluator = DwellEvaluator(clock, rules)
        val started = evaluator.evaluate(DwellState(), listOf(highZone))

        clock.advance(
            Duration.ofSeconds((Rules.ENTER_DWELL_SECONDS - 1).toLong()),
        )
        val early = evaluator.evaluate(started.state, listOf(highZone))
        assertNull(early.event)

        clock.advance(Duration.ofSeconds(1))
        val entered = evaluator.evaluate(early.state, listOf(highZone))
        assertEquals(SessionEvent.ZoneEntered(highZone.stationId), entered.event)
    }

    @Test
    fun `exit dwell requires continuous non-containment for the full duration`() {
        val evaluator = DwellEvaluator(clock, rules)
        val active = DwellState(activeZoneId = highZone.stationId)
        val started = evaluator.evaluate(active, emptyList())

        clock.advance(
            Duration.ofSeconds((Rules.EXIT_DWELL_SECONDS - 1).toLong()),
        )
        val early = evaluator.evaluate(started.state, emptyList())
        assertNull(early.event)

        clock.advance(Duration.ofSeconds(1))
        val exited = evaluator.evaluate(early.state, emptyList())
        assertEquals(SessionEvent.ZoneExited(highZone.stationId), exited.event)
    }

    @Test
    fun `manual disarm cooldown blocks re-entry until the frozen expiry`() {
        val cooldownUntil =
            clock.instant().plus(Duration.ofMinutes(Rules.MANUAL_DISARM_COOLDOWN_MINUTES.toLong()))
        val coolingContext = context(cooldowns = mapOf(highZone.stationId to cooldownUntil))

        clock.advance(
            Duration.ofMinutes(Rules.MANUAL_DISARM_COOLDOWN_MINUTES.toLong()).minusSeconds(1),
        )
        val blocked =
            engine.onEvent(
                SessionState.IDLE,
                SessionEvent.ZoneEntered(highZone.stationId),
                coolingContext,
            )
        assertEquals(SessionState.IDLE, blocked.state)

        clock.advance(Duration.ofSeconds(1))
        val allowed =
            engine.onEvent(
                SessionState.IDLE,
                SessionEvent.ZoneEntered(highZone.stationId),
                coolingContext,
            )
        assertEquals(SessionState.SHADOW, allowed.state)
    }

    @Test
    fun `demo scales only timers while outbound intents stay byte-identical`() {
        assertEquals(35, Rules.DEMO.ladderTotalSeconds())
        assertEquals(
            Rules.DEFAULT.checkIn1Seconds() / Rules.DEMO_DIVISOR,
            Rules.DEMO.checkIn1Seconds(),
        )
        assertEquals(
            Rules.DEFAULT.checkIn2Seconds() / Rules.DEMO_DIVISOR,
            Rules.DEMO.checkIn2Seconds(),
        )
        assertEquals(
            Rules.DEFAULT.cancelWindowSeconds() / Rules.DEMO_DIVISOR,
            Rules.DEMO.cancelWindowSeconds(),
        )
        assertEquals(boundaryIntents(Rules.DEFAULT), boundaryIntents(Rules.DEMO))
    }

    @Test
    fun `nothing writes before family then civic and detailed boundaries fire once`() {
        val armed =
            engine.onEvent(
                SessionState.IDLE,
                SessionEvent.ZoneEntered(highZone.stationId),
                context(),
            )
        val checkInOne = engine.onEvent(SessionState.SHADOW, SessionEvent.CheckInTimerFired, context())
        val checkInTwo =
            engine.onEvent(
                SessionState.CHECKIN_1,
                SessionEvent.CountdownExpired(TimerId.CD1),
                context(),
            )
        assertTrue((armed.commands + checkInOne.commands + checkInTwo.commands).none(::isBackendWrite))

        val family =
            engine.onEvent(
                SessionState.CHECKIN_2,
                SessionEvent.CountdownExpired(TimerId.CD2),
                context(),
            )
        assertEquals(1, family.commands.count { it == Command.WriteSusEvent })
        assertFalse(family.commands.any { it is Command.WriteSosIncident })

        val sos =
            engine.onEvent(
                SessionState.FAMILY_ESCALATED,
                SessionEvent.CountdownExpired(TimerId.CANCEL),
                context(susEventWritten = true),
            )
        assertEquals(1, sos.commands.count { it is Command.WriteSosIncident })
    }

    @Test
    fun `permission revocation resolves pre-SOS but cannot stop active SOS`() {
        val revoked = SessionEvent.PermissionRevoked("location")
        val preSos = engine.onEvent(SessionState.CHECKIN_2, revoked, context())
        assertEquals(SessionState.RESOLVED, preSos.state)
        assertEquals(Outcome.DISARMED, preSos.outcome)
        assertTrue(preSos.commands.contains(Command.ShowPermissionWarning("location")))
        assertTrue(preSos.commands.none(::isBackendWrite))

        val sos = engine.onEvent(SessionState.SOS_ACTIVE, revoked, context())
        assertEquals(SessionState.SOS_ACTIVE, sos.state)
        assertTrue(sos.commands.isEmpty())
    }

    @Test
    fun `shadow recovery preserves its persisted deadline when demo mode changed`() {
        val originalDeadline =
            Instant.EPOCH.plus(Duration.ofMinutes(Rules.MANUAL_INTERVAL_MINUTES.toLong()))
        val persisted =
            PersistedSession(
                sessionId = "synthetic-session",
                state = SessionState.SHADOW,
                armMode = ArmMode.MANUAL,
                zoneId = null,
                armedHourBand = null,
                armedAtEpochMs = Instant.EPOCH.toEpochMilli(),
                deadlineEpochMs = originalDeadline.toEpochMilli(),
                susEventWritten = false,
            )

        val result =
            SessionEngine(clock, Rules.DEMO).onEvent(
                SessionState.SHADOW,
                SessionEvent.AppKilledRestart(persisted),
                context(zone = null, rules = Rules.DEMO, armMode = ArmMode.MANUAL),
            )

        val timer = result.commands.filterIsInstance<Command.ScheduleTimer>().single()
        assertEquals(
            Duration.ofMinutes(Rules.MANUAL_INTERVAL_MINUTES.toLong()).seconds.toInt(),
            timer.delaySec,
        )
    }

    @Test
    fun `every overdue recovery path restores foreground execution before advancing`() {
        val cases =
            listOf(
                SessionState.CHECKIN_1 to SessionState.CHECKIN_2,
                SessionState.CHECKIN_2 to SessionState.FAMILY_ESCALATED,
                SessionState.FAMILY_ESCALATED to SessionState.SOS_ACTIVE,
            )

        cases.forEach { (persistedState, expectedState) ->
            val persisted =
                PersistedSession(
                    sessionId = "synthetic-session",
                    state = persistedState,
                    armMode = ArmMode.AUTO_ZONE,
                    zoneId = highZone.stationId,
                    armedHourBand = HourBand.NIGHT_DEEP,
                    armedAtEpochMs = Instant.EPOCH.toEpochMilli(),
                    deadlineEpochMs = Instant.EPOCH.toEpochMilli(),
                    susEventWritten = persistedState == SessionState.FAMILY_ESCALATED,
                )
            val result =
                engine.onEvent(
                    persistedState,
                    SessionEvent.AppKilledRestart(persisted),
                    context(susEventWritten = persisted.susEventWritten),
                )

            assertEquals(persistedState.toString(), expectedState, result.state)
            assertEquals(Command.StartForegroundService, result.commands.first())
        }
    }

    @Test
    fun `moderate auto session reschedules from frozen deep-night band after dawn`() {
        val moderateZone = zone("zone-moderate-frozen", RiskTier.MODERATE)
        val result =
            engine.onEvent(
                SessionState.CHECKIN_1,
                SessionEvent.OkTapped,
                context(
                    zone = moderateZone,
                    hourBand = HourBand.DAWN,
                    armedHourBand = HourBand.NIGHT_DEEP,
                ),
            )

        assertEquals(SessionState.SHADOW, result.state)
        val timer = result.commands.filterIsInstance<Command.ScheduleTimer>().single()
        assertEquals(Duration.ofMinutes(12).seconds.toInt(), timer.delaySec)
        assertEquals(clock.instant().plusSeconds(timer.delaySec.toLong()).toEpochMilli(), timer.deadlineEpochMs)
    }

    @Test
    fun `active auto session crossing into current n-a band remains active`() {
        val moderateZone = zone("zone-moderate-active", RiskTier.MODERATE)
        val result =
            engine.onEvent(
                SessionState.SHADOW,
                SessionEvent.ZoneEntered(moderateZone.stationId),
                context(
                    zone = moderateZone,
                    hourBand = HourBand.DAWN,
                    armedHourBand = HourBand.NIGHT_DEEP,
                ),
            )

        assertEquals(SessionState.SHADOW, result.state)
        assertTrue(result.commands.isEmpty())
    }

    @Test
    fun `auto recovery uses persisted frozen band and absolute deadline`() {
        val moderateZone = zone("zone-moderate-recovered", RiskTier.MODERATE)
        val deadline = Instant.EPOCH.plus(Duration.ofMinutes(12))
        val persisted =
            PersistedSession(
                sessionId = "synthetic-session",
                state = SessionState.SHADOW,
                armMode = ArmMode.AUTO_ZONE,
                zoneId = moderateZone.stationId,
                armedHourBand = HourBand.NIGHT_DEEP,
                armedAtEpochMs = Instant.EPOCH.toEpochMilli(),
                deadlineEpochMs = deadline.toEpochMilli(),
                susEventWritten = false,
            )

        val recovered =
            SessionEngine(clock, Rules.DEMO).onEvent(
                SessionState.SHADOW,
                SessionEvent.AppKilledRestart(persisted),
                context(
                    zone = moderateZone,
                    rules = Rules.DEMO,
                    hourBand = HourBand.DAWN,
                    armedHourBand = null,
                ),
            )

        assertEquals(SessionState.SHADOW, recovered.state)
        val restoredTimer = recovered.commands.filterIsInstance<Command.ScheduleTimer>().single()
        assertEquals(Duration.ofMinutes(12).seconds.toInt(), restoredTimer.delaySec)
        assertEquals(deadline.toEpochMilli(), restoredTimer.deadlineEpochMs)

        val afterOk =
            engine.onEvent(
                SessionState.CHECKIN_2,
                SessionEvent.OkTapped,
                context(
                    zone = moderateZone,
                    hourBand = HourBand.DAWN,
                    armedHourBand = persisted.armedHourBand,
                ),
            )
        assertEquals(
            Duration.ofMinutes(12).seconds.toInt(),
            afterOk.commands.filterIsInstance<Command.ScheduleTimer>().single().delaySec,
        )
    }

    @Test
    fun `overdue recovered shadow immediately fires the first check-in`() {
        val persisted =
            PersistedSession(
                sessionId = "synthetic-session",
                state = SessionState.SHADOW,
                armMode = ArmMode.AUTO_ZONE,
                zoneId = highZone.stationId,
                armedHourBand = HourBand.NIGHT_DEEP,
                armedAtEpochMs = Instant.EPOCH.toEpochMilli(),
                deadlineEpochMs = Instant.EPOCH.toEpochMilli(),
                susEventWritten = false,
            )

        val result =
            engine.onEvent(
                SessionState.SHADOW,
                SessionEvent.AppKilledRestart(persisted),
                context(hourBand = HourBand.DAWN, armedHourBand = null),
            )

        assertEquals(SessionState.CHECKIN_1, result.state)
        assertTrue(result.commands.contains(Command.StartForegroundService))
        assertTrue(result.commands.any { it is Command.ShowCheckIn && it.urgency == Urgency.GENTLE })
    }

    @Test
    fun `recovered auto session with no frozen band is rejected as invalid data`() {
        val invalid =
            PersistedSession(
                sessionId = "synthetic-session",
                state = SessionState.SHADOW,
                armMode = ArmMode.AUTO_ZONE,
                zoneId = highZone.stationId,
                armedHourBand = null,
                armedAtEpochMs = Instant.EPOCH.toEpochMilli(),
                deadlineEpochMs = Instant.EPOCH.toEpochMilli(),
                susEventWritten = false,
            )

        val failure =
            runCatching {
                engine.onEvent(
                    SessionState.SHADOW,
                    SessionEvent.AppKilledRestart(invalid),
                    context(armedHourBand = null),
                )
            }
        assertTrue(failure.exceptionOrNull() is IllegalArgumentException)
    }

    @Test
    fun `fresh moderate auto attempt at dawn stays idle`() {
        val moderateZone = zone("zone-moderate-fresh", RiskTier.MODERATE)
        val result =
            engine.onEvent(
                SessionState.IDLE,
                SessionEvent.ZoneEntered(moderateZone.stationId),
                context(
                    zone = moderateZone,
                    hourBand = HourBand.DAWN,
                    armedHourBand = null,
                ),
            )

        assertEquals(SessionState.IDLE, result.state)
        assertTrue(result.commands.isEmpty())
    }

    @Test
    fun `manual reschedule remains ten minutes in every hour band`() {
        HourBand.entries.forEach { band ->
            val result =
                engine.onEvent(
                    SessionState.CHECKIN_1,
                    SessionEvent.OkTapped,
                    context(
                        zone = null,
                        armMode = ArmMode.MANUAL,
                        hourBand = band,
                        armedHourBand = null,
                    ),
                )
            assertEquals(
                band.toString(),
                Duration.ofMinutes(Rules.MANUAL_INTERVAL_MINUTES.toLong()).seconds.toInt(),
                result.commands.filterIsInstance<Command.ScheduleTimer>().single().delaySec,
            )
        }
    }

    @Test
    fun `ordinary hour-band change emits no command or interruption`() {
        val result =
            engine.onEvent(
                SessionState.SHADOW,
                SessionEvent.CountdownExpired(TimerId.CANCEL),
                context(
                    hourBand = HourBand.DAWN,
                    armedHourBand = HourBand.NIGHT_DEEP,
                ),
            )

        assertEquals(SessionState.SHADOW, result.state)
        assertTrue(result.commands.isEmpty())
        assertTrue(result.commands.none(::isOutboundEffect))
    }

    private fun boundaryIntents(rules: Rules): List<Command> {
        val localEngine = SessionEngine(clock, rules)
        val localContext = context(rules = rules)
        val family =
            localEngine.onEvent(
                SessionState.CHECKIN_2,
                SessionEvent.CountdownExpired(TimerId.CD2),
                localContext,
            )
        val sos =
            localEngine.onEvent(
                SessionState.FAMILY_ESCALATED,
                SessionEvent.CountdownExpired(TimerId.CANCEL),
                localContext.copy(susEventWritten = true),
            )
        return (family.commands + sos.commands).filter(::isBackendWrite)
    }

    private fun context(
        zone: Zone? = highZone,
        rules: Rules = this.rules,
        armMode: ArmMode = ArmMode.AUTO_ZONE,
        hourBand: HourBand = HourBand.NIGHT_DEEP,
        armedHourBand: HourBand? =
            if (armMode == ArmMode.AUTO_ZONE) HourBand.NIGHT_DEEP else null,
        cooldowns: Map<String, Instant> = emptyMap(),
        susEventWritten: Boolean = false,
    ): EngineContext =
        EngineContext(
            now = clock.instant(),
            zone = zone,
            hourBand = hourBand,
            armedHourBand = armedHourBand,
            rules = rules,
            armMode = armMode,
            armedAt = null,
            deadline = null,
            cooldowns = cooldowns,
            hasFavourite = true,
            susEventWritten = susEventWritten,
        )

    private fun zone(
        id: String,
        riskTier: RiskTier,
        riskScore: Double = 0.5, // GROUNDED-EXEMPT: inert fixture default; ordering tests pass explicit scores
    ): Zone =
        Zone(
            stationId = id,
            stationName = id,
            district = "Visakhapatnam",
            polygon = emptyList(),
            centroid = LatLng(0.0, 0.0),
            riskScore = riskScore,
            riskTier = riskTier,
            colorHex = "",
            opacity = 1.0,
            totalCases = 0,
            womenSafetyCases = 0,
            crimeBreakdown = emptyMap(),
            geofenceRadiusM = 0,
            areasCovered = "synthetic",
            touristSpots = null,
            riskNotes = null,
        )
}

private fun isBackendWrite(command: Command): Boolean =
    command == Command.WriteSusEvent ||
        command is Command.PatchSusOutcome ||
        command is Command.WriteSosIncident ||
        command is Command.PatchSosStatus

private fun isOutboundEffect(command: Command): Boolean =
    isBackendWrite(command) || command == Command.NotifyFamily

private class MutableClock(
    private var current: Instant = Instant.EPOCH,
    private val currentZone: ZoneId = ZoneOffset.UTC,
) : Clock() {
    override fun getZone(): ZoneId = currentZone

    override fun withZone(zone: ZoneId): Clock = MutableClock(current, zone)

    override fun instant(): Instant = current

    fun advance(duration: Duration) {
        current = current.plus(duration)
    }
}
