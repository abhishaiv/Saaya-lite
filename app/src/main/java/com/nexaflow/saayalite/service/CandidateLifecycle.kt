package com.nexaflow.saayalite.service

sealed interface CandidateEffect {
    data object StartForegroundCandidate : CandidateEffect

    data object StartCandidateSampling : CandidateEffect

    data object StopSampling : CandidateEffect

    data object StopService : CandidateEffect

    data object UpdateNotificationToShadow : CandidateEffect

    data class PersistCandidates(val zoneIds: Set<String>) : CandidateEffect
}

enum class ServiceExecutionMode {
    STOPPED,
    CANDIDATE,
    SHADOW,
}

class CandidateLifecycle {
    private val activeZoneIds = linkedSetOf<String>()
    private var sessionActive = false

    val mode: ServiceExecutionMode
        get() =
            when {
                sessionActive -> ServiceExecutionMode.SHADOW
                activeZoneIds.isNotEmpty() -> ServiceExecutionMode.CANDIDATE
                else -> ServiceExecutionMode.STOPPED
            }

    fun activeCandidates(): Set<String> = activeZoneIds.toSet()

    fun onEnter(zoneIds: Collection<String>): List<CandidateEffect> {
        val wasEmpty = activeZoneIds.isEmpty()
        activeZoneIds += zoneIds
        if (activeZoneIds.isEmpty()) return emptyList()

        return buildList {
            if (wasEmpty) {
                add(CandidateEffect.StartForegroundCandidate)
                add(CandidateEffect.StartCandidateSampling)
            }
            add(CandidateEffect.PersistCandidates(activeZoneIds.toSet()))
        }
    }

    fun onExit(zoneIds: Collection<String>): List<CandidateEffect> {
        activeZoneIds -= zoneIds.toSet()
        return afterRemovalEffects()
    }

    fun onArmRejected(zoneId: String): List<CandidateEffect> {
        activeZoneIds -= zoneId
        return afterRemovalEffects()
    }

    fun onArmAccepted(): List<CandidateEffect> {
        sessionActive = true
        activeZoneIds.clear()
        return listOf(
            CandidateEffect.PersistCandidates(emptySet()),
            CandidateEffect.UpdateNotificationToShadow,
        )
    }

    fun recover(zoneIds: Collection<String>): List<CandidateEffect> {
        sessionActive = false
        activeZoneIds.clear()
        activeZoneIds += zoneIds
        if (activeZoneIds.isEmpty()) return emptyList()
        return listOf(
            CandidateEffect.StartForegroundCandidate,
            CandidateEffect.StartCandidateSampling,
            CandidateEffect.PersistCandidates(activeZoneIds.toSet()),
        )
    }

    private fun afterRemovalEffects(): List<CandidateEffect> =
        buildList {
            add(CandidateEffect.PersistCandidates(activeZoneIds.toSet()))
            if (activeZoneIds.isEmpty() && !sessionActive) {
                add(CandidateEffect.StopSampling)
                add(CandidateEffect.StopService)
            }
        }
}
