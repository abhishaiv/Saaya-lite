package com.nexaflow.saayalite.service

import android.Manifest
import android.annotation.SuppressLint
import android.app.ForegroundServiceStartNotAllowedException
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.Priority
import com.nexaflow.saayalite.data.repository.ZoneRepository
import com.nexaflow.saayalite.di.IoDispatcher
import com.nexaflow.saayalite.domain.engine.Command
import com.nexaflow.saayalite.domain.engine.SessionEvent
import com.nexaflow.saayalite.domain.engine.SessionState
import com.nexaflow.saayalite.domain.engine.TimerId
import com.nexaflow.saayalite.domain.engine.selectHighestRiskZone
import com.nexaflow.saayalite.domain.model.LatLng
import dagger.hilt.android.AndroidEntryPoint
import java.time.Clock
import java.time.Duration
import javax.inject.Inject
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

@AndroidEntryPoint
class SaayaForegroundService : Service() {
    @Inject lateinit var fusedLocationClient: FusedLocationProviderClient
    @Inject lateinit var notificationFactory: ShadowNotificationFactory
    @Inject lateinit var sessionRuntime: SessionRuntime
    @Inject lateinit var zoneRepository: ZoneRepository
    @Inject lateinit var operationalState: OperationalStateStore
    @Inject lateinit var wallClock: Clock
    @Inject @IoDispatcher lateinit var ioDispatcher: CoroutineDispatcher

    private lateinit var serviceScope: CoroutineScope
    private var candidateLifecycle = CandidateLifecycle()
    private var candidateTracker: CandidateDwellTracker? = null
    private val exitTracker = ExitDwellTracker()
    private var samplingIntervalSec: Int? = null
    private var foregroundStarted = false
    private val eventMutex = Mutex()

