package com.nexaflow.saayalite.service

import com.nexaflow.saayalite.domain.engine.ArmMode
import com.nexaflow.saayalite.domain.engine.EngineContext
import com.nexaflow.saayalite.domain.engine.HourBand
import com.nexaflow.saayalite.domain.engine.Rules
import com.nexaflow.saayalite.domain.engine.SessionEngine
import com.nexaflow.saayalite.domain.engine.SessionEvent
import com.nexaflow.saayalite.domain.engine.SessionState
import com.nexaflow.saayalite.domain.model.LatLng
import com.nexaflow.saayalite.domain.model.RiskTier
import com.nexaflow.saayalite.domain.model.Zone
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CandidateModeTest {
    private val zone = zone("candidate-high", RiskTier.HIGH)

    @Test
    fun `geofence enter starts private candidate mode without shadow`() {
        val lifecycle = CandidateLifecycle()

        val effects = lifecycle.onEnter(listOf(zone.stationId))

        assertEquals(ServiceExecutionMode.CANDIDATE, lifecycle.mode)
        assertTrue(effects.contains(CandidateEffect.StartForegroundCandidate))
        assertTrue(effects.contains(CandidateEffect.StartCandidateSampling))
        assertFalse(effects.contains(CandidateEffect.UpdateNotificationToShadow))
    }

    @Test
    fun `candidate sampling is fifteen seconds high accuracy`() {
        assertEquals(CANDIDATE_SAMPLE_INTERVAL_SECONDS, CandidatePolicy.sampling.intervalSec)
        assertEquals(CandidateLocationPriority.HIGH_ACCURACY, CandidatePolicy.sampling.priority)
    }

    @Test
    fun `five valid inside fixes spanning sixty seconds emit exactly one zone entered`() {
        val tracker = tracker()
        tracker.add(listOf(zone.stationId))

        val events =
            (0 until MIN_QUALIFYING_FIXES).flatMap { index ->
                tracker.onFix(insideFix(index))
            }
        val oneMore = tracker.onFix(insideFix(MIN_QUALIFYING_FIXES))

        assertEquals(listOf(zone.stationId), events)
        assertTrue(oneMore.isEmpty())
    }

    @Test
    fun `qualifying outside fix resets accumulated dwell`() {
        val tracker = tracker()
        tracker.add(listOf(zone.stationId))
        tracker.onFix(insideFix(FIRST_INDEX))
        tracker.onFix(insideFix(SECOND_INDEX))

        tracker.onFix(outsideFix(THIRD_INDEX))

        assertNull(tracker.evidence(zone.stationId))
        val events =
            (0 until MIN_QUALIFYING_FIXES).flatMap { offset ->
                tracker.onFix(insideFix(THIRD_INDEX + offset))
            }
        assertEquals(listOf(zone.stationId), events)
    }

    @Test
    fun `fix worse than one hundred metres cannot count toward dwell`() {
        val tracker = tracker()
        tracker.add(listOf(zone.stationId))

        val ignored =
            tracker.onFix(
                insideFix(FIRST_INDEX).copy(
                    accuracyM = Math.nextUp(MAX_QUALIFYING_ACCURACY_M),
                ),
            )

        assertTrue(ignored.isEmpty())
        assertNull(tracker.evidence(zone.stationId))
    }

    @Test
    fun `candidate effects are operational only with no backend or family case`() {
        val lifecycle = CandidateLifecycle()
        val effects = lifecycle.onEnter(listOf(zone.stationId))

        assertTrue(effects.all(::isCandidateOnlyEffect))
        assertEquals(
            setOf(zone.stationId),
            effects.filterIsInstance<CandidateEffect.PersistCandidates>().single().zoneIds,
        )
    }

    @Test
    fun `n-a and cooldown outcomes return to quiet idle`() {
        val now = Instant.EPOCH
        val clock = Clock.fixed(now, ZoneOffset.UTC)
        val rules = Rules.DEFAULT
        val engine = SessionEngine(clock, rules)
        val moderate = zone("candidate-moderate", RiskTier.MODERATE)
        val dawnResult =
            engine.onEvent(
                SessionState.IDLE,
                SessionEvent.ZoneEntered(moderate.stationId),
                context(now, moderate, HourBand.DAWN, rules),
            )
        val coolingResult =
            engine.onEvent(
                SessionState.IDLE,
                SessionEvent.ZoneEntered(zone.stationId),
                context(
                    now,
                    zone,
                    HourBand.NIGHT_DEEP,
                    rules,
                    cooldowns =
                        mapOf(
                            zone.stationId to
                                now.plus(
                                    Duration.ofMinutes(
                                        Rules.MANUAL_DISARM_COOLDOWN_MINUTES.toLong(),
                                    ),
                                ),
                        ),
                ),
            )

        listOf(dawnResult, coolingResult).forEach { result ->
            assertEquals(SessionState.IDLE, result.state)
            assertTrue(result.commands.isEmpty())
            val lifecycle = CandidateLifecycle()
            lifecycle.onEnter(listOf(zone.stationId))
            val effects = lifecycle.onArmRejected(zone.stationId)
            assertEquals(ServiceExecutionMode.STOPPED, lifecycle.mode)
            assertTrue(effects.all(::isCandidateOnlyEffect))
            assertFalse(effects.contains(CandidateEffect.UpdateNotificationToShadow))
        }
    }

    @Test
    fun `candidate to shadow updates the existing notification without restart`() {
        val lifecycle = CandidateLifecycle()
        lifecycle.onEnter(listOf(zone.stationId))

        val effects = lifecycle.onArmAccepted()

        assertEquals(ServiceExecutionMode.SHADOW, lifecycle.mode)
        assertTrue(effects.contains(CandidateEffect.UpdateNotificationToShadow))
        assertFalse(effects.contains(CandidateEffect.StartForegroundCandidate))
        assertEquals(NotifId.SHADOW_ONGOING, CandidatePolicy.notification.notificationId)
    }

    @Test
    fun `circular exit cannot stop an accepted active session`() {
        val lifecycle = CandidateLifecycle()
        lifecycle.onEnter(listOf(zone.stationId))
        lifecycle.onArmAccepted()

        val effects = lifecycle.onExit(listOf(zone.stationId))

        assertEquals(ServiceExecutionMode.SHADOW, lifecycle.mode)
        assertFalse(effects.contains(CandidateEffect.StopSampling))
        assertFalse(effects.contains(CandidateEffect.StopService))
    }

    @Test
    fun `geofence exit stops the final candidate`() {
        val lifecycle = CandidateLifecycle()
        lifecycle.onEnter(listOf(zone.stationId))

        val effects = lifecycle.onExit(listOf(zone.stationId))

        assertEquals(ServiceExecutionMode.STOPPED, lifecycle.mode)
        assertTrue(effects.contains(CandidateEffect.StopSampling))
        assertTrue(effects.contains(CandidateEffect.StopService))
        assertEquals(
            emptySet<String>(),
            effects.filterIsInstance<CandidateEffect.PersistCandidates>().single().zoneIds,
        )
    }

    @Test
    fun `process recovery preserves candidate id but resets every dwell observation`() {
        val tracker = tracker()
        tracker.add(listOf(zone.stationId))
        repeat(MIN_QUALIFYING_FIXES - ONE_FIX) { index -> tracker.onFix(insideFix(index)) }
        assertTrue(tracker.evidence(zone.stationId) != null)

        tracker.resetForProcessRecovery(listOf(zone.stationId))

        assertNull(tracker.evidence(zone.stationId))
        assertTrue(tracker.onFix(insideFix(MIN_QUALIFYING_FIXES)).isEmpty())
        val lifecycle = CandidateLifecycle()
        val effects = lifecycle.recover(listOf(zone.stationId))
        assertEquals(ServiceExecutionMode.CANDIDATE, lifecycle.mode)
        assertTrue(effects.contains(CandidateEffect.StartCandidateSampling))
    }

    @Test
    fun `background denial blocks only background candidate start`() {
        assertFalse(
            CandidatePolicy.canStartFromGeofence(
                appIsForeground = false,
                backgroundLocationGranted = false,
            ),
        )
        assertTrue(
            CandidatePolicy.canStartFromGeofence(
                appIsForeground = true,
                backgroundLocationGranted = false,
            ),
        )
        assertTrue(
            CandidatePolicy.canStartFromGeofence(
                appIsForeground = false,
                backgroundLocationGranted = true,
            ),
        )
    }

    @Test
    fun `point exactly on polygon edge counts as inside`() {
        assertTrue(PointInPolygon.contains(LatLng(EDGE_MIN, EDGE_MID), zone.polygon))
    }

    private fun tracker(): CandidateDwellTracker =
        CandidateDwellTracker(mapOf(zone.stationId to zone))

    private fun insideFix(index: Int): CandidateFix =
        CandidateFix(
            point = LatLng(EDGE_MID, EDGE_MID),
            accuracyM = MAX_QUALIFYING_ACCURACY_M,
            elapsedRealtimeMs =
                Duration.ofSeconds(
                    CANDIDATE_SAMPLE_INTERVAL_SECONDS.toLong() * index,
                ).toMillis(),
        )

    private fun outsideFix(index: Int): CandidateFix =
        insideFix(index).copy(point = LatLng(Math.nextUp(EDGE_MAX), Math.nextUp(EDGE_MAX)))
}

