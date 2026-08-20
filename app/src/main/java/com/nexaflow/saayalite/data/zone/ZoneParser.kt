package com.nexaflow.saayalite.data.zone

import com.nexaflow.saayalite.domain.model.LatLng
import com.nexaflow.saayalite.domain.model.RiskTier
import com.nexaflow.saayalite.domain.model.Zone
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json

object ZoneParser {
    private const val MIN_LATITUDE = 17.4 // grounded: zone.coordinate.lat.min
    private const val MAX_LATITUDE = 18.1 // grounded: zone.coordinate.lat.max
    private const val MIN_LONGITUDE = 82.9 // grounded: zone.coordinate.lon.min
    private const val MAX_LONGITUDE = 83.7 // grounded: zone.coordinate.lon.max

    private val decoder = Json {
        ignoreUnknownKeys = true
    }

    fun parse(source: String): List<Zone> {
        val collection = decoder.decodeFromString<GeoJsonFeatureCollection>(source)
        require(collection.type == "FeatureCollection") {
            "Expected GeoJSON FeatureCollection, found '${collection.type}'"
        }

        val stationIds = mutableSetOf<String>()
        return collection.features.map { feature ->
            feature.toZone().also { zone ->
                require(stationIds.add(zone.stationId)) {
                    "Duplicate station_id '${zone.stationId}' in zone GeoJSON"
                }
            }
        }
    }

    private fun GeoJsonFeature.toZone(): Zone {
        require(type == "Feature") { "Expected GeoJSON Feature, found '$type'" }
        require(geometry.type == "Polygon") {
            "Expected Polygon geometry for '${properties.stationId}', found '${geometry.type}'"
        }
        properties.requireRequiredText()

        val outerRing = geometry.coordinates.firstOrNull()
            ?: throw IllegalArgumentException(
                "Missing polygon ring for '${properties.stationId}'",
            )
        require(outerRing.isNotEmpty()) {
            "Empty polygon ring for '${properties.stationId}'"
        }

        val polygon = outerRing.map { coordinate ->
            require(coordinate.size == 2) {
                "Malformed coordinate for '${properties.stationId}': expected [longitude, latitude]"
            }
            LatLng(
                latitude = coordinate.last(),
                longitude = coordinate.first(),
            )
        }
        polygon.forEach { vertex ->
            vertex.requireInsideApprovedBounds(
                label = "Polygon vertex for '${properties.stationId}'",
            )
        }

        val centroid = LatLng(
            latitude = properties.latitude,
            longitude = properties.longitude,
        )
        centroid.requireInsideApprovedBounds(
            label = "Centroid for '${properties.stationId}'",
        )

        return Zone(
            stationId = properties.stationId,
            stationName = properties.stationName,
            district = properties.district,
            polygon = polygon,
            centroid = centroid,
            riskScore = properties.riskScore,
            riskTier = properties.riskTier.toDomainRiskTier(),
            colorHex = properties.color,
            opacity = properties.opacity,
            totalCases = properties.totalCases,
            womenSafetyCases = properties.womenSafetyCases,
            crimeBreakdown = properties.crimeBreakdown,
            geofenceRadiusM = properties.geofenceRadiusM,
            areasCovered = properties.areasCovered,
            touristSpots = properties.touristSpots,
            riskNotes = properties.riskNotes,
        )
    }

    private fun GeoJsonProperties.requireRequiredText() {
        requireText("station_id", stationId)
        requireText("station_name", stationName)
        requireText("district", district)
        requireText("color", color)
        requireText("areas_covered", areasCovered)
    }

    private fun requireText(field: String, value: String) {
        require(value.isNotBlank()) { "Missing or blank required field '$field'" }
    }

    private fun String.toDomainRiskTier(): RiskTier = when (this) {
        "high" -> RiskTier.HIGH
        "elevated" -> RiskTier.ELEVATED
        "moderate" -> RiskTier.MODERATE
        "safe" -> RiskTier.SAFE
        else -> throw IllegalArgumentException("Unknown risk_tier '$this'")
    }

    private fun LatLng.requireInsideApprovedBounds(label: String) {
        require(latitude in MIN_LATITUDE..MAX_LATITUDE) {
            "$label latitude $latitude is outside $MIN_LATITUDE..$MAX_LATITUDE"
        }
        require(longitude in MIN_LONGITUDE..MAX_LONGITUDE) {
            "$label longitude $longitude is outside $MIN_LONGITUDE..$MAX_LONGITUDE"
        }
    }
}

@Serializable
private data class GeoJsonFeatureCollection(
    val type: String,
    val features: List<GeoJsonFeature>,
)

@Serializable
private data class GeoJsonFeature(
    val type: String,
    val geometry: GeoJsonGeometry,
    val properties: GeoJsonProperties,
)

@Serializable
private data class GeoJsonGeometry(
    val type: String,
    val coordinates: List<List<List<Double>>>,
)

@Serializable
private data class GeoJsonProperties(
    @SerialName("station_id") val stationId: String,
    @SerialName("station_name") val stationName: String,
    val district: String,
    val latitude: Double,
    val longitude: Double,
    @SerialName("risk_score") val riskScore: Double,
    @SerialName("risk_tier") val riskTier: String,
    val color: String,
    val opacity: Double,
    @SerialName("total_cases") val totalCases: Int,
    @SerialName("women_safety_cases") val womenSafetyCases: Int,
    @SerialName("crime_breakdown") val crimeBreakdown: Map<String, Int>,
    @SerialName("geofence_radius_m") val geofenceRadiusM: Int,
    @SerialName("areas_covered") val areasCovered: String,
    @SerialName("tourist_spots") val touristSpots: String? = null,
    @SerialName("risk_notes") val riskNotes: String? = null,
)
