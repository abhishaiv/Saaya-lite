package com.nexaflow.saayalite.service

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BatteryOptimizationCoordinatorTest {
    @Test
    fun `already exempt path shows nothing and launches no intent`() {
        val platform = FakeBatteryPlatform(exempt = true)
        val coordinator = BatteryOptimizationCoordinator(platform, FakePromptStore())

        assertEquals(BatteryOptimizationStatus.EXEMPT, coordinator.state().status)
        assertEquals(
            BatteryOptimizationRequestResult.ALREADY_EXEMPT,
            coordinator.requestFromExplicitAllowTap(),
        )
        assertTrue(platform.launches.isEmpty())
    }

    @Test
    fun `non-exempt path requires the explanation before the direct request`() {
        val platform = FakeBatteryPlatform()
        val store = FakePromptStore()
        val coordinator = BatteryOptimizationCoordinator(platform, store)

        assertEquals(BatteryOptimizationStatus.NEEDS_EXPLANATION, coordinator.state().status)
        assertEquals(
            BatteryOptimizationRequestResult.EXPLANATION_REQUIRED,
            coordinator.requestFromExplicitAllowTap(),
        )
        assertTrue(platform.launches.isEmpty())

        coordinator.onExplanationShown()

        assertEquals(
            BatteryOptimizationRequestResult.DIRECT_LAUNCHED,
            coordinator.requestFromExplicitAllowTap(),
        )
        assertEquals(listOf(LaunchKind.DIRECT), platform.launches)
    }

    @Test
    fun `decline remains degraded but never blocks candidate or shadow`() {
        val platform = FakeBatteryPlatform()
        val coordinator = BatteryOptimizationCoordinator(platform, FakePromptStore())

        val declined = coordinator.onDeclined()
        val lifecycle = CandidateLifecycle()
        lifecycle.onEnter(listOf("synthetic-zone"))
        lifecycle.onArmAccepted()

        assertEquals(BatteryOptimizationStatus.DEGRADED_WARNING, declined.status)
        assertFalse(declined.blocksApp)
        assertEquals(BatteryOptimizationStatus.DEGRADED_WARNING, coordinator.state().status)
        assertEquals(ServiceExecutionMode.SHADOW, lifecycle.mode)
        assertTrue(platform.launches.isEmpty())
    }

    @Test
    fun `missing direct handler uses the settings-list fallback`() {
        val platform = FakeBatteryPlatform(directAvailable = false)
        val store = FakePromptStore(shown = true)
        val coordinator = BatteryOptimizationCoordinator(platform, store)

        assertEquals(
            BatteryOptimizationRequestResult.FALLBACK_LAUNCHED,
            coordinator.requestFromExplicitAllowTap(),
        )
        assertEquals(listOf(LaunchKind.DIRECT, LaunchKind.FALLBACK), platform.launches)
    }

    @Test
    fun `missing fallback leaves the app usable and reports settings unavailable`() {
        val platform =
            FakeBatteryPlatform(
                directAvailable = false,
                fallbackAvailable = false,
            )
        val coordinator = BatteryOptimizationCoordinator(platform, FakePromptStore(shown = true))

        assertEquals(
            BatteryOptimizationRequestResult.SETTINGS_UNAVAILABLE,
            coordinator.requestFromExplicitAllowTap(),
        )
        assertFalse(coordinator.state().blocksApp)
    }

    @Test
    fun `reading the persistent warning never reopens Android settings`() {
        val platform = FakeBatteryPlatform()
        val coordinator = BatteryOptimizationCoordinator(platform, FakePromptStore(shown = true))

        assertEquals(BatteryOptimizationStatus.DEGRADED_WARNING, coordinator.state().status)
        assertEquals(BatteryOptimizationStatus.DEGRADED_WARNING, coordinator.state().status)
        assertTrue(platform.launches.isEmpty())
    }

    @Test
    fun `only specified OEM families require the autostart instruction`() {
        listOf("Xiaomi", "oppo", "VIVO", "Realme", "oneplus").forEach { manufacturer ->
            assertEquals(
                manufacturer,
                OemAutostartPolicy.manufacturerNeedingInstruction(manufacturer),
            )
        }
        assertEquals(null, OemAutostartPolicy.manufacturerNeedingInstruction("Google"))
    }
}

private enum class LaunchKind {
    DIRECT,
    FALLBACK,
}

private class FakeBatteryPlatform(
    var exempt: Boolean = false,
    private val directAvailable: Boolean = true,
    private val fallbackAvailable: Boolean = true,
) : BatteryOptimizationPlatform {
    val launches = mutableListOf<LaunchKind>()

    override fun isExempt(): Boolean = exempt

    override fun launchDirectRequest(): Boolean {
        launches += LaunchKind.DIRECT
        return directAvailable
    }

    override fun launchSettingsList(): Boolean {
        launches += LaunchKind.FALLBACK
        return fallbackAvailable
    }
}

private class FakePromptStore(
    private var shown: Boolean = false,
) : BatteryOptimizationPromptStore {
    override fun explanationShown(): Boolean = shown

    override fun markExplanationShown() {
        shown = true
    }
}