    private val locationCallback =
        object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                serviceScope.launch {
                    eventMutex.withLock {
                        result.locations
                            .sortedBy(Location::getElapsedRealtimeNanos)
                            .forEach { location -> handleLocation(location) }
                    }
                }
            }
        }

    override fun onCreate() {
        super.onCreate()
        serviceScope = CoroutineScope(SupervisorJob() + ioDispatcher)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        operationalState.heartbeat(wallClock.millis())
        val preferCandidate =
            intent?.action != ACTION_TIMER && !operationalState.isSessionNotificationActive()
        if (!ensureForeground(preferCandidate)) return START_NOT_STICKY
        when (intent?.action) {
            ACTION_CANDIDATE_ENTER -> {
                val zoneIds = intent.getStringArrayListExtra(EXTRA_ZONE_IDS).orEmpty()
                serviceScope.launch { eventMutex.withLock { handleCandidateEnter(zoneIds) } }
            }
            ACTION_CANDIDATE_EXIT -> {
                val zoneIds = intent.getStringArrayListExtra(EXTRA_ZONE_IDS).orEmpty()
                serviceScope.launch { eventMutex.withLock { handleCandidateExit(zoneIds) } }
            }
            ACTION_TIMER -> {
                val timerName = intent.getStringExtra(EXTRA_TIMER_ID)
                serviceScope.launch { eventMutex.withLock { handleTimer(timerName) } }
            }
            else -> {
                serviceScope.launch { eventMutex.withLock { recoverAfterRestart() } }
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        fusedLocationClient.removeLocationUpdates(locationCallback)
        serviceScope.cancel()
        super.onDestroy()
    }

    private suspend fun handleCandidateEnter(zoneIds: Collection<String>) {
        if (sessionRuntime.activeSession() != null) return
        ensureCandidateTracker().add(zoneIds)
        applyCandidateEffects(candidateLifecycle.onEnter(zoneIds))
    }

    private suspend fun handleCandidateExit(zoneIds: Collection<String>) {
        if (sessionRuntime.activeSession() != null) return
        ensureCandidateTracker().remove(zoneIds)
        applyCandidateEffects(candidateLifecycle.onExit(zoneIds))
    }

    private suspend fun handleTimer(timerName: String?) {
        val timerId = timerName?.let { runCatching { TimerId.valueOf(it) }.getOrNull() } ?: return
        val event =
            when (timerId) {
                TimerId.CHECKIN -> SessionEvent.CheckInTimerFired
                TimerId.CD1, TimerId.CD2, TimerId.CANCEL -> SessionEvent.CountdownExpired(timerId)
            }
        applyExecution(sessionRuntime.handle(event))
    }

    private suspend fun recoverAfterRestart() {
        val activeSession = sessionRuntime.activeSession()
        if (activeSession != null) {
            operationalState.setCandidateIds(emptySet())
            candidateLifecycle = CandidateLifecycle()
            applyExecution(sessionRuntime.recover() ?: return)
            return
        }

        val candidateIds = operationalState.candidateIds()
        if (candidateIds.isEmpty()) {
            stopServiceCleanly()
            return
        }
        ensureCandidateTracker().resetForProcessRecovery(candidateIds)
        applyCandidateEffects(candidateLifecycle.recover(candidateIds))
    }

    private suspend fun handleLocation(location: Location) {
        if (!location.hasAccuracy()) return
        operationalState.heartbeat(wallClock.millis())
        val fix =
            CandidateFix(
                point = LatLng(location.latitude, location.longitude),
                accuracyM = location.accuracy.toDouble(),
                elapsedRealtimeMs = Duration.ofNanos(location.elapsedRealtimeNanos).toMillis(),
            )
        val candidates = candidateLifecycle.activeCandidates()
        if (candidates.isNotEmpty()) {
            handleCandidateFix(fix)
            return
        }
        handleActiveSessionFix(fix)
    }

    private suspend fun handleCandidateFix(fix: CandidateFix) {
        val completedIds = ensureCandidateTracker().onFix(fix).toMutableSet()
        while (completedIds.isNotEmpty()) {
            val selected =
                selectHighestRiskZone(
                    completedIds.mapNotNull(zoneRepository::zone),
                ) ?: return
            completedIds -= selected.stationId
            val execution =
                sessionRuntime.handle(
                    SessionEvent.ZoneEntered(selected.stationId),
                    eventZoneId = selected.stationId,
                )
            if (execution.result.state == SessionState.SHADOW) {
                ensureCandidateTracker().remove(ensureCandidateTracker().activeCandidates())
                applyCandidateEffects(candidateLifecycle.onArmAccepted())
                applyExecution(execution)
                return
            }
            ensureCandidateTracker().remove(listOf(selected.stationId))
            applyCandidateEffects(candidateLifecycle.onArmRejected(selected.stationId))
        }
    }

    private suspend fun handleActiveSessionFix(fix: CandidateFix) {
        val session = sessionRuntime.activeSession() ?: return
        if (session.state != SessionState.SHADOW || session.zoneId == null) return
        val zone = zoneRepository.zone(session.zoneId) ?: return
        if (
            exitTracker.onFix(
                zone = zone,
                point = fix.point,
                accuracyM = fix.accuracyM,
                elapsedRealtimeMs = fix.elapsedRealtimeMs,
            )
        ) {
            applyExecution(
                sessionRuntime.handle(
                    SessionEvent.ZoneExited(zone.stationId),
                    eventZoneId = zone.stationId,
                ),
            )
        }
    }

    private suspend fun applyExecution(execution: SessionExecution) {
        execution.result.commands.forEach { command ->
            when (command) {
                is Command.SetLocationSampling -> requestHighAccuracySampling(command.intervalSec)
                Command.StartForegroundService -> {
                    if (!ensureForeground(preferCandidate = false)) return
                    notificationFactory.updateShadow(execution.zone?.stationName)
                }
                is Command.ShowPermissionWarning ->
                    operationalState.recordPermissionWarning(command.permission)
                Command.StopForegroundService -> stopServiceCleanly()
                else -> Unit
            }
        }
        if (execution.result.state == SessionState.IDLE ||
            execution.result.state == SessionState.RESOLVED
        ) {
            stopServiceCleanly()
        }
    }

    private suspend fun applyCandidateEffects(effects: List<CandidateEffect>) {
        for (effect in effects) {
            when (effect) {
                CandidateEffect.StartForegroundCandidate ->
                    if (!ensureForeground(preferCandidate = true)) return
                CandidateEffect.StartCandidateSampling ->
                    requestHighAccuracySampling(CandidatePolicy.sampling.intervalSec)
                CandidateEffect.StopSampling -> stopSampling()
                CandidateEffect.StopService -> stopServiceCleanly()
                CandidateEffect.UpdateNotificationToShadow ->
                    notificationFactory.updateShadow(operationalState.shadowLabel())
                is CandidateEffect.PersistCandidates -> operationalState.setCandidateIds(effect.zoneIds)
            }
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun requestHighAccuracySampling(intervalSec: Int) {
        if (!hasFineLocation()) {
            samplingFailure()
            return
        }
        if (samplingIntervalSec == intervalSec) return
        val intervalMs = Duration.ofSeconds(intervalSec.toLong()).toMillis()
        val request =
            LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMs)
                .setMinUpdateIntervalMillis(intervalMs)
                .build()
        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
            samplingIntervalSec = intervalSec
        } catch (_: SecurityException) {
            samplingFailure()
        }
    }

    private fun stopSampling() {
        fusedLocationClient.removeLocationUpdates(locationCallback)
        samplingIntervalSec = null
    }

    private fun candidateFailure() {
        operationalState.recordCandidateStartFailure()
        ensureCandidateTracker().remove(ensureCandidateTracker().activeCandidates())
        operationalState.setCandidateIds(emptySet())
        stopServiceCleanly()
    }

    private suspend fun samplingFailure() {
        if (!operationalState.isSessionNotificationActive()) {
            candidateFailure()
            return
        }
        applyExecution(
            sessionRuntime.handle(
                SessionEvent.PermissionRevoked(Manifest.permission.ACCESS_FINE_LOCATION),
            ),
        )
    }

    private fun ensureCandidateTracker(): CandidateDwellTracker {
        val existing = candidateTracker
        if (existing != null) return existing
        return CandidateDwellTracker(zoneRepository.zones().associateBy { it.stationId })
            .also { candidateTracker = it }
    }

    private fun ensureForeground(preferCandidate: Boolean): Boolean {
        val notification =
            if (preferCandidate) {
                notificationFactory.candidate()
            } else {
                notificationFactory.shadow(operationalState.shadowLabel())
            }
        return try {
            startForeground(CandidatePolicy.notification.notificationId, notification)
            foregroundStarted = true
            true
        } catch (_: SecurityException) {
            foregroundStartFailure()
            false
        } catch (error: RuntimeException) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                error is ForegroundServiceStartNotAllowedException
            ) {
                foregroundStartFailure()
                false
            } else {
                throw error
            }
        }
    }

    private fun stopServiceCleanly() {
        stopSampling()
        operationalState.setCandidateIds(emptySet())
        operationalState.setShadowLabel(null)
        operationalState.setSessionNotificationActive(false)
        exitTracker.reset()
        if (foregroundStarted) stopForeground(STOP_FOREGROUND_REMOVE)
        foregroundStarted = false
        stopSelf()
    }

    private fun foregroundStartFailure() {
        operationalState.recordCandidateStartFailure()
        operationalState.setCandidateIds(emptySet())
        stopSelf()
    }

    private fun hasFineLocation(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    companion object {
        const val ACTION_CANDIDATE_ENTER = "com.nexaflow.saayalite.action.CANDIDATE_ENTER"
        const val ACTION_CANDIDATE_EXIT = "com.nexaflow.saayalite.action.CANDIDATE_EXIT"
        const val ACTION_TIMER = "com.nexaflow.saayalite.action.TIMER"
        const val EXTRA_ZONE_IDS = "zone_ids"
        const val EXTRA_TIMER_ID = "timer_id"
    }
}
