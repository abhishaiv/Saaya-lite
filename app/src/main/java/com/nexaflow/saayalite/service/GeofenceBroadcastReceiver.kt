package com.nexaflow.saayalite.service

import android.Manifest
import android.app.ForegroundServiceStartNotAllowedException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import com.nexaflow.saayalite.ForegroundState
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class GeofenceBroadcastReceiver : BroadcastReceiver() {
    @Inject lateinit var foregroundState: ForegroundState
    @Inject lateinit var operationalState: OperationalStateStore

    override fun onReceive(context: Context, intent: Intent) {
        val event = GeofencingEvent.fromIntent(intent) ?: return
        if (event.hasError()) {
            operationalState.recordCandidateStartFailure()
            return
        }
        val zoneIds = event.triggeringGeofences?.map(Geofence::getRequestId).orEmpty()
        if (zoneIds.isEmpty()) return

        val action =
            when (event.geofenceTransition) {
                Geofence.GEOFENCE_TRANSITION_ENTER -> SaayaForegroundService.ACTION_CANDIDATE_ENTER
                Geofence.GEOFENCE_TRANSITION_EXIT -> SaayaForegroundService.ACTION_CANDIDATE_EXIT
                else -> return
            }
        if (action == SaayaForegroundService.ACTION_CANDIDATE_ENTER &&
            !CandidatePolicy.canStartFromGeofence(
                appIsForeground = foregroundState.isForeground,
                backgroundLocationGranted = hasBackgroundLocation(context),
            )
        ) {
            operationalState.recordBackgroundLocationDenied()
            return
        }

        val serviceIntent =
            Intent(context, SaayaForegroundService::class.java)
                .setAction(action)
                .putStringArrayListExtra(
                    SaayaForegroundService.EXTRA_ZONE_IDS,
                    ArrayList(zoneIds),
                )
        try {
            ContextCompat.startForegroundService(context, serviceIntent)
        } catch (_: SecurityException) {
            operationalState.recordCandidateStartFailure()
        } catch (error: RuntimeException) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                error is ForegroundServiceStartNotAllowedException
            ) {
                operationalState.recordCandidateStartFailure()
            } else {
                throw error
            }
        }
    }

    private fun hasBackgroundLocation(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION,
            ) == PackageManager.PERMISSION_GRANTED
}
