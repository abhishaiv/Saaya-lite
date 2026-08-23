package com.nexaflow.saayalite.service

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.nexaflow.saayalite.data.local.SaayaDatabase
import com.nexaflow.saayalite.data.local.SessionEntity
import com.nexaflow.saayalite.data.repository.RoomSessionRepository
import com.nexaflow.saayalite.domain.engine.ArmMode
import com.nexaflow.saayalite.domain.engine.Command
import com.nexaflow.saayalite.domain.engine.EngineContext
import com.nexaflow.saayalite.domain.engine.HourBand
import com.nexaflow.saayalite.domain.engine.Rules
import com.nexaflow.saayalite.domain.engine.SessionEngine
import com.nexaflow.saayalite.domain.engine.SessionEvent
import com.nexaflow.saayalite.domain.engine.SessionState
import com.nexaflow.saayalite.domain.engine.TimerId
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class RecoveryTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private var database: SaayaDatabase? = null

    @Before
    fun clearPreviousStore() {
        context.deleteDatabase(TEST_DATABASE_NAME)
    }

    @After
    fun closeStore() {
        database?.close()
        context.deleteDatabase(TEST_DATABASE_NAME)
    }

    @Test
    fun processBoundaryDuringCheckInTwoRestoresTheRemainingCountdown() {
        val deadline = Instant.EPOCH.plusSeconds(Rules.CHECK_IN_2_SECONDS.toLong())
        persistAndClose(
            session(
                state = SessionState.CHECKIN_2,
                deadline = deadline,
            ),
        )

        val persisted = reopenAndRead()
        val result =
            SessionEngine(Clock.fixed(Instant.EPOCH, ZoneOffset.UTC)).onEvent(
                SessionState.IDLE,
                SessionEvent.AppKilledRestart(persisted),
                engineContext(),
            )

        assertEquals(SessionState.CHECKIN_2, result.state)
        val checkIn = result.commands.filterIsInstance<Command.ShowCheckIn>().single()
        val timer = result.commands.filterIsInstance<Command.ScheduleTimer>().single()
        assertEquals(Rules.CHECK_IN_2_SECONDS, checkIn.countdownSec)
        assertEquals(TimerId.CD2, timer.id)
        assertEquals(Rules.CHECK_IN_2_SECONDS, timer.delaySec)
        assertEquals(deadline.toEpochMilli(), timer.deadlineEpochMs)
    }

    @Test
    fun processBoundaryAfterFamilyWindowLandsInSosActive() {
        persistAndClose(
            session(
                state = SessionState.FAMILY_ESCALATED,
                deadline = Instant.EPOCH,
                susEventWritten = true,
            ),
        )

        val persisted = reopenAndRead()
        val result =
            SessionEngine(Clock.fixed(Instant.MAX, ZoneOffset.UTC)).onEvent(
                SessionState.IDLE,
                SessionEvent.AppKilledRestart(persisted),
                engineContext(),
            )

        assertEquals(SessionState.SOS_ACTIVE, result.state)
        assertTrue(result.commands.any { it is Command.WriteSosIncident })
        assertTrue(result.commands.none { it == Command.WriteSusEvent })
    }

    private fun persistAndClose(entity: SessionEntity) {
        val opened = openDatabase()
        runBlocking { opened.sessionDao().upsertSession(entity) }
        opened.close()
        database = null
    }

    private fun reopenAndRead() =
        openDatabase().let { opened ->
            runBlocking {
                assertNotNull(opened.sessionDao().current())
                requireNotNull(RoomSessionRepository(opened.sessionDao()).current())
            }
        }

    private fun openDatabase(): SaayaDatabase =
        Room.databaseBuilder(context, SaayaDatabase::class.java, TEST_DATABASE_NAME)
            .build()
            .also { database = it }

    private fun session(
        state: SessionState,
        deadline: Instant,
        susEventWritten: Boolean = false,
    ): SessionEntity =
        SessionEntity(
            sessionId = "instrumented-recovery-session",
            state = state.name,
            armMode = ArmMode.AUTO_ZONE.name,
            zoneId = "synthetic-zone",
            armedHourBand = HourBand.NIGHT_DEEP.name,
            armedAtEpochMs = Instant.EPOCH.toEpochMilli(),
            deadlineEpochMs = deadline.toEpochMilli(),
            susEventWritten = susEventWritten,
            outcome = null,
        )

    private fun engineContext(): EngineContext =
        EngineContext(
            now = Instant.EPOCH,
            zone = null,
            hourBand = HourBand.NIGHT_DEEP,
            armedHourBand = HourBand.NIGHT_DEEP,
            rules = Rules.DEFAULT,
            armMode = ArmMode.AUTO_ZONE,
            armedAt = null,
            deadline = null,
            cooldowns = emptyMap(),
            hasFavourite = true,
            susEventWritten = false,
        )

    private companion object {
        const val TEST_DATABASE_NAME = "saaya-recovery-instrumented.db"
    }
}
