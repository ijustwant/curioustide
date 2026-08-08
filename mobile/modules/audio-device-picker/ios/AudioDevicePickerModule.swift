import ExpoModulesCore
import AVFoundation

// iOS' AVAudioSession ruter allerede pålitelig til eksterne mikrofoner via
// preferredInput, så denne modulen tilbyr kun enkel enhetsliste + valg her —
// ingen tvunget "communication device"-mekanisme trengs slik som på Android.
public class AudioDevicePickerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioDevicePicker")

    Function("getAudioInputDevices") { () -> [[String: Any]] in
      let inputs = AVAudioSession.sharedInstance().availableInputs ?? []
      return inputs.map { input in
        [
          "id": input.uid.hashValue,
          "name": input.portName,
          "type": "external",
        ]
      }
    }

    Function("setCommunicationDevice") { (deviceId: Int) -> Bool in
      let inputs = AVAudioSession.sharedInstance().availableInputs ?? []
      guard let input = inputs.first(where: { $0.uid.hashValue == deviceId }) else {
        return false
      }
      do {
        try AVAudioSession.sharedInstance().setPreferredInput(input)
        return true
      } catch {
        return false
      }
    }

    Function("clearCommunicationDevice") {
      try? AVAudioSession.sharedInstance().setPreferredInput(nil)
    }

    Function("isSupported") { () -> Bool in
      true
    }
  }
}
