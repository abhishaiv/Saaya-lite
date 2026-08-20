package com.nexaflow.saayalite.domain.engine

import com.nexaflow.saayalite.domain.model.RiskTier
import java.time.Instant

class ArmingEvaluator(
    private val rules: Rules,
) {
    fun shouldAutoArm(
        riskTier: RiskTier,
        hourBand: HourBand,
        cooldownUntil: Instant?,
        now: Instant,
    ): Boolean =
        cooldownUntil?.isAfter(now) != true &&
            rules.armingMatrix[riskTier to hourBand] == true
}
