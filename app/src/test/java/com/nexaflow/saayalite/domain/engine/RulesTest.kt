package com.nexaflow.saayalite.domain.engine

import com.nexaflow.saayalite.domain.model.RiskTier
import java.time.Duration
import java.time.Instant
import java.time.LocalTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RulesTest {
    private val rules = Rules.DEFAULT
    private val armingEvaluator = ArmingEvaluator(rules)
    private val intervalCalculator = IntervalCalculator(rules)

    @Test
    fun `hour band boundaries use the frozen India-local partitions`() {
        assertEquals(HourBand.NIGHT_LATE, rules.hourBand(LocalTime.MIDNIGHT.minusMinutes(1)))
        assertEquals(HourBand.NIGHT_DEEP, rules.hourBand(LocalTime.MIDNIGHT))
        assertEquals(
            HourBand.NIGHT_DEEP,
            rules.hourBand(LocalTime.of(Rules.DAWN_START_HOUR, 0).minusMinutes(1)),
        )
        assertEquals(HourBand.DAWN, rules.hourBand(LocalTime.of(Rules.DAWN_START_HOUR, 0)))
        assertEquals(
            HourBand.DAY,
            rules.hourBand(LocalTime.of(Rules.NIGHT_EARLY_START_HOUR, 0).minusMinutes(1)),
        )
        assertEquals(
            HourBand.NIGHT_EARLY,
            rules.hourBand(LocalTime.of(Rules.NIGHT_EARLY_START_HOUR, 0)),
        )
    }

    @Test
    fun `arming matrix matches all cells exactly`() {
        val armedCells =
            setOf(
                RiskTier.HIGH to HourBand.NIGHT_EARLY,
                RiskTier.HIGH to HourBand.NIGHT_LATE,
                RiskTier.HIGH to HourBand.NIGHT_DEEP,
                RiskTier.HIGH to HourBand.DAWN,
                RiskTier.ELEVATED to HourBand.NIGHT_LATE,
                RiskTier.ELEVATED to HourBand.NIGHT_DEEP,
                RiskTier.ELEVATED to HourBand.DAWN,
                RiskTier.MODERATE to HourBand.NIGHT_DEEP,
            )

        RiskTier.entries.forEach { tier ->
            HourBand.entries.forEach { band ->
                assertEquals(
                    "$tier at $band",
                    tier to band in armedCells,
                    armingEvaluator.shouldAutoArm(
                        riskTier = tier,
                        hourBand = band,
                        cooldownUntil = null,
                        now = Instant.EPOCH,
                    ),
                )
            }
        }
    }

    @Test
    fun `safe never auto arms in any hour band`() {
        assertTrue(
            HourBand.entries.none {
                armingEvaluator.shouldAutoArm(
                    RiskTier.SAFE,
                    it,
                    cooldownUntil = null,
                    now = Instant.EPOCH,
                )
            },
        )
    }

    @Test
    fun `interval selection follows tier hour and manual rules`() {
        assertEquals(
            Duration.ofMinutes(5).seconds.toInt(),
            intervalCalculator.seconds(RiskTier.HIGH, HourBand.NIGHT_DEEP, ArmMode.AUTO_ZONE),
        )
        assertEquals(
            Duration.ofMinutes(12).seconds.toInt(),
            intervalCalculator.seconds(RiskTier.MODERATE, HourBand.NIGHT_DEEP, ArmMode.AUTO_ZONE),
        )
        HourBand.entries.forEach { band ->
            assertEquals(
                Duration.ofMinutes(10).seconds.toInt(),
                intervalCalculator.seconds(null, band, ArmMode.MANUAL),
            )
        }
    }

    @Test
    fun `display risk applies multiplier labels and clamps`() {
        val risk = rules.displayRisk(0.5, HourBand.NIGHT_DEEP)
        assertEquals(0.65, risk, 0.0)
        assertEquals(DisplayRiskLabel.ELEVATED, rules.displayRiskLabel(risk))

        val clamped = rules.displayRisk(Double.MAX_VALUE, HourBand.NIGHT_DEEP)
        assertEquals(1.0, clamped, 0.0)
        assertEquals(DisplayRiskLabel.HIGH, rules.displayRiskLabel(clamped))
    }

    @Test
    fun `weak PIN rules reject frozen examples only as specified`() {
        assertTrue(rules.isWeakPin("0000"))
        assertTrue(rules.isWeakPin("1234"))
        assertTrue(rules.isWeakPin("1111"))
        assertTrue(rules.isWeakPin("7777"))
        assertFalse(rules.isWeakPin("4062"))
    }
}
