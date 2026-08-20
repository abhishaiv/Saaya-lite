package com.nexaflow.saayalite.domain.engine

import com.nexaflow.saayalite.domain.model.RiskTier
import java.time.Duration

class IntervalCalculator(
    private val rules: Rules,
) {
    fun seconds(
        riskTier: RiskTier?,
        hourBand: HourBand,
        armMode: ArmMode,
    ): Int {
        val intervalMinutes =
            if (armMode == ArmMode.MANUAL) {
                rules.manualIntervalMin
            } else {
                requireNotNull(riskTier) { "Auto-zone interval requires a zone tier" }
                requireNotNull(rules.intervals[riskTier to hourBand]) {
                    "No interval exists for a zone/hour pair that cannot auto-arm"
                }
            }
        return Duration.ofMinutes(intervalMinutes.toLong()).seconds.toInt() / rules.demoDivisor
    }
}
