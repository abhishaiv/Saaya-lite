package com.nexaflow.saayalite.di

import com.nexaflow.saayalite.data.repository.AndroidZoneRepository
import com.nexaflow.saayalite.data.repository.RoomSessionRepository
import com.nexaflow.saayalite.data.repository.SessionRepository
import com.nexaflow.saayalite.data.repository.ZoneRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun zoneRepository(implementation: AndroidZoneRepository): ZoneRepository

    @Binds
    @Singleton
    abstract fun sessionRepository(implementation: RoomSessionRepository): SessionRepository
}
