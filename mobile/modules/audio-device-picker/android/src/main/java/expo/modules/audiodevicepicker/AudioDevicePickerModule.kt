package expo.modules.audiodevicepicker

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Eksponerer Androids ekte liste over lydinnganger (AudioManager) til JS.
// @livekit/react-native-webrtc sin egen enumerateDevices() returnerer alltid
// bare én hardkodet "Audio"-oppføring for lyd på Android — den lister ikke
// faktiske fysiske enheter. Denne modulen bruker AudioManager direkte i
// stedet, og AudioManager.setCommunicationDevice() (API 31+) for å tvinge
// appen til å bruke en valgt enhet (Bluetooth, USB-C, kablet eller innebygd).
class AudioDevicePickerModule : Module() {
  private val audioManager: AudioManager
    get() = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as AudioManager

  override fun definition() = ModuleDefinition {
    Name("AudioDevicePicker")

    Function("getAudioInputDevices") {
      audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
        .filter { isRelevant(it.type) }
        .map { toMap(it) }
    }

    Function("setCommunicationDevice") { deviceId: Int ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        return@Function false
      }
      val device = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
        .firstOrNull { it.id == deviceId } ?: return@Function false
      audioManager.setCommunicationDevice(device)
    }

    Function("clearCommunicationDevice") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        audioManager.clearCommunicationDevice()
      }
    }

    Function("isSupported") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
    }
  }

  private fun isRelevant(type: Int): Boolean = when (type) {
    AudioDeviceInfo.TYPE_BUILTIN_MIC,
    AudioDeviceInfo.TYPE_WIRED_HEADSET,
    AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
    AudioDeviceInfo.TYPE_USB_DEVICE,
    AudioDeviceInfo.TYPE_USB_HEADSET,
    AudioDeviceInfo.TYPE_USB_ACCESSORY,
    AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> true
    else -> Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
      (type == AudioDeviceInfo.TYPE_BLE_HEADSET || type == AudioDeviceInfo.TYPE_BLE_SPEAKER)
  }

  private fun typeName(type: Int): String = when (type) {
    AudioDeviceInfo.TYPE_BUILTIN_MIC -> "builtin"
    AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "wired"
    AudioDeviceInfo.TYPE_USB_DEVICE, AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_USB_ACCESSORY -> "usb"
    AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "bluetooth"
    else -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
      (type == AudioDeviceInfo.TYPE_BLE_HEADSET || type == AudioDeviceInfo.TYPE_BLE_SPEAKER)
    ) "bluetooth" else "other"
  }

  private fun toMap(device: AudioDeviceInfo): Map<String, Any> {
    val productName = device.productName?.toString()?.trim()
    val label = if (!productName.isNullOrBlank() && productName != "?") productName else typeName(device.type)
    return mapOf(
      "id" to device.id,
      "name" to label,
      "type" to typeName(device.type),
    )
  }
}
