import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'

let sound: Audio.Sound | null = null
let interval: ReturnType<typeof setInterval> | null = null

function generateToneWavBase64(freqHz: number, durationMs: number): string {
  const sampleRate = 8000
  const numSamples = Math.floor((sampleRate * durationMs) / 1000)
  const blockAlign = 2 // 16-bit mono
  const dataSize = numSamples * blockAlign
  const buf = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buf)

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)   // PCM
  view.setUint16(22, 1, true)   // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataSize, true)

  for (let i = 0; i < numSamples; i++) {
    const v = Math.sin((2 * Math.PI * freqHz * i) / sampleRate) * 0.5
    view.setInt16(44 + i * 2, Math.round(v * 32767), true)
  }

  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

async function writeToneFile(): Promise<string> {
  const b64 = generateToneWavBase64(2000, 300)
  const path = FileSystem.cacheDirectory + 'ct_tone.wav'
  await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 })
  return path
}

export async function startTestTone(): Promise<void> {
  if (interval) return
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false })
  const path = await writeToneFile()

  const play = async () => {
    if (sound) {
      await sound.unloadAsync()
      sound = null
    }
    const { sound: s } = await Audio.Sound.createAsync({ uri: path }, { shouldPlay: true })
    sound = s
  }

  await play()
  interval = setInterval(play, 1500)
}

export async function stopTestTone(): Promise<void> {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
  if (sound) {
    await sound.unloadAsync()
    sound = null
  }
}
