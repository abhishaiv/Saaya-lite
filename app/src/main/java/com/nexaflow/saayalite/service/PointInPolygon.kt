package com.nexaflow.saayalite.service

import com.nexaflow.saayalite.domain.model.LatLng

object PointInPolygon {
    fun contains(
        point: LatLng,
        polygon: List<LatLng>,
    ): Boolean {
        if (polygon.size < MIN_POLYGON_VERTICES) return false

        var inside = false
        var previous = polygon.lastIndex
        polygon.indices.forEach { current ->
            val a = polygon[previous]
            val b = polygon[current]
            if (point.isOnSegment(a, b)) return true

            val crossesLongitude = (a.longitude > point.longitude) != (b.longitude > point.longitude)
            if (crossesLongitude) {
                val crossingLatitude =
                    (b.latitude - a.latitude) *
                        (point.longitude - a.longitude) /
                        (b.longitude - a.longitude) +
                        a.latitude
                if (point.latitude < crossingLatitude) inside = !inside
            }
            previous = current
        }
        return inside
    }
}

private fun LatLng.isOnSegment(
    a: LatLng,
    b: LatLng,
): Boolean {
    val cross =
        (latitude - a.latitude) * (b.longitude - a.longitude) -
            (longitude - a.longitude) * (b.latitude - a.latitude)
    if (cross != 0.0) return false // GROUNDED-EXEMPT: exact collinearity identity

    return latitude in minOf(a.latitude, b.latitude)..maxOf(a.latitude, b.latitude) &&
        longitude in minOf(a.longitude, b.longitude)..maxOf(a.longitude, b.longitude)
}

private const val MIN_POLYGON_VERTICES = 3 // GROUNDED-EXEMPT: geometric polygon definition
