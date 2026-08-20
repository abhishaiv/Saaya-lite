package com.nexaflow.saayalite.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val SaayaDarkColorScheme = darkColorScheme(
    primary = SaayaColors.Brand,
    onPrimary = SaayaColors.Background,
    primaryContainer = SaayaColors.BrandDark,
    onPrimaryContainer = SaayaColors.TextPrimary,
    inversePrimary = SaayaColors.BrandDark,
    secondary = SaayaColors.BrandLight,
    onSecondary = SaayaColors.Background,
    secondaryContainer = SaayaColors.Surface,
    onSecondaryContainer = SaayaColors.TextPrimary,
    tertiary = SaayaColors.Amber,
    onTertiary = SaayaColors.Background,
    tertiaryContainer = SaayaColors.CardFill,
    onTertiaryContainer = SaayaColors.TextPrimary,
    background = SaayaColors.Background,
    onBackground = SaayaColors.TextPrimary,
    surface = SaayaColors.CardFill,
    onSurface = SaayaColors.TextPrimary,
    surfaceVariant = SaayaColors.Surface,
    onSurfaceVariant = SaayaColors.TextSecondary,
    surfaceTint = SaayaColors.Brand,
    inverseSurface = SaayaColors.TextPrimary,
    inverseOnSurface = SaayaColors.Background,
    error = SaayaColors.Danger,
    onError = SaayaColors.Background,
    errorContainer = SaayaColors.CardFill,
    onErrorContainer = SaayaColors.Danger,
    outline = SaayaColors.TextTertiary,
    outlineVariant = SaayaColors.SurfaceElevated,
    scrim = SaayaColors.Scrim,
    surfaceBright = SaayaColors.SurfaceElevated,
    surfaceContainer = SaayaColors.CardFill,
    surfaceContainerHigh = SaayaColors.SurfaceElevated,
    surfaceContainerHighest = SaayaColors.SurfaceElevated,
    surfaceContainerLow = SaayaColors.Surface,
    surfaceContainerLowest = SaayaColors.Background,
    surfaceDim = SaayaColors.Background,
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
