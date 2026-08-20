package com.nexaflow.saayalite.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.runtime.Immutable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

@Immutable
object SaayaType {
    val Display = TextStyle(
        fontSize = 34.sp, // grounded: type.display
        fontWeight = FontWeight.Bold,
        lineHeight = 40.sp, // grounded: type.display.lineheight
        fontFeatureSettings = "tnum",
    )
    val Title = TextStyle(
        fontSize = 24.sp, // grounded: type.title
        fontWeight = FontWeight.Bold,
        lineHeight = 30.sp, // grounded: type.title.lineheight
    )
    val CardTitle = TextStyle(
        fontSize = 20.sp, // grounded: type.cardTitle
        fontWeight = FontWeight.Bold,
        lineHeight = 26.sp, // grounded: type.cardTitle.lineheight
    )
    val Headline = TextStyle(
        fontSize = 18.sp, // grounded: type.headline
        fontWeight = FontWeight.SemiBold,
        lineHeight = 24.sp, // grounded: type.headline.lineheight
    )
    val Body = TextStyle(
        fontSize = 16.sp, // grounded: type.body
        fontWeight = FontWeight.Normal,
        lineHeight = 24.sp, // grounded: type.body.lineheight
    )
    val CardBody = TextStyle(
        fontSize = 14.sp, // grounded: type.cardBody
        fontWeight = FontWeight.Normal,
        lineHeight = 20.sp, // grounded: type.cardBody.lineheight
    )
    val Caption = TextStyle(
        fontSize = 13.sp, // grounded: type.caption
        fontWeight = FontWeight.Normal,
        lineHeight = 18.sp, // grounded: type.caption.lineheight
    )
    val Label = TextStyle(
        fontSize = 11.sp, // grounded: type.label
        fontWeight = FontWeight.SemiBold,
        lineHeight = 14.sp, // grounded: type.label.lineheight
        letterSpacing = 0.5.sp, // grounded: type.label.tracking
    )
}

// T1.3 wires the bundled Poppins and Noto Sans Telugu font families into these exact styles.
val SaayaTypography = Typography(
    displayLarge = SaayaType.Display,
    headlineLarge = SaayaType.Title,
    titleLarge = SaayaType.CardTitle,
    titleMedium = SaayaType.Headline,
    bodyLarge = SaayaType.Body,
    bodyMedium = SaayaType.CardBody,
    bodySmall = SaayaType.Caption,
    labelSmall = SaayaType.Label,
)