private fun context(
    now: Instant,
    zone: Zone,
    hourBand: HourBand,
    rules: Rules,
    cooldowns: Map<String, Instant> = emptyMap(),
): EngineContext =
    EngineContext(
        now = now,
        zone = zone,
        hourBand = hourBand,
        armedHourBand = null,
        rules = rules,
        armMode = ArmMode.AUTO_ZONE,
        armedAt = null,
        deadline = null,
        cooldowns = cooldowns,
        hasFavourite = false,
        susEventWritten = false,
    )

private fun zone(id: String, riskTier: RiskTier): Zone =
    Zone(
        stationId = id,
        stationName = id,
        district = "synthetic",
        polygon =
            listOf(
                LatLng(EDGE_MIN, EDGE_MIN),
                LatLng(EDGE_MIN, EDGE_MAX),
                LatLng(EDGE_MAX, EDGE_MAX),
                LatLng(EDGE_MAX, EDGE_MIN),
                LatLng(EDGE_MIN, EDGE_MIN),
            ),
        centroid = LatLng(EDGE_MID, EDGE_MID),
        riskScore = Double.MIN_VALUE,
        riskTier = riskTier,
        colorHex = "",
        opacity = Double.MIN_VALUE,
        totalCases = 0,
        womenSafetyCases = 0,
        crimeBreakdown = emptyMap(),
        geofenceRadiusM = 0,
        areasCovered = "synthetic",
        touristSpots = null,
        riskNotes = null,
    )

private fun isCandidateOnlyEffect(effect: CandidateEffect): Boolean =
    when (effect) {
        CandidateEffect.StartForegroundCandidate,
        CandidateEffect.StartCandidateSampling,
        CandidateEffect.StopSampling,
        CandidateEffect.StopService,
        CandidateEffect.UpdateNotificationToShadow,
        is CandidateEffect.PersistCandidates,
        -> true
    }

private const val FIRST_INDEX = 0 // GROUNDED-EXEMPT: test-sequence index
private const val SECOND_INDEX = 1 // GROUNDED-EXEMPT: test-sequence index
private const val THIRD_INDEX = 2 // GROUNDED-EXEMPT: test-sequence index
private const val ONE_FIX = 1 // GROUNDED-EXEMPT: one observation below the threshold
private const val EDGE_MIN = 0.0 // GROUNDED-EXEMPT: synthetic unit-square coordinate
private const val EDGE_MID = 0.5 // GROUNDED-EXEMPT: synthetic unit-square coordinate
private const val EDGE_MAX = 1.0 // GROUNDED-EXEMPT: synthetic unit-square coordinate
