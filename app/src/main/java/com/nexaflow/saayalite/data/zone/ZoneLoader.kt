package com.nexaflow.saayalite.data.zone

import com.nexaflow.saayalite.domain.model.PoliceStation
import com.nexaflow.saayalite.domain.model.RiskTier
import com.nexaflow.saayalite.domain.model.Zone
import com.nexaflow.saayalite.domain.model.ZoneCard

data class ZoneDataset(
    val zones: List<Zone>,
    val cardsByStationId: Map<String, ZoneCard>,
    val policeStations: List<PoliceStation>,
)

object ZoneLoader {
    const val ZONES_ASSET = "vizag_heatmap.geojson"
    const val CARDS_ASSET = "zone_info_cards.json"
    const val STATIONS_ASSET = "vizag_police_points.json"

    private const val EXPECTED_ZONE_COUNT = 24 // grounded: zones.total
    private const val EXPECTED_CARD_COUNT = 19 // grounded: cards.total
    private const val EXPECTED_STATION_COUNT = 37 // grounded: stations.total
    private const val EXPECTED_HIGH_COUNT = 6 // grounded: zones.high
    private const val EXPECTED_MODERATE_COUNT = 9 // grounded: zones.moderate
    private const val EXPECTED_ELEVATED_COUNT = 4 // grounded: zones.elevated
    private const val EXPECTED_SAFE_COUNT = 5 // grounded: zones.safe

    fun load(readAsset: (String) -> String): ZoneDataset {
        val zones = ZoneParser.parse(readAsset(ZONES_ASSET))
        val cardsByStationId = CardParser.parse(readAsset(CARDS_ASSET))
        val policeStations = StationParser.parse(readAsset(STATIONS_ASSET))

        require(zones.size == EXPECTED_ZONE_COUNT) {
            "Expected $EXPECTED_ZONE_COUNT zones, found ${zones.size}"
        }
        require(cardsByStationId.size == EXPECTED_CARD_COUNT) {
            "Expected $EXPECTED_CARD_COUNT zone cards, found ${cardsByStationId.size}"
        }
        require(policeStations.size == EXPECTED_STATION_COUNT) {
            "Expected $EXPECTED_STATION_COUNT police stations, found ${policeStations.size}"
        }

        val tierCounts = zones.groupingBy(Zone::riskTier).eachCount()
        require(tierCounts[RiskTier.HIGH] == EXPECTED_HIGH_COUNT) {
            "Expected $EXPECTED_HIGH_COUNT HIGH zones, found ${tierCounts[RiskTier.HIGH]}"
        }
        require(tierCounts[RiskTier.MODERATE] == EXPECTED_MODERATE_COUNT) {
            "Expected $EXPECTED_MODERATE_COUNT MODERATE zones, found ${tierCounts[RiskTier.MODERATE]}"
        }
        require(tierCounts[RiskTier.ELEVATED] == EXPECTED_ELEVATED_COUNT) {
            "Expected $EXPECTED_ELEVATED_COUNT ELEVATED zones, found ${tierCounts[RiskTier.ELEVATED]}"
        }
        require(tierCounts[RiskTier.SAFE] == EXPECTED_SAFE_COUNT) {
            "Expected $EXPECTED_SAFE_COUNT SAFE zones, found ${tierCounts[RiskTier.SAFE]}"
        }

        val nonSafeZoneIds = zones
            .asSequence()
            .filter { it.riskTier != RiskTier.SAFE }
            .map(Zone::stationId)
            .toSet()
        require(cardsByStationId.keys == nonSafeZoneIds) {
            val missingCards = nonSafeZoneIds - cardsByStationId.keys
            val unexpectedCards = cardsByStationId.keys - nonSafeZoneIds
            "Zone-card join mismatch; missing=$missingCards unexpected=$unexpectedCards"
        }

        return ZoneDataset(
            zones = zones,
            cardsByStationId = cardsByStationId,
            policeStations = policeStations,
        )
    }
}
