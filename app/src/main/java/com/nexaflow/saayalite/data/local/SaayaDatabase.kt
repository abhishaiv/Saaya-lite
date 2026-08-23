package com.nexaflow.saayalite.data.local

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase

@Entity(tableName = "active_session")
data class SessionEntity(
    @PrimaryKey val rowId: Int = SINGLE_SESSION_ROW,
    val sessionId: String,
    val state: String,
    val armMode: String,
    val zoneId: String?,
    val armedHourBand: String?,
    val armedAtEpochMs: Long,
    val deadlineEpochMs: Long?,
    val susEventWritten: Boolean,
    val outcome: String?,
)

@Entity(tableName = "zone_cooldown")
data class ZoneCooldownEntity(
    @PrimaryKey val zoneId: String,
    val untilEpochMs: Long,
)

@Entity(tableName = "session_event")
data class SessionEventEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = GENERATED_ID,
    val sessionId: String,
    val type: String,
    val detail: String?,
    val occurredAtEpochMs: Long,
)

@Dao
interface SessionDao {
    @Query("SELECT * FROM active_session WHERE rowId = :rowId")
    suspend fun current(rowId: Int = SINGLE_SESSION_ROW): SessionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertSession(entity: SessionEntity)

    @Query("UPDATE active_session SET state = :state, outcome = :outcome WHERE rowId = :rowId")
    suspend fun updateState(
        state: String,
        outcome: String?,
        rowId: Int = SINGLE_SESSION_ROW,
    )

    @Query("UPDATE active_session SET deadlineEpochMs = :deadline WHERE rowId = :rowId")
    suspend fun updateDeadline(
        deadline: Long?,
        rowId: Int = SINGLE_SESSION_ROW,
    )

    @Query("UPDATE active_session SET susEventWritten = :written WHERE rowId = :rowId")
    suspend fun updateSusEventWritten(
        written: Boolean,
        rowId: Int = SINGLE_SESSION_ROW,
    )

    @Query("SELECT * FROM zone_cooldown")
    suspend fun cooldowns(): List<ZoneCooldownEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertCooldown(entity: ZoneCooldownEntity)

    @Insert
    suspend fun insertEvent(entity: SessionEventEntity)
}

@Database(
    entities = [SessionEntity::class, ZoneCooldownEntity::class, SessionEventEntity::class],
    version = DATABASE_VERSION, // GROUNDED-EXEMPT: initial destructive prototype schema
    exportSchema = false,
)
abstract class SaayaDatabase : RoomDatabase() {
    abstract fun sessionDao(): SessionDao
}

private const val SINGLE_SESSION_ROW = 1 // GROUNDED-EXEMPT: single-row Room primary key
private const val GENERATED_ID = 0L // GROUNDED-EXEMPT: Room auto-generation sentinel
private const val DATABASE_VERSION = 1 // GROUNDED-EXEMPT: initial destructive prototype schema
