const TEKST = 'Dette er en test av CuriousTide. Hvis du hører dette, fungerer lydmottaket.'

export function startTestTone(onDone?: () => void): void {
  if (!window.speechSynthesis) { onDone?.(); return }
  window.speechSynthesis.cancel()
  const ytring = new SpeechSynthesisUtterance(TEKST)
  ytring.lang = 'nb-NO'
  ytring.rate = 0.95
  if (onDone) ytring.onend = onDone
  window.speechSynthesis.speak(ytring)
}

export function stopTestTone(): void {
  window.speechSynthesis?.cancel()
}
