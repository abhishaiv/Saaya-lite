package com.nexaflow.saayalite.data.zone

import com.nexaflow.saayalite.domain.model.ZoneCard
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json

object CardParser {
    fun parse(source: String): Map<String, ZoneCard> {
        val cards = Json.decodeFromString<List<ZoneCard>>(source)
        val cardsByStationId = LinkedHashMap<String, ZoneCard>()

        cards.forEach { card ->
            card.requireRequiredText()
            require(card.stationId !in cardsByStationId) {
                "Duplicate station_id '${card.stationId}' in zone info cards"
            }
            cardsByStationId[card.stationId] = card
        }

        return cardsByStationId
    }

    private fun ZoneCard.requireRequiredText() {
        requireText("station_id", stationId)
        requireText("area_name", areaName)
        requireText("full_areas", fullAreas)
        requireText("risk_level", riskLevel)
        requireText("risk_tier", riskTier)
        requireText("top_crimes", topCrimes)
        requireText("risk_notes", riskNotes)
        requireText("tourist_spots", touristSpots)
    }

    private fun requireText(field: String, value: String) {
        require(value.isNotBlank()) { "Missing or blank required field '$field'" }
    }
}
