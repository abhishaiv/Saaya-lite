package com.nexaflow.saayalite.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

@Immutable
object SaayaColors {
    val Brand = Color(0xFFA78BFA) // grounded: color.brand
    val BrandLight = Color(0xFFC2ADFD) // grounded: color.brandLight
    val BrandDark = Color(0xFF8566D1) // grounded: color.brandDark

    val Background = Color(0xFF0B0B0F) // grounded: color.background
    val CardFill = Color(0xFF1F1F1F) // grounded: color.cardFill
    val Surface = Color.White.copy(alpha = 0.06f) // grounded: alpha.surface
    val SurfaceElevated = Color.White.copy(alpha = 0.10f) // grounded: alpha.surfaceElevated
    val Scrim = Color.Black.copy(alpha = 0.40f) // grounded: dim.scrim

    val TextPrimary = Color.White // grounded: color.white
    val TextOnCard = Color.White.copy(alpha = 0.75f) // grounded: alpha.textOnCard
    val TextSecondary = Color.White.copy(alpha = 0.60f) // grounded: alpha.textSecondary
    val TextTertiary = Color.White.copy(alpha = 0.40f) // grounded: alpha.textTertiary

    val Safe = Color(0xFF34C759) // grounded: color.safe
    val Amber = Color(0xFFF09921) // grounded: color.amber
    val Danger = Color(0xFFFF3B30) // grounded: color.danger
}
