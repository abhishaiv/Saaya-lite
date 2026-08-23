package com.nexaflow.saayalite.service

import com.nexaflow.saayalite.domain.model.LatLng
import com.nexaflow.saayalite.domain.model.Zone
import java.time.Duration

class ExitDwellTracker {
    private var outsideSinceElapsedMs: Long? = null
    private var emitted = false

    fun onFix(
        zone: Zone,
        point: LatLng,
        accuracyM: Double,
        elapsedRealtimeMs: Long,
    ): Boolean {
        if (accuracyM > MAX_QUALIFYING_ACCURACY_M || emitted) return false
        if (PointInPolygon.contains(point, zone.polygon)) {
            outsideSinceElapsedMs = null
            return false
        }

        val outsideSince = outsideSinceElapsedMs
        if (outsideSince == null) {
            outsideSinceElapsedMs = elapsedRealtimeMs
            return false
        }
        if (elapsedRealtimeMs - outsideSince < EXIT_DWELL_MS) return false
        emitted = true
        return true
    }

    fun reset() {
        outsideSinceElapsedMs = null
        emitted = false
    }
}

private const val EXIT_DWELL_SECONDS = 180 // grounded: dwell.exit
private val EXIT_DWELL_MS = Duration.ofSeconds(EXIT_DWELL_SECONDS.toLong()).toMillis()
