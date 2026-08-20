package com.nexaflow.saayalite

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.nexaflow.saayalite.ui.theme.SaayaColors
import com.nexaflow.saayalite.ui.theme.SaayaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)

        splashScreen.setOnExitAnimationListener { provider ->
            provider.view.animate()
                .alpha(0f)
                .setDuration(150L) // grounded: motion.150ms
                .withEndAction(provider::remove)
                .start()
        }

        setContent {
            SaayaTheme {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(SaayaColors.Background),
                )
            }
        }
    }
}
