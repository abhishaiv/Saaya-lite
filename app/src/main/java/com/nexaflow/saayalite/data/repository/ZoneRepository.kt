package com.nexaflow.saayalite.data.repository

import android.content.Context
import com.nexaflow.saayalite.data.zone.ZoneDataset
import com.nexaflow.saayalite.data.zone.ZoneLoader
import com.nexaflow.saayalite.domain.model.Zone
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

interface ZoneRepository {
    fun zones(): List<Zone>

    fun zone(zoneId: String): Zone?
}

@Singleton
class AndroidZoneRepository @Inject constructor(
    @ApplicationContext private val context: Context,
) : ZoneRepository {
    private val dataset: ZoneDataset by lazy(LazyThreadSafetyMode.SYNCHRONIZED) {
        ZoneLoader.load { assetName ->
            context.assets.open(assetName).bufferedReader().use { it.readText() }
        }
    }

    override fun zones(): List<Zone> = dataset.zones

    override fun zone(zoneId: String): Zone? = dataset.zones.firstOrNull { it.stationId == zoneId }
}
