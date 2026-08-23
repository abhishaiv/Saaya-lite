package com.nexaflow.saayalite.data.repository

import com.nexaflow.saayalite.data.local.SessionDao
import com.nexaflow.saayalite.data.local.SessionEntity
import com.nexaflow.saayalite.data.local.SessionEventEntity
import com.nexaflow.saayalite.data.local.ZoneCooldownEntity
import com.nexaflow.saayalite.domain.engine.ArmMode
import com.nexaflow.saayalite.domain.engine.HourBand
import com.nexaflow.saayalite.domain.engine.Outcome
import com.nexaflow.saayalite.domain.engine.PersistedSession
import com.nexaflow.saayalite.domain.engine.SessionState
import java.time.Instant
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

interface SessionRepository {
    suspend fun current(): PersistedSession?

    suspend fun begin(
        state: SessionState,
        armMode: ArmMode,
        zoneId: String?,
        armedHourBand: HourBand?,
        armedAtEpochMs: Long,
    ): PersistedSession

    suspend fun updateState(state: SessionState, outcome: Outcome?)

    suspend fun updateDeadline(deadlineEpochMs: Long?)

    suspend fun markSusEventWritten()

    suspend fun cooldowns(): Map<String, Instant>

    suspend fun startCooldown(zoneId: String, until: Instant)

    suspend fun logEvent(type: String, detail: String?, occurredAt: Instant)
}

@Singleton
class RoomSessionRepository @Inject constructor(
    private val dao: SessionDao,
) : SessionRepository {
    override suspend fun current(): PersistedSession? = dao.current()?.toDomain()

    override suspend fun begin(
        state: SessionState,
        armMode: ArmMode,
        zoneId: String?,
        armedHourBand: HourBand?,
        armedAtEpochMs: Long,
    ): PersistedSession {
        val entity =
            SessionEntity(
                sessionId = UUID.randomUUID().toString(),
                state = state.name,
                armMode = armMode.name,
                zoneId = zoneId,
                armedHourBand = armedHourBand?.name,
                armedAtEpochMs = armedAtEpochMs,
                deadlineEpochMs = null,
                susEventWritten = false,
                outcome = null,
            )
        dao.upsertSession(entity)
        return entity.toDomain()
    }

    override suspend fun updateState(state: SessionState, outcome: Outcome?) {
        dao.updateState(state.name, outcome?.name)
    }

    override suspend fun updateDeadline(deadlineEpochMs: Long?) {
        dao.updateDeadline(deadlineEpochMs)
    }

    override suspend fun markSusEventWritten() {
        dao.updateSusEventWritten(true)
    }

    override suspend fun cooldowns(): Map<String, Instant> =
        dao.cooldowns().associate { it.zoneId to Instant.ofEpochMilli(it.untilEpochMs) }

    override suspend fun startCooldown(zoneId: String, until: Instant) {
        dao.upsertCooldown(ZoneCooldownEntity(zoneId, until.toEpochMilli()))
    }

    override suspend fun logEvent(type: String, detail: String?, occurredAt: Instant) {
        val session = dao.current() ?: return
        dao.insertEvent(
            SessionEventEntity(
                sessionId = session.sessionId,
                type = type,
                detail = detail,
                occurredAtEpochMs = occurredAt.toEpochMilli(),
            ),
        )
    }
}

internal fun SessionEntity.toDomain(): PersistedSession =
    PersistedSession(
        sessionId = sessionId,
        state = SessionState.valueOf(state),
        armMode = ArmMode.valueOf(armMode),
        zoneId = zoneId,
        armedHourBand = armedHourBand?.let(HourBand::valueOf),
        armedAtEpochMs = armedAtEpochMs,
        deadlineEpochMs = deadlineEpochMs,
        susEventWritten = susEventWritten,
        outcome = outcome?.let(Outcome::valueOf),
    )
