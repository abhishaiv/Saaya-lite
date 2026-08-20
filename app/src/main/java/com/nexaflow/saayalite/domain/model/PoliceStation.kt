package com.nexaflow.saayalite.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class PoliceStation(
    val id: String,
    val name: String,
    val category: String,
    val locality: String,
    val areaCovered: String,
    val latitude: Double,
    val longitude: Double,
    val coordPrecision: String,
    val phone: String,
    val address: String,
)
