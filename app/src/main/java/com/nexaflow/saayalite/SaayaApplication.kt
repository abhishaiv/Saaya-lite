package com.nexaflow.saayalite

import android.app.Activity
import android.app.Application
import android.os.Bundle
import com.nexaflow.saayalite.service.GeofenceRegistrar
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class SaayaApplication : Application(), Application.ActivityLifecycleCallbacks {
    @Inject lateinit var foregroundState: ForegroundState
    @Inject lateinit var geofenceRegistrar: GeofenceRegistrar

    override fun onCreate() {
        super.onCreate()
        registerActivityLifecycleCallbacks(this)
        geofenceRegistrar.register()
    }

    override fun onActivityStarted(activity: Activity) = foregroundState.onStarted()

    override fun onActivityStopped(activity: Activity) = foregroundState.onStopped()

    override fun onActivityCreated(activity: Activity, state: Bundle?) = Unit

    override fun onActivityResumed(activity: Activity) = Unit

    override fun onActivityPaused(activity: Activity) = Unit

    override fun onActivitySaveInstanceState(activity: Activity, state: Bundle) = Unit

    override fun onActivityDestroyed(activity: Activity) = Unit
}

class ForegroundState @Inject constructor() {
    private var startedActivities = 0

    val isForeground: Boolean
        @Synchronized get() = startedActivities > 0

    @Synchronized
    fun onStarted() {
        startedActivities += 1 // GROUNDED-EXEMPT: activity lifecycle counter increment
    }

    @Synchronized
    fun onStopped() {
        if (startedActivities > 0) startedActivities -= 1 // GROUNDED-EXEMPT: activity lifecycle counter decrement
    }
}
