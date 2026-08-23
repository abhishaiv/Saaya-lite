package com.nexaflow.saayalite.service

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.nexaflow.saayalite.domain.engine.Command
import com.nexaflow.saayalite.domain.engine.TimerId
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

interface TimerScheduler {
    fun schedule(timer: Command.ScheduleTimer)

    fun cancel(timerId: TimerId)
}

@Singleton
class ExactAlarmScheduler @Inject constructor(
    @ApplicationContext private val context: Context,
    private val alarmManager: AlarmManager,
    private val operationalState: OperationalStateStore,
) : TimerScheduler {
    override fun schedule(timer: Command.ScheduleTimer) {
        val pendingIntent = pendingIntent(timer.id)
        val canScheduleExact =
            Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
        if (canScheduleExact) {
            try {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    timer.deadlineEpochMs,
                    pendingIntent,
                )
                return
            } catch (_: SecurityException) {
                operationalState.recordExactAlarmWarning()
            }
        } else {
            operationalState.recordExactAlarmWarning()
        }
        alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            timer.deadlineEpochMs,
            pendingIntent,
        )
    }

    override fun cancel(timerId: TimerId) {
        alarmManager.cancel(pendingIntent(timerId))
    }

    private fun pendingIntent(timerId: TimerId): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            timerId.requestCode(),
            Intent(context, AlarmReceiver::class.java)
                .setAction(AlarmReceiver.ACTION_TIMER)
                .putExtra(AlarmReceiver.EXTRA_TIMER_ID, timerId.name),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
}

object ExactAlarmIntents {
    fun requestPermission(packageName: String): Intent =
        Intent(
            Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
            Uri.parse("package:$packageName"),
        )
}
