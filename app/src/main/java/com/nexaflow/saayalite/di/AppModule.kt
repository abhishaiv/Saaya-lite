package com.nexaflow.saayalite.di

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.os.PowerManager
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.LocationServices
import com.nexaflow.saayalite.domain.engine.Rules
import com.nexaflow.saayalite.service.ElapsedRealtimeClock
import com.nexaflow.saayalite.service.AndroidBatteryOptimizationPlatform
import com.nexaflow.saayalite.service.BatteryOptimizationPlatform
import com.nexaflow.saayalite.service.BatteryOptimizationPromptStore
import com.nexaflow.saayalite.service.MonotonicClock
import com.nexaflow.saayalite.service.OperationalStateStore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import java.time.Clock
import java.time.ZoneId
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides
    @Singleton
    fun clock(): Clock = Clock.system(ZoneId.of(SAAYA_TIME_ZONE))

    @Provides
    @Singleton
    fun rules(): Rules = Rules.DEFAULT

    @Provides
    @Singleton
    fun monotonicClock(): MonotonicClock = ElapsedRealtimeClock

    @Provides
    @Singleton
    fun alarmManager(@ApplicationContext context: Context): AlarmManager =
        context.getSystemService(AlarmManager::class.java)

    @Provides
    @Singleton
    fun notificationManager(@ApplicationContext context: Context): NotificationManager =
        context.getSystemService(NotificationManager::class.java)

    @Provides
    @Singleton
    fun powerManager(@ApplicationContext context: Context): PowerManager =
        context.getSystemService(PowerManager::class.java)

    @Provides
    @Singleton
    fun fusedLocationClient(@ApplicationContext context: Context): FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    @Provides
    @Singleton
    fun geofencingClient(@ApplicationContext context: Context): GeofencingClient =
        LocationServices.getGeofencingClient(context)

    @Provides
    @IoDispatcher
    fun ioDispatcher(): CoroutineDispatcher = Dispatchers.IO

    @Provides
    fun batteryOptimizationPlatform(
        implementation: AndroidBatteryOptimizationPlatform,
    ): BatteryOptimizationPlatform = implementation

    @Provides
    fun batteryOptimizationPromptStore(
        implementation: OperationalStateStore,
    ): BatteryOptimizationPromptStore = implementation
}

private const val SAAYA_TIME_ZONE = "Asia/Kolkata" // grounded: const.tz
