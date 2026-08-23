package com.nexaflow.saayalite.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.annotation.StringRes
import androidx.core.app.NotificationCompat
import com.nexaflow.saayalite.MainActivity
import com.nexaflow.saayalite.R
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ShadowNotificationFactory @Inject constructor(
    @ApplicationContext private val context: Context,
    private val notificationManager: NotificationManager,
) {
    private fun ensureChannel(@StringRes nameRes: Int) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel =
            NotificationChannel(
                CandidatePolicy.notification.channelId,
                context.getString(nameRes),
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                setSound(null, null)
                enableVibration(false)
                setShowBadge(false)
            }
        notificationManager.createNotificationChannel(channel)
    }

    fun candidate(): Notification {
        ensureChannel(R.string.notif_candidate_title)
        return base()
            .setContentTitle(context.getString(R.string.notif_candidate_title))
            .setContentText(context.getString(R.string.notif_candidate_text))
            .build()
    }

    fun shadow(zoneLabel: String?): Notification {
        ensureChannel(R.string.notif_channel_shadow)
        val builder = base()
        return if (zoneLabel == null) {
            builder
                .setContentTitle(context.getString(R.string.status_shadow_manual))
                .setContentText(context.getString(R.string.app_name))
                .build()
        } else {
            builder
                .setContentTitle(context.getString(R.string.notif_channel_shadow))
                .setContentText(context.getString(R.string.notif_shadow_text, zoneLabel))
                .build()
        }
    }

    fun updateShadow(zoneLabel: String?) {
        notificationManager.notify(CandidatePolicy.notification.notificationId, shadow(zoneLabel))
    }

    private fun base(): NotificationCompat.Builder =
        NotificationCompat.Builder(context, CandidatePolicy.notification.channelId)
            .setSmallIcon(R.drawable.ic_launcher_monochrome)
            .setContentIntent(openAppIntent())
            .setOngoing(CandidatePolicy.notification.ongoing)
            .setSilent(CandidatePolicy.notification.silent)
            .setOnlyAlertOnce(true)
            .setAutoCancel(false)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)

    private fun openAppIntent(): PendingIntent =
        PendingIntent.getActivity(
            context,
            ReqCode.OPEN_APP,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
}
