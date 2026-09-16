package expo.modules.studyshield

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class StudyShieldModule : Module() {
  private var previousFilter: Int? = null

  private fun manager(): NotificationManager? {
    val context = appContext.reactContext ?: return null
    return context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
  }

  override fun definition() = ModuleDefinition {
    Name("StudyShield")

    Function("isNativeAvailable") {
      true
    }

    Function("hasNotificationPolicyAccess") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
        return@Function false
      }
      manager()?.isNotificationPolicyAccessGranted == true
    }

    Function("openNotificationPolicySettings") {
      val context = appContext.reactContext ?: return@Function
      val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("openZenSettings") {
      val context = appContext.reactContext ?: return@Function
      val intent = Intent(Settings.ACTION_ZEN_MODE_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("setSessionFilter") { enable: Boolean ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
        return@Function false
      }
      val notificationManager = manager() ?: return@Function false
      if (!notificationManager.isNotificationPolicyAccessGranted) {
        return@Function false
      }
      if (enable) {
        if (previousFilter == null) {
          previousFilter = notificationManager.currentInterruptionFilter
        }
        notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
        true
      } else {
        val restore = previousFilter ?: NotificationManager.INTERRUPTION_FILTER_ALL
        previousFilter = null
        notificationManager.setInterruptionFilter(restore)
        true
      }
    }
  }
}
