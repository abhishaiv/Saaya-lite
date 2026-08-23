package com.nexaflow.saayalite.data.repository

import com.nexaflow.saayalite.data.local.SessionEntity
import com.nexaflow.saayalite.domain.engine.ArmMode
import com.nexaflow.saayalite.domain.engine.HourBand
import com.nexaflow.saayalite.domain.engine.SessionState
import java.time.Duration
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

class SessionPersistenceTest {
    @Test
    fun `absolute deadline and frozen band survive the Room mapping`() {
        val armedAt = Instant.EPOCH
        val deadline = armedAt.plus(Duration.ofMinutes(12))
        val entity =
            SessionEntity(
                sessionId = "synthetic-session",
                state = SessionState.SHADOW.name,
                armMode = ArmMode.AUTO_ZONE.name,
                zoneId = "synthetic-zone",
                armedHourBand = HourBand.NIGHT_DEEP.name,
                armedAtEpochMs = armedAt.toEpochMilli(),
                deadlineEpochMs = deadline.toEpochMilli(),
                susEventWritten = false,
                outcome = null,
            )

        val restored = entity.toDomain()

        assertEquals(SessionState.SHADOW, restored.state)
        assertEquals(ArmMode.AUTO_ZONE, restored.armMode)
        assertEquals(HourBand.NIGHT_DEEP, restored.armedHourBand)
        assertEquals(armedAt.toEpochMilli(), restored.armedAtEpochMs)
        assertEquals(deadline.toEpochMilli(), restored.deadlineEpochMs)
    }
}
