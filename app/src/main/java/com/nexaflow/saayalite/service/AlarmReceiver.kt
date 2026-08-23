package com.nexaflow.saayalite.service

import android.app.ForegroundServiceStartNotAllowedException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.content.ContextCompat
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class AlarmReceiver : BroadcastReceiver() {
    @Inject lateinit var operationalState: OperationalStateStore

    override fun onReceive(context: Context, intent: Intent) {
        val timerId = intent.getStringExtra(EXTRA_TIMER_ID) ?: return
        val serviceIntent =
            Intent(context, SaayaForegroundService::class.java)
                .setAction(SaayaForegroundService.ACTION_TIMER)
                .putExtra(SaayaForegroundService.EXTRA_TIMER_ID, timerId)
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

    companion object {
        const val ACTION_TIMER = "com.nexaflow.saayalite.alarm.TIMER"
        const val EXTRA_TIMER_ID = "timer_id"
    }
}
