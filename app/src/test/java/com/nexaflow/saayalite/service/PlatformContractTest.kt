package com.nexaflow.saayalite.service

import com.nexaflow.saayalite.domain.engine.TimerId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PlatformContractTest {
    @Test
    fun `every timer and notification id is collision free`() {
        val notificationIds =
            listOf(
                NotifId.SHADOW_ONGOING,
                NotifId.CHECKIN_1,
                NotifId.CHECKIN_2,
                NotifId.FAMILY,
                NotifId.SOS_ONGOING,
                NotifId.QUEUE_FAILED,
                NotifId.SERVICE_KILLED,
            )
        val requestCodes =
            listOf(
                ReqCode.TIMER_CHECKIN,
                ReqCode.TIMER_CD1,
                ReqCode.TIMER_CD2,
                ReqCode.TIMER_CANCEL,
                ReqCode.GEOFENCE,
                ReqCode.BOOT,
                ReqCode.ACTION_IM_OK,
                ReqCode.ACTION_HELP_NOW,
                ReqCode.ACTION_CANCEL,
                ReqCode.OPEN_APP,
            )

        assertEquals(notificationIds.size, notificationIds.toSet().size)
        assertEquals(requestCodes.size, requestCodes.toSet().size)
        assertEquals(ReqCode.TIMER_CHECKIN, TimerId.CHECKIN.requestCode())
        assertEquals(ReqCode.TIMER_CD1, TimerId.CD1.requestCode())
        assertEquals(ReqCode.TIMER_CD2, TimerId.CD2.requestCode())
        assertEquals(ReqCode.TIMER_CANCEL, TimerId.CANCEL.requestCode())
    }

    @Test
    fun `candidate notification contract is low silent ongoing and open only`() {
        val policy = CandidatePolicy.notification

        assertEquals(NotifId.SHADOW_ONGOING, policy.notificationId)
        assertEquals(SHADOW_CHANNEL_ID, policy.channelId)
        assertTrue(policy.lowImportance)
        assertTrue(policy.silent)
        assertTrue(policy.ongoing)
        assertTrue(policy.openOnly)
    }
}
