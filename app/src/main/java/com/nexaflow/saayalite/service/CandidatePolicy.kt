package com.nexaflow.saayalite.service

enum class CandidateLocationPriority {
    HIGH_ACCURACY,
}

data class CandidateSamplingPolicy(
    val intervalSec: Int,
    val priority: CandidateLocationPriority,
)

data class CandidateNotificationPolicy(
    val notificationId: Int,
    val channelId: String,
    val lowImportance: Boolean,
    val silent: Boolean,
    val ongoing: Boolean,
    val openOnly: Boolean,
)

object CandidatePolicy {
    val sampling =
        CandidateSamplingPolicy(
            intervalSec = CANDIDATE_SAMPLE_INTERVAL_SECONDS,
            priority = CandidateLocationPriority.HIGH_ACCURACY,
        )

    val notification =
        CandidateNotificationPolicy(
            notificationId = NotifId.SHADOW_ONGOING,
            channelId = SHADOW_CHANNEL_ID,
            lowImportance = true,
            silent = true,
            ongoing = true,
            openOnly = true,
        )

    fun canStartFromGeofence(
        appIsForeground: Boolean,
        backgroundLocationGranted: Boolean,
    ): Boolean = appIsForeground || backgroundLocationGranted
}
