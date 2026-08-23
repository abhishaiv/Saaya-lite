package com.nexaflow.saayalite.service

import com.nexaflow.saayalite.domain.engine.TimerId

object NotifId {
    const val SHADOW_ONGOING = 1001 // grounded: notif.SHADOW_ONGOING
    const val CHECKIN_1 = 1002 // grounded: notif.CHECKIN_1
    const val CHECKIN_2 = 1003 // grounded: notif.CHECKIN_2
    const val FAMILY = 1004 // grounded: notif.FAMILY
    const val SOS_ONGOING = 1005 // grounded: notif.SOS_ONGOING
    const val QUEUE_FAILED = 1006 // grounded: notif.QUEUE_FAILED
    const val SERVICE_KILLED = 1007 // grounded: notif.SERVICE_KILLED
}

object ReqCode {
    const val TIMER_CHECKIN = 2001 // grounded: reqcode.TIMER_CHECKIN
    const val TIMER_CD1 = 2002 // grounded: reqcode.TIMER_CD1
    const val TIMER_CD2 = 2003 // grounded: reqcode.TIMER_CD2
    const val TIMER_CANCEL = 2004 // grounded: reqcode.TIMER_CANCEL
    const val GEOFENCE = 2005 // grounded: reqcode.GEOFENCE
    const val BOOT = 2006 // grounded: reqcode.BOOT
    const val ACTION_IM_OK = 2101 // grounded: reqcode.ACTION_IM_OK
    const val ACTION_HELP_NOW = 2102 // grounded: reqcode.ACTION_HELP_NOW
    const val ACTION_CANCEL = 2103 // grounded: reqcode.ACTION_CANCEL
    const val OPEN_APP = 2201 // grounded: reqcode.OPEN_APP
}

fun TimerId.requestCode(): Int =
    when (this) {
        TimerId.CHECKIN -> ReqCode.TIMER_CHECKIN
        TimerId.CD1 -> ReqCode.TIMER_CD1
        TimerId.CD2 -> ReqCode.TIMER_CD2
        TimerId.CANCEL -> ReqCode.TIMER_CANCEL
    }

const val SHADOW_CHANNEL_ID = "saaya_shadow"
