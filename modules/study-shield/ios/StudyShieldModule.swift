import ExpoModulesCore

public class StudyShieldModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StudyShield")

    Function("isNativeAvailable") {
      false
    }

    Function("hasNotificationPolicyAccess") {
      false
    }

    Function("openNotificationPolicySettings") {
      // iOS Focus modes cannot be toggled by third-party apps.
    }

    Function("openZenSettings") {
      // No equivalent system intent on iOS.
    }

    Function("setSessionFilter") { (_ enable: Bool) in
      false
    }
  }
}
