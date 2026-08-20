package com.nexaflow.saayalite.domain.model

data class LatLng(
    val latitude: Double,
    val longitude: Double,
)

enum class RiskTier {
    HIGH,
    ELEVATED,
    MODERATE,
    SAFE,
}

data class Zone(
    val stationId: String,
    val stationName: String,
    val district: String,
    val polygon: List<LatLng>,
    val centroid: LatLng,
    val riskScore: Double,
    val riskTier: RiskTier,
    val colorHex: String,
    val opacity: Double,
    val totalCases: Int,
    val womenSafetyCases: Int,
    val crimeBreakdown: Map<String, Int>,
    val geofenceRadiusM: Int,
    val areasCovered: String,
    val touristSpots: String?,
    val riskNotes: String?,
)
