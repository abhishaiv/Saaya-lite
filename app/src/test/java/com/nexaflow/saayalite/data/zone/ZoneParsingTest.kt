package com.nexaflow.saayalite.data.zone

import com.nexaflow.saayalite.domain.model.LatLng
import com.nexaflow.saayalite.domain.model.RiskTier
import java.nio.file.Files
import java.nio.file.Path
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ZoneParsingTest {
    private val assetRoot = listOf(
        Path.of("src/main/assets"),
        Path.of("app/src/main/assets"),
    ).firstOrNull { Files.isDirectory(it) }
        ?: error("Bundled asset directory not found")

    @Test
    fun auditedAssetsParseWithExactCountsAndJoins() {
        val dataset = loadBundledDataset()

        assertEquals(24, dataset.zones.size) // grounded: zones.total
        assertEquals(19, dataset.cardsByStationId.size) // grounded: cards.total
        assertEquals(37, dataset.policeStations.size) // grounded: stations.total

        val tierCounts = dataset.zones.groupingBy { it.riskTier }.eachCount()
        assertEquals(6, tierCounts[RiskTier.HIGH]) // grounded: zones.high
        assertEquals(9, tierCounts[RiskTier.MODERATE]) // grounded: zones.moderate
        assertEquals(4, tierCounts[RiskTier.ELEVATED]) // grounded: zones.elevated
        assertEquals(5, tierCounts[RiskTier.SAFE]) // grounded: zones.safe

        val nonSafeZoneIds = dataset.zones
            .filter { it.riskTier != RiskTier.SAFE }
            .map { it.stationId }
            .toSet()
        assertEquals(19, nonSafeZoneIds.size) // grounded: zones.drawn
        assertEquals(nonSafeZoneIds, dataset.cardsByStationId.keys)
        assertTrue(dataset.policeStations.all { it.phone.isNotBlank() })
    }

    @Test
    fun parsedCentroidsAndVerticesStayInsideDistrictEnvelope() {
        val dataset = loadBundledDataset()

        dataset.zones.forEach { zone ->
            assertInsideApprovedBounds(zone.centroid)
            zone.polygon.forEach(::assertInsideApprovedBounds)
        }
    }

    private fun loadBundledDataset(): ZoneDataset = ZoneLoader.load { assetName ->
        Files.newBufferedReader(assetRoot.resolve(assetName)).use { it.readText() }
    }

    private fun assertInsideApprovedBounds(point: LatLng) {
        assertTrue(point.latitude in 17.4..18.1) // grounded: zone.coordinate.lat.min/max
        assertTrue(point.longitude in 82.9..83.7) // grounded: zone.coordinate.lon.min/max
    }
}
