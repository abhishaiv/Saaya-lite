package com.nexaflow.saayalite.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.runtime.Immutable
import androidx.compose.ui.unit.dp

@Immutable
object SaayaShapeTokens {
    val Card = RoundedCornerShape(22.dp) // grounded: dim.card.radius
    val Control = RoundedCornerShape(14.dp) // grounded: dim.radius.control
    val SmallControl = RoundedCornerShape(10.dp) // grounded: dim.radius.small
    val BottomSheet = RoundedCornerShape(
        topStart = 22.dp, // grounded: dim.card.radius
        topEnd = 22.dp, // grounded: dim.card.radius
        bottomEnd = 0.dp,
        bottomStart = 0.dp,
    )
}

val SaayaMaterialShapes = Shapes(
    extraSmall = SaayaShapeTokens.SmallControl,
    small = SaayaShapeTokens.SmallControl,
    medium = SaayaShapeTokens.Control,
    large = SaayaShapeTokens.Card,
    extraLarge = SaayaShapeTokens.Card,
)
