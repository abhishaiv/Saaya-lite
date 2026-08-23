package com.nexaflow.saayalite.service

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

enum class BatteryOptimizationStatus {
    EXEMPT,
    NEEDS_EXPLANATION,
    DEGRADED_WARNING,
}

data class BatteryOptimizationState(
    val status: BatteryOptimizationStatus,
    val blocksApp: Boolean = false,
)

enum class BatteryOptimizationRequestResult {
    ALREADY_EXEMPT,
    EXPLANATION_REQUIRED,
    DIRECT_LAUNCHED,
    FALLBACK_LAUNCHED,
    SETTINGS_UNAVAILABLE,
}

interface BatteryOptimizationPlatform {
    fun isExempt(): Boolean

    fun launchDirectRequest(): Boolean

    fun launchSettingsList(): Boolean
}

interface BatteryOptimizationPromptStore {
    fun explanationShown(): Boolean

    fun markExplanationShown()
}

class BatteryOptimizationCoordinator @Inject constructor(
    private val platform: BatteryOptimizationPlatform,
    private val promptStore: BatteryOptimizationPromptStore,
) {
    fun state(): BatteryOptimizationState =
        when {
            platform.isExempt() -> BatteryOptimizationState(BatteryOptimizationStatus.EXEMPT)
            !promptStore.explanationShown() ->
                BatteryOptimizationState(BatteryOptimizationStatus.NEEDS_EXPLANATION)
            else -> BatteryOptimizationState(BatteryOptimizationStatus.DEGRADED_WARNING)
        }

    fun onExplanationShown() {
        promptStore.markExplanationShown()
    }

    fun onDeclined(): BatteryOptimizationState {
        promptStore.markExplanationShown()
        return BatteryOptimizationState(BatteryOptimizationStatus.DEGRADED_WARNING)
    }

    fun requestFromExplicitAllowTap(): BatteryOptimizationRequestResult {
        if (platform.isExempt()) return BatteryOptimizationRequestResult.ALREADY_EXEMPT
        if (!promptStore.explanationShown()) {
            return BatteryOptimizationRequestResult.EXPLANATION_REQUIRED
        }
        if (platform.launchDirectRequest()) {
            return BatteryOptimizationRequestResult.DIRECT_LAUNCHED
        }
        return if (platform.launchSettingsList()) {
            BatteryOptimizationRequestResult.FALLBACK_LAUNCHED
        } else {
            BatteryOptimizationRequestResult.SETTINGS_UNAVAILABLE
        }
    }
}

@Singleton
class AndroidBatteryOptimizationPlatform @Inject constructor(
    @ApplicationContext private val context: Context,
    private val powerManager: PowerManager,
) : BatteryOptimizationPlatform {
    override fun isExempt(): Boolean =
        powerManager.isIgnoringBatteryOptimizations(context.packageName)

    override fun launchDirectRequest(): Boolean =
        launch(BatteryOptimizationIntents.directRequest(context.packageName))

    override fun launchSettingsList(): Boolean =
        launch(BatteryOptimizationIntents.settingsList())

    private fun launch(intent: Intent): Boolean {
        val launchIntent = intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return try {
            if (launchIntent.resolveActivity(context.packageManager) == null) return false
            context.startActivity(launchIntent)
            true
        } catch (_: ActivityNotFoundException) {
            false
        } catch (_: SecurityException) {
            false
        } catch (_: RuntimeException) {
            false
        }
    }
}

object BatteryOptimizationIntents {
    fun directRequest(packageName: String): Intent =
        Intent(
            Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
            Uri.parse("package:$packageName"),
        )

    fun settingsList(): Intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
}

object OemAutostartPolicy {
    fun currentManufacturerNeedingInstruction(): String? =
        manufacturerNeedingInstruction(Build.MANUFACTURER)

    fun manufacturerNeedingInstruction(manufacturer: String): String? =
        manufacturer.trim().takeIf { normalized ->
            AUTOSTART_MANUFACTURERS.any { it.equals(normalized, ignoreCase = true) }
        }

    private val AUTOSTART_MANUFACTURERS =
        setOf(
            "Xiaomi",
            "Oppo",
            "Vivo",
            "Realme",
            "OnePlus",
        )
}
