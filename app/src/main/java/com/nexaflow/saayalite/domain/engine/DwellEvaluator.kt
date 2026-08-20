package com.nexaflow.saayalite.domain.engine

import com.nexaflow.saayalite.domain.model.Zone
import java.time.Clock
import java.time.Duration
import java.time.Instant

data class DwellState(
    val candidateZoneId: String? = null,
    val insideSince: Instant? = null,
    val activeZoneId: String? = null,
    val outsideSince: Instant? = null,
)

data class DwellEvaluation(
    val state: DwellState,
    val event: SessionEvent? = null,
)

class DwellEvaluator(
    private val clock: Clock,
    private val rules: Rules,
) {
    fun evaluate(
        state: DwellState,
        insideZones: List<Zone>,
    ): DwellEvaluation {
        val now = clock.instant()
        val activeZoneId = state.activeZoneId
        return if (activeZoneId == null) {
            evaluateEntry(state, selectHighestRiskZone(insideZones), now)
        } else {
            evaluateExit(state, activeZoneId, insideZones, now)
        }
    }

    private fun evaluateEntry(
        state: DwellState,
        selectedZone: Zone?,
        now: Instant,
    ): DwellEvaluation {
        if (selectedZone == null) return DwellEvaluation(DwellState())

        if (state.candidateZoneId != selectedZone.stationId || state.insideSince == null) {
            return DwellEvaluation(
                state =
                    DwellState(
                        candidateZoneId = selectedZone.stationId,
                        insideSince = now,
                    ),
            )
        }

        val dwellReached =
            Duration.between(state.insideSince, now) >=
                Duration.ofSeconds(rules.enterDwellSeconds().toLong())
        if (!dwellReached) return DwellEvaluation(state)

        return DwellEvaluation(
            state = DwellState(activeZoneId = selectedZone.stationId),
            event = SessionEvent.ZoneEntered(selectedZone.stationId),
        )
    }

    private fun evaluateExit(
        state: DwellState,
        activeZoneId: String,
        insideZones: List<Zone>,
        now: Instant,
    ): DwellEvaluation {
        if (insideZones.any { it.stationId == activeZoneId }) {
            return DwellEvaluation(state.copy(outsideSince = null))
        }

        val outsideSince = state.outsideSince
        if (outsideSince == null) {
            return DwellEvaluation(state.copy(outsideSince = now))
        }

        val dwellReached =
            Duration.between(outsideSince, now) >=
                Duration.ofSeconds(rules.exitDwellSeconds().toLong())
        if (!dwellReached) return DwellEvaluation(state)

        return DwellEvaluation(
            state = DwellState(),
            event = SessionEvent.ZoneExited(activeZoneId),
        )
    }
}

fun selectHighestRiskZone(zones: List<Zone>): Zone? =
    zones.minWithOrNull(
        compareBy<Zone> { it.riskTier.ordinal }
            .thenByDescending { it.riskScore },
    )
