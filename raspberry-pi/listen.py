#!/usr/bin/env python3
"""
CuriousTide – Raspberry Pi lytter
Kobler til serveren og spiller lyd fra kanalen ut på linjeutgangen.

Installasjon:
    pip install livekit httpx sounddevice numpy

Kjøring:
    python listen.py
"""

import asyncio
import sys
import numpy as np
import sounddevice as sd
import httpx
from livekit import rtc

# ── Konfigurasjon ──────────────────────────────────────────────────────────────
SERVER      = "http://192.168.50.10"   # PC-ens IP (endre ved behov)
EMAIL       = "test@example.com"
PASSWORD    = "testpass123"
KANAL_ID    = "0PPUF9"                 # Kanal-ID å lytte til
SAMPLE_RATE = 48000
KANALER     = 1
# Sett til None for standard lydutgang, eller f.eks. "hw:0,0" for spesifikt kort
LYDKORT     = None
# ──────────────────────────────────────────────────────────────────────────────


async def hent_livekit_token() -> tuple[str, str]:
    """Logger inn og henter LiveKit-token for kanalen."""
    async with httpx.AsyncClient() as klient:
        # Innlogging
        svar = await klient.post(
            f"{SERVER}/api/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
            timeout=10,
        )
        svar.raise_for_status()
        jwt = svar.json()["token"]

        # Hent lytter-token via kanal-ID
        svar = await klient.post(
            f"{SERVER}/api/channels/join/{KANAL_ID}",
            headers={"Authorization": f"Bearer {jwt}"},
            timeout=10,
        )
        svar.raise_for_status()
        data = svar.json()
        return data["token"], data.get("channelName", KANAL_ID)


async def les_lydspor(spor: rtc.AudioTrack, kø: "asyncio.Queue[np.ndarray]") -> None:
    """Leser PCM-rammer fra et LiveKit-lydspor og legger dem i køen."""
    lydstrøm = rtc.AudioStream(spor, sample_rate=SAMPLE_RATE, num_channels=KANALER)
    async for hendelse in lydstrøm:
        ramme = hendelse.frame
        pcm = np.frombuffer(bytes(ramme.data), dtype=np.int16).copy()
        try:
            kø.put_nowait(pcm)
        except asyncio.QueueFull:
            pass  # dropp ramme ved buffer-overflyt heller enn å blokkere


async def main() -> None:
    print(f"Kobler til CuriousTide (kanal {KANAL_ID})...")

    try:
        lk_token, kanal_navn = await hent_livekit_token()
        print(f"Innlogget – kanal: {kanal_navn}")
    except httpx.HTTPStatusError as feil:
        print(f"HTTP-feil ved innlogging: {feil.response.status_code} {feil.response.text}")
        sys.exit(1)
    except httpx.RequestError as feil:
        print(f"Nettverksfeil: {feil}")
        sys.exit(1)

    rom = rtc.Room()
    kø: asyncio.Queue[np.ndarray] = asyncio.Queue(maxsize=30)
    oppgaver: list[asyncio.Task] = []

    @rom.on("track_subscribed")
    def ved_nytt_spor(spor, _pub, deltaker):
        if isinstance(spor, rtc.RemoteAudioTrack):
            print(f"  ▶ Lyd fra: {deltaker.identity}")
            t = asyncio.ensure_future(les_lydspor(spor, kø))
            oppgaver.append(t)

    @rom.on("track_unsubscribed")
    def ved_spor_fjernet(_spor, _pub, deltaker):
        print(f"  ■ Spor avsluttet fra: {deltaker.identity}")

    @rom.on("participant_connected")
    def ved_tilkobling(deltaker):
        print(f"  + Deltaker: {deltaker.identity}")

    @rom.on("participant_disconnected")
    def ved_frakobling(deltaker):
        print(f"  - Deltaker koblet fra: {deltaker.identity}")

    @rom.on("disconnected")
    def ved_rom_frakobling(grunn):
        print(f"Koblet fra rommet: {grunn}")

    livekit_url = SERVER.replace("http://", "ws://") + ":7880"
    await rom.connect(livekit_url, lk_token)
    print(f"Tilkoblet. Spiller lyd på linjeutgangen. Ctrl+C for å avslutte.\n")

    # Avspilling via sounddevice (blokkerende skriving i async-løkken)
    try:
        with sd.OutputStream(
            samplerate=SAMPLE_RATE,
            channels=KANALER,
            dtype="int16",
            blocksize=960,          # ~20ms ved 48 kHz – matcher Opus-rammelengde
            device=LYDKORT,
            latency="low",
        ) as strøm:
            while True:
                try:
                    pcm = await asyncio.wait_for(kø.get(), timeout=0.1)
                    strøm.write(pcm)
                except asyncio.TimeoutError:
                    pass
                except asyncio.CancelledError:
                    break
    except sd.PortAudioError as feil:
        print(f"Lydfeil: {feil}")
        print("Tips: sjekk at lydkortet er tilkoblet og tilgjengelig (aplay -l)")
    finally:
        for t in oppgaver:
            t.cancel()
        await rom.disconnect()
        print("Avsluttet.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nAvsluttet av bruker.")
