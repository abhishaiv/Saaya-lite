package com.nexaflow.saayalite.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val SaayaDarkColorScheme = darkColorScheme(
    primary = SaayaColors.Brand,
    primaryContainer = SaayaColors.BrandDark,
    secondary = SaayaColors.BrandLight,
    tertiary = SaayaColors.Amber,
    background = SaayaColors.Background,
    surface = SaayaColors.CardFill,
    surfaceVariant = SaayaColors.Surface,
    error = SaayaColors.Danger,
    onBackground = SaayaColors.TextPrimary,
    onSurface = SaayaColors.TextPrimary,
    onSurfaceVariant = SaayaColors.TextSecondary,
    outline = SaayaColors.TextTertiary,
    scrim = SaayaColors.Scrim,
)

@Composable
fun SaayaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = SaayaDarkColorScheme,
        typography = SaayaTypography,
        shapes = SaayaMaterialShapes,
        content = content,
    )
}
