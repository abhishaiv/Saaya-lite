package com.nexaflow.saayalite.di

import android.content.Context
import androidx.room.Room
import com.nexaflow.saayalite.data.local.SaayaDatabase
import com.nexaflow.saayalite.data.local.SessionDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DataModule {
    @Provides
    @Singleton
    fun database(@ApplicationContext context: Context): SaayaDatabase =
        Room.databaseBuilder(context, SaayaDatabase::class.java, DATABASE_NAME)
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    fun sessionDao(database: SaayaDatabase): SessionDao = database.sessionDao()
}

private const val DATABASE_NAME = "saaya_lite.db"
