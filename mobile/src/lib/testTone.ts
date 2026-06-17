import * as Speech from 'expo-speech'

const TEKST = 'Dette er en test av CuriousTide. Hvis du hører dette, fungerer lydmottaket.'

export async function startTestTone(onDone?: () => void): Promise<void> {
  Speech.stop()
  Speech.speak(TEKST, { language: 'nb-NO', rate: 0.95, onDone })
}

export async function stopTestTone(): Promise<void> {
  Speech.stop()
}
