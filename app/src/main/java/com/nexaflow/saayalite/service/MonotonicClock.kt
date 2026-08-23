package com.nexaflow.saayalite.service

import android.os.SystemClock

fun interface MonotonicClock {
    fun elapsedRealtimeMs(): Long
}

object ElapsedRealtimeClock : MonotonicClock {
    override fun elapsedRealtimeMs(): Long = SystemClock.elapsedRealtime()
}
