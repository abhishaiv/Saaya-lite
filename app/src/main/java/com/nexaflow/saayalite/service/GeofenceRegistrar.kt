package com.nexaflow.saayalite.service

import android.Manifest
import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.GeofencingRequest
import com.nexaflow.saayalite.data.repository.ZoneRepository
import com.nexaflow.saayalite.domain.model.RiskTier
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GeofenceRegistrar @Inject constructor(
    @ApplicationContext private val context: Context,
    private val geofencingClient: GeofencingClient,
    private val zoneRepository: ZoneRepository,
    private val operationalState: OperationalStateStore,
) {
    @SuppressLint("MissingPermission")
    fun register() {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val geofences =
            zoneRepository.zones()
                .asSequence()
                .filter { it.riskTier != RiskTier.SAFE }
                .map { zone ->
                    Geofence.Builder()
                        .setRequestId(zone.stationId)
                        .setCircularRegion(
                            zone.centroid.latitude,
                            zone.centroid.longitude,
                            zone.geofenceRadiusM.toFloat(),
                        )
                        .setExpirationDuration(Geofence.NEVER_EXPIRE)
                        .setTransitionTypes(
                            Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT,
                        )
                        .build()
                }
                .toList()

        val request =
            GeofencingRequest.Builder()
                .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                .addGeofences(geofences)
                .build()
        try {
            geofencingClient.addGeofences(request, pendingIntent())
                .addOnFailureListener { operationalState.recordCandidateStartFailure() }
        } catch (_: SecurityException) {
            operationalState.recordCandidateStartFailure()
        }
    }

    private fun pendingIntent(): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            ReqCode.GEOFENCE,
            Intent(context, GeofenceBroadcastReceiver::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
}
