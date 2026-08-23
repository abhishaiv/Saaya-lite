package com.nexaflow.saayalite.service

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.Settings
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class BatteryOptimizationPlatformTest {
    private val context: Context = ApplicationProvider.getApplicationContext()

    @Suppress("DEPRECATION")
    @Test
    fun manifestDeclaresTheDirectBatteryExemptionPermission() {
        val packageInfo =
            context.packageManager.getPackageInfo(
                context.packageName,
                PackageManager.GET_PERMISSIONS,
            )

        assertTrue(
            packageInfo.requestedPermissions.orEmpty().contains(
                Manifest.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
            ),
        )
    }

    @Test
    fun directRequestUsesTheExactActionAndPackageUri() {
        val intent = BatteryOptimizationIntents.directRequest(context.packageName)

        assertEquals(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, intent.action)
        assertEquals("package:${context.packageName}", intent.dataString)
    }

    @Test
    fun fallbackOpensTheBatteryOptimizationSettingsList() {
        val intent = BatteryOptimizationIntents.settingsList()

        assertEquals(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS, intent.action)
    }

    @Test
    fun exactAlarmWarningRoutesToThisPackageSettings() {
        val intent = ExactAlarmIntents.requestPermission(context.packageName)

        assertEquals(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, intent.action)
        assertEquals("package:${context.packageName}", intent.dataString)
    }
}
