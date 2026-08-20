package com.nexaflow.saayalite.data.zone

import com.nexaflow.saayalite.domain.model.PoliceStation
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json

object StationParser {
    private val decoder = Json {
        ignoreUnknownKeys = true
    }

    fun parse(source: String): List<PoliceStation> {
        val stations = decoder.decodeFromString<List<PoliceStation>>(source)
        val stationIds = mutableSetOf<String>()

        stations.forEach { station ->
            require(station.phone.isNotBlank()) {
                "Police station ${station.id} has a blank phone"
            }
            require(stationIds.add(station.id)) {
                "Duplicate police station id: ${station.id}"
            }
        }

        return stations
    }
}
