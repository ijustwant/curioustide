import { registerWebModule, NativeModule } from 'expo'

import type { AudioDevice } from './AudioDevicePicker.types'

class AudioDevicePickerModule extends NativeModule<{}> {
  getAudioInputDevices(): AudioDevice[] {
    return []
  }
  setCommunicationDevice(_deviceId: number): boolean {
    return false
  }
  clearCommunicationDevice(): void {}
  isSupported(): boolean {
    return false
  }
}

export default registerWebModule(AudioDevicePickerModule, 'AudioDevicePickerModule')
