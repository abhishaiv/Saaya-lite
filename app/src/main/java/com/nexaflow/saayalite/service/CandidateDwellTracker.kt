package com.nexaflow.saayalite.service

import com.nexaflow.saayalite.domain.model.LatLng
import com.nexaflow.saayalite.domain.model.Zone
import java.time.Duration

data class CandidateFix(
    val point: LatLng,
    val accuracyM: Double,
    val elapsedRealtimeMs: Long,
)

data class CandidateEvidence(
    val firstFixElapsedMs: Long,
    val lastFixElapsedMs: Long,
    val qualifyingFixCount: Int,
)

class CandidateDwellTracker(
    private val zonesById: Map<String, Zone>,
) {
    private val activeZoneIds = linkedSetOf<String>()
    private val evidenceByZone = mutableMapOf<String, CandidateEvidence>()
    private val emittedZoneIds = mutableSetOf<String>()

    fun add(zoneIds: Collection<String>) {
        activeZoneIds += zoneIds.filter(zonesById::containsKey)
    }

    fun remove(zoneIds: Collection<String>) {
        zoneIds.forEach { zoneId ->
            activeZoneIds -= zoneId
            evidenceByZone -= zoneId
            emittedZoneIds -= zoneId
        }
    }

    fun resetForProcessRecovery(zoneIds: Collection<String>) {
        activeZoneIds.clear()
        evidenceByZone.clear()
        emittedZoneIds.clear()
        add(zoneIds)
    }

    fun activeCandidates(): Set<String> = activeZoneIds.toSet()

    fun evidence(zoneId: String): CandidateEvidence? = evidenceByZone[zoneId]

    fun onFix(fix: CandidateFix): List<String> {
        if (!fix.accuracyM.isFinite() || fix.accuracyM > MAX_QUALIFYING_ACCURACY_M) {
            return emptyList()
        }

        val completed = mutableListOf<String>()
        activeZoneIds.sorted().forEach { zoneId ->
            if (zoneId in emittedZoneIds) return@forEach
            val zone = zonesById.getValue(zoneId)
            if (!PointInPolygon.contains(fix.point, zone.polygon)) {
                evidenceByZone -= zoneId
                return@forEach
            }

            val previous = evidenceByZone[zoneId]
            val next =
                when {
                    previous == null ->
                        CandidateEvidence(
                            firstFixElapsedMs = fix.elapsedRealtimeMs,
                            lastFixElapsedMs = fix.elapsedRealtimeMs,
                            qualifyingFixCount = FIRST_FIX_COUNT,
                        )
                    fix.elapsedRealtimeMs <= previous.lastFixElapsedMs -> previous
                    else ->
                        previous.copy(
                            lastFixElapsedMs = fix.elapsedRealtimeMs,
                            qualifyingFixCount = previous.qualifyingFixCount + FIX_COUNT_INCREMENT,
                        )
                }
            evidenceByZone[zoneId] = next

            val span = next.lastFixElapsedMs - next.firstFixElapsedMs
            if (next.qualifyingFixCount >= MIN_QUALIFYING_FIXES && span >= MIN_DWELL_SPAN_MS) {
                emittedZoneIds += zoneId
                completed += zoneId
            }
        }
        return completed
    }
}

const val CANDIDATE_SAMPLE_INTERVAL_SECONDS = 15 // grounded: candidate.sample.interval
const val MAX_QUALIFYING_ACCURACY_M = 100.0 // grounded: candidate.fix.accuracy.max
const val MIN_QUALIFYING_FIXES = 5 // grounded: candidate.dwell.min_fixes
const val MIN_DWELL_SPAN_SECONDS = 60 // grounded: candidate.dwell.min_span
val MIN_DWELL_SPAN_MS: Long = Duration.ofSeconds(MIN_DWELL_SPAN_SECONDS.toLong()).toMillis()
private const val FIRST_FIX_COUNT = 1 // GROUNDED-EXEMPT: first observed fix count
private const val FIX_COUNT_INCREMENT = 1 // GROUNDED-EXEMPT: per-fix counter increment
