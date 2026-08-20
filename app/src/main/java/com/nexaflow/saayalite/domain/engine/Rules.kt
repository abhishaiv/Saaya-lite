package com.nexaflow.saayalite.domain.engine

import com.nexaflow.saayalite.domain.model.RiskTier
import java.time.LocalTime

enum class DisplayRiskLabel {
    LOW,
    MODERATE,
    ELEVATED,
    HIGH,
}

data class Rules(
    val checkIn1Sec: Int,
    val checkIn2Sec: Int,
    val cancelWindowSec: Int,
    val enterDwellSec: Int,
    val exitDwellSec: Int,
    val manualDisarmCooldownMin: Int,
    val okCooldownMin: Int,
    val manualIntervalMin: Int,
    val demoDivisor: Int,
    val intervals: Map<Pair<RiskTier, HourBand>, Int>,
    val armingMatrix: Map<Pair<RiskTier, HourBand>, Boolean>,
    val samplingShadowSec: Int,
    val samplingSosSec: Int,
) {
    init {
        require(demoDivisor > 0)
    }

    fun hourBand(time: LocalTime): HourBand =
        when {
            time.hour < DAWN_START_HOUR -> HourBand.NIGHT_DEEP
            time.hour < DAY_START_HOUR -> HourBand.DAWN
            time.hour < NIGHT_EARLY_START_HOUR -> HourBand.DAY
            time.hour < NIGHT_LATE_START_HOUR -> HourBand.NIGHT_EARLY
            else -> HourBand.NIGHT_LATE
        }

    fun checkIn1Seconds(): Int = checkIn1Sec / demoDivisor

    fun checkIn2Seconds(): Int = checkIn2Sec / demoDivisor

    fun cancelWindowSeconds(): Int = cancelWindowSec / demoDivisor

    fun enterDwellSeconds(): Int = enterDwellSec / demoDivisor

    fun exitDwellSeconds(): Int = exitDwellSec / demoDivisor

    fun ladderTotalSeconds(): Int =
        checkIn1Seconds() + checkIn2Seconds() + cancelWindowSeconds()

    fun displayRisk(
        riskScore: Double,
        hourBand: HourBand,
    ): Double =
        (riskScore * displayMultiplier(hourBand)).coerceIn(
            RISK_CLAMP_MIN,
            RISK_CLAMP_MAX,
        )

    fun displayRiskLabel(displayRisk: Double): DisplayRiskLabel =
        when {
            displayRisk < RISK_THRESHOLD_LOW -> DisplayRiskLabel.LOW
            displayRisk < RISK_THRESHOLD_MODERATE -> DisplayRiskLabel.MODERATE
            displayRisk < RISK_THRESHOLD_ELEVATED -> DisplayRiskLabel.ELEVATED
            else -> DisplayRiskLabel.HIGH
        }

    fun isWeakPin(pin: String): Boolean =
        pin.length != PIN_LENGTH ||
            pin.any { it !in WESTERN_DIGIT_MIN..WESTERN_DIGIT_MAX } ||
            (pin.isNotEmpty() && pin.all { it == pin.first() }) ||
            pin == REJECTED_ASCENDING_PIN

    private fun displayMultiplier(hourBand: HourBand): Double =
        when (hourBand) {
            HourBand.DAY -> RISK_MULTIPLIER_DAY
            HourBand.NIGHT_EARLY -> RISK_MULTIPLIER_NIGHT_EARLY
            HourBand.DAWN -> RISK_MULTIPLIER_DAWN
            HourBand.NIGHT_LATE -> RISK_MULTIPLIER_NIGHT_LATE
            HourBand.NIGHT_DEEP -> RISK_MULTIPLIER_NIGHT_DEEP
        }

    companion object {
        const val CHECK_IN_1_SECONDS = 90 // grounded: ladder.cd1
        const val CHECK_IN_2_SECONDS = 60 // grounded: ladder.cd2
        const val CANCEL_WINDOW_SECONDS = 60 // grounded: ladder.cancel
        const val ENTER_DWELL_SECONDS = 60 // grounded: dwell.enter
        const val EXIT_DWELL_SECONDS = 180 // grounded: dwell.exit
        const val MANUAL_DISARM_COOLDOWN_MINUTES = 45 // grounded: cooldown.manual
        const val OK_COOLDOWN_MINUTES = 20 // grounded: cooldown.ok
        const val MANUAL_INTERVAL_MINUTES = 10 // grounded: interval.manual
        const val NORMAL_DIVISOR = 1 // grounded: demo.normal.divisor
        const val DEMO_DIVISOR = 6 // grounded: demo.divisor
        const val SAMPLING_SHADOW_SECONDS = 15 // grounded: loc.sample.shadow
        const val SAMPLING_SOS_SECONDS = 5 // grounded: loc.sample.sos

        const val DAWN_START_HOUR = 5 // grounded: hour.dawn.start
        const val DAY_START_HOUR = 7 // grounded: hour.day.start
        const val NIGHT_EARLY_START_HOUR = 20 // grounded: hour.nightEarly.start
        const val NIGHT_LATE_START_HOUR = 22 // grounded: hour.nightLate.start

        const val RISK_MULTIPLIER_DAY = 0.6 // grounded: risk.multiplier.day
        const val RISK_MULTIPLIER_NIGHT_EARLY = 0.9 // grounded: risk.multiplier.nightEarly
        const val RISK_MULTIPLIER_DAWN = 1.0 // grounded: risk.multiplier.dawn
        const val RISK_MULTIPLIER_NIGHT_LATE = 1.15 // grounded: risk.multiplier.nightLate
        const val RISK_MULTIPLIER_NIGHT_DEEP = 1.3 // grounded: risk.multiplier.nightDeep
        const val RISK_CLAMP_MIN = 0.0 // grounded: risk.clamp.min
        const val RISK_CLAMP_MAX = 1.0 // grounded: risk.clamp.max
        const val RISK_THRESHOLD_LOW = 0.25 // grounded: risk.threshold.low
        const val RISK_THRESHOLD_MODERATE = 0.5 // grounded: risk.threshold.moderate
        const val RISK_THRESHOLD_ELEVATED = 0.75 // grounded: risk.threshold.elevated

        const val PIN_LENGTH = 4 // grounded: pin.length
        private const val REJECTED_ASCENDING_PIN_NUMBER = 1234 // grounded: pin.rejected.1234
        private const val WESTERN_DIGIT_MIN = '0' // grounded: numeral.western.min
        private const val WESTERN_DIGIT_MAX = '9' // grounded: numeral.western.max
        private val REJECTED_ASCENDING_PIN = REJECTED_ASCENDING_PIN_NUMBER.toString()

        private const val INTERVAL_HIGH_DEEP_MINUTES = 5 // grounded: interval.high.deep
        private const val INTERVAL_HIGH_LATE_MINUTES = 8 // grounded: interval.high.late
        private const val INTERVAL_HIGH_EARLY_MINUTES = 10 // grounded: interval.high.early
        private const val INTERVAL_ELEVATED_DEEP_MINUTES = 8 // grounded: interval.elev.deep
        private const val INTERVAL_ELEVATED_OTHER_MINUTES = 10 // grounded: interval.elev.other
        private const val INTERVAL_MODERATE_DEEP_MINUTES = 12 // grounded: interval.mod.deep

        val DEFAULT: Rules
            get() = create(NORMAL_DIVISOR)

        val DEMO: Rules
            get() = create(DEMO_DIVISOR)

        private fun create(divisor: Int): Rules =
            Rules(
                checkIn1Sec = CHECK_IN_1_SECONDS,
                checkIn2Sec = CHECK_IN_2_SECONDS,
                cancelWindowSec = CANCEL_WINDOW_SECONDS,
                enterDwellSec = ENTER_DWELL_SECONDS,
                exitDwellSec = EXIT_DWELL_SECONDS,
                manualDisarmCooldownMin = MANUAL_DISARM_COOLDOWN_MINUTES,
                okCooldownMin = OK_COOLDOWN_MINUTES,
                manualIntervalMin = MANUAL_INTERVAL_MINUTES,
                demoDivisor = divisor,
                intervals =
                    mapOf(
                        (RiskTier.HIGH to HourBand.NIGHT_DEEP) to INTERVAL_HIGH_DEEP_MINUTES,
                        (RiskTier.HIGH to HourBand.NIGHT_LATE) to INTERVAL_HIGH_LATE_MINUTES,
                        (RiskTier.HIGH to HourBand.DAWN) to INTERVAL_HIGH_LATE_MINUTES,
                        (RiskTier.HIGH to HourBand.NIGHT_EARLY) to INTERVAL_HIGH_EARLY_MINUTES,
                        (RiskTier.ELEVATED to HourBand.NIGHT_DEEP) to INTERVAL_ELEVATED_DEEP_MINUTES,
                        (RiskTier.ELEVATED to HourBand.NIGHT_LATE) to INTERVAL_ELEVATED_OTHER_MINUTES,
                        (RiskTier.ELEVATED to HourBand.DAWN) to INTERVAL_ELEVATED_OTHER_MINUTES,
                        (RiskTier.MODERATE to HourBand.NIGHT_DEEP) to INTERVAL_MODERATE_DEEP_MINUTES,
                    ),
                armingMatrix =
                    mapOf(
                        (RiskTier.HIGH to HourBand.DAY) to false,
                        (RiskTier.HIGH to HourBand.NIGHT_EARLY) to true,
                        (RiskTier.HIGH to HourBand.NIGHT_LATE) to true,
                        (RiskTier.HIGH to HourBand.NIGHT_DEEP) to true,
                        (RiskTier.HIGH to HourBand.DAWN) to true,
                        (RiskTier.ELEVATED to HourBand.DAY) to false,
                        (RiskTier.ELEVATED to HourBand.NIGHT_EARLY) to false,
                        (RiskTier.ELEVATED to HourBand.NIGHT_LATE) to true,
                        (RiskTier.ELEVATED to HourBand.NIGHT_DEEP) to true,
                        (RiskTier.ELEVATED to HourBand.DAWN) to true,
                        (RiskTier.MODERATE to HourBand.DAY) to false,
                        (RiskTier.MODERATE to HourBand.NIGHT_EARLY) to false,
                        (RiskTier.MODERATE to HourBand.NIGHT_LATE) to false,
                        (RiskTier.MODERATE to HourBand.NIGHT_DEEP) to true,
                        (RiskTier.MODERATE to HourBand.DAWN) to false,
                        (RiskTier.SAFE to HourBand.DAY) to false,
                        (RiskTier.SAFE to HourBand.NIGHT_EARLY) to false,
                        (RiskTier.SAFE to HourBand.NIGHT_LATE) to false,
                        (RiskTier.SAFE to HourBand.NIGHT_DEEP) to false,
                        (RiskTier.SAFE to HourBand.DAWN) to false,
                    ),
                samplingShadowSec = SAMPLING_SHADOW_SECONDS,
                samplingSosSec = SAMPLING_SOS_SECONDS,
            )
    }
}
