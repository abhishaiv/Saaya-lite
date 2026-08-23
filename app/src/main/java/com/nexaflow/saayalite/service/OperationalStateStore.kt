package com.nexaflow.saayalite.service

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OperationalStateStore @Inject constructor(
    @ApplicationContext context: Context,
) : BatteryOptimizationPromptStore {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun candidateIds(): Set<String> =
        preferences.getStringSet(KEY_CANDIDATE_IDS, emptySet()).orEmpty().toSet()

    fun setCandidateIds(ids: Set<String>) {
        preferences.edit().putStringSet(KEY_CANDIDATE_IDS, ids.toSet()).apply()
    }

    fun recordCandidateStartFailure() {
        preferences.edit().putBoolean(KEY_CANDIDATE_START_FAILED, true).apply()
    }

    fun recordBackgroundLocationDenied() {
        preferences.edit().putBoolean(KEY_BACKGROUND_LOCATION_DENIED, true).apply()
    }

    fun recordPermissionWarning(permission: String) {
        preferences.edit().putString(KEY_PERMISSION_WARNING, permission).apply()
    }

    fun permissionWarning(): String? = preferences.getString(KEY_PERMISSION_WARNING, null)

    fun hasCandidateStartFailure(): Boolean =
        preferences.getBoolean(KEY_CANDIDATE_START_FAILED, false)

    fun recordExactAlarmWarning() {
        preferences.edit().putBoolean(KEY_EXACT_ALARM_WARNING, true).apply()
    }

    fun hasExactAlarmWarning(): Boolean =
        preferences.getBoolean(KEY_EXACT_ALARM_WARNING, false)

    fun heartbeat(epochMs: Long) {
        preferences.edit().putLong(KEY_HEARTBEAT, epochMs).apply()
    }

    fun lastHeartbeatEpochMs(): Long? =
        preferences.getLong(KEY_HEARTBEAT, HEARTBEAT_ABSENT).takeUnless { it == HEARTBEAT_ABSENT }

    fun setShadowLabel(label: String?) {
        preferences.edit().putString(KEY_SHADOW_LABEL, label).apply()
    }

    fun shadowLabel(): String? = preferences.getString(KEY_SHADOW_LABEL, null)

    fun setSessionNotificationActive(active: Boolean) {
        preferences.edit().putBoolean(KEY_SESSION_NOTIFICATION_ACTIVE, active).apply()
    }

    fun isSessionNotificationActive(): Boolean =
        preferences.getBoolean(KEY_SESSION_NOTIFICATION_ACTIVE, false)

    override fun explanationShown(): Boolean =
        preferences.getBoolean(KEY_BATTERY_EXPLANATION_SHOWN, false)

    override fun markExplanationShown() {
        preferences.edit().putBoolean(KEY_BATTERY_EXPLANATION_SHOWN, true).apply()
    }
}

private const val PREFERENCES_NAME = "saaya_service_operation"
private const val KEY_CANDIDATE_IDS = "candidate_ids"
private const val KEY_CANDIDATE_START_FAILED = "candidate_start_failed"
private const val KEY_BACKGROUND_LOCATION_DENIED = "background_location_denied"
private const val KEY_PERMISSION_WARNING = "permission_warning"
private const val KEY_EXACT_ALARM_WARNING = "exact_alarm_warning"
private const val KEY_HEARTBEAT = "heartbeat_epoch_ms"
private const val KEY_SHADOW_LABEL = "shadow_label"
private const val KEY_SESSION_NOTIFICATION_ACTIVE = "session_notification_active"
private const val KEY_BATTERY_EXPLANATION_SHOWN = "battery_explanation_shown"
private const val HEARTBEAT_ABSENT = -1L // GROUNDED-EXEMPT: absent SharedPreferences sentinel
