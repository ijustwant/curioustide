import { NativeModule, requireNativeModule } from 'expo'

import type { AudioDevice } from './AudioDevicePicker.types'

declare class AudioDevicePickerModule extends NativeModule<{}> {
  getAudioInputDevices(): AudioDevice[]
  setCommunicationDevice(deviceId: number): boolean
  clearCommunicationDevice(): void
  isSupported(): boolean
}

export default requireNativeModule<AudioDevicePickerModule>('AudioDevicePicker')
