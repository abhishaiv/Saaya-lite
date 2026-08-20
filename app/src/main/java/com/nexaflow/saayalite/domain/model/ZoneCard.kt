package com.nexaflow.saayalite.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ZoneCard(
    @SerialName("station_id") val stationId: String,
    @SerialName("area_name") val areaName: String,
    @SerialName("full_areas") val fullAreas: String,
    @SerialName("risk_level") val riskLevel: String,
    @SerialName("risk_tier") val riskTier: String,
    @SerialName("incident_count") val incidentCount: Int,
    @SerialName("women_safety_count") val womenSafetyCount: Int,
    @SerialName("top_crimes") val topCrimes: String,
    @SerialName("risk_notes") val riskNotes: String,
    @SerialName("tourist_spots") val touristSpots: String,
)
