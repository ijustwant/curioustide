#!/usr/bin/env python3
"""
CuriousTide – Raspberry Pi lytter
Kobler til serveren og spiller lyd fra kanalen ut på linjeutgangen.
Innstillinger leses fra config.json og kan endres via http://<pi-ip>:8080

Installasjon:
    pip install livekit httpx sounddevice numpy flask

Kjøring:
    python listen.py
"""

import asyncio
import json
import logging
import os
import socket
import subprocess
import sys
import threading
import numpy as np
import sounddevice as sd
import httpx
from livekit import rtc
from flask import Flask, jsonify, request, render_template_string

sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

# ── Konfigurasjon ──────────────────────────────────────────────────────────────
_SKRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_KONFIG_FIL = os.path.join(_SKRIPT_DIR, "config.json")

_STD = {
    "server":   "http://192.168.50.10",
    "email":    "test@example.com",
    "password": "testpass123",
    "kanal_id": "0PPUF9",
}

def _les_konfig() -> dict:
    if os.path.exists(_KONFIG_FIL):
        with open(_KONFIG_FIL) as f:
            return {**_STD, **json.load(f)}
    return dict(_STD)

def _skriv_konfig(oppdatering: dict):
    konfig = _les_konfig()
    konfig.update(oppdatering)
    with open(_KONFIG_FIL, "w") as f:
        json.dump(konfig, f, indent=2, ensure_ascii=False)

_k = _les_konfig()
SERVER      = _k.get("server",   _STD["server"])
EMAIL       = _k.get("email",    _STD["email"])
PASSWORD    = _k.get("password", _STD["password"])
KANAL_ID    = _k.get("kanal_id", _STD["kanal_id"])
SAMPLE_RATE = 48000
KANALER     = 1
LYDKORT     = None          # None = standard lydutgang
INNST_PORT  = 8080
# ──────────────────────────────────────────────────────────────────────────────


def _lokal_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "ukjent-ip"


# ── Innstillingsserver (kjører i bakgrunnen på port 8080) ─────────────────────

_innst_app = Flask("innstillinger")
logging.getLogger("werkzeug").setLevel(logging.ERROR)

_INNST_HTML = r"""<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>CuriousTide – Innstillinger</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:#020617; --surface:#0f172a; --card:#1e293b; --border:#334155;
    --text:#f1f5f9; --muted:#64748b; --blue:#0284c7; --blue-h:#0369a1;
    --green:#22c55e; --red:#ef4444;
  }
  body {
    background:var(--bg); color:var(--text);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    min-height:100dvh; display:flex; flex-direction:column;
    align-items:center; padding:24px 16px 60px;
  }
  header { text-align:center; margin-bottom:24px; width:100%; max-width:480px; }
  .logo { display:inline-flex; align-items:center; gap:10px; margin-bottom:4px; }
  .logo-ikon {
    width:38px; height:38px; background:var(--blue);
    border-radius:10px; display:flex; align-items:center;
    justify-content:center; font-size:18px;
  }
  .logo-tekst { font-size:22px; font-weight:700; }
  .sub { color:var(--muted); font-size:13px; }
  .kort {
    background:var(--surface); border:1px solid var(--border);
    border-radius:20px; padding:20px; width:100%; max-width:480px; margin-bottom:14px;
  }
  .kort-tittel {
    font-size:12px; font-weight:600; color:var(--muted);
    text-transform:uppercase; letter-spacing:.06em; margin-bottom:14px;
  }
  label { display:block; font-size:13px; color:var(--muted); margin-bottom:6px; }
  .felt { margin-bottom:14px; }
  .input-wrap { position:relative; }
  input[type=text],input[type=password],input[type=url],input[type=email] {
    width:100%; background:var(--card); border:1px solid var(--border);
    border-radius:12px; padding:14px 16px; color:var(--text);
    font-size:16px; outline:none; transition:border-color .15s;
    -webkit-appearance:none;
  }
  input:focus { border-color:var(--blue); }
  input::placeholder { color:var(--muted); }
  .øye {
    position:absolute; right:14px; top:50%; transform:translateY(-50%);
    background:none; border:none; color:var(--muted);
    font-size:18px; cursor:pointer; padding:4px; line-height:1;
  }
  .kanal-input {
    text-transform:uppercase; letter-spacing:4px;
    font-weight:700; font-size:20px;
  }
  hr { border:none; border-top:1px solid var(--border); margin:16px 0; }
  .knapp {
    width:100%; padding:16px; color:#fff; border:none;
    border-radius:14px; font-size:17px; font-weight:700;
    cursor:pointer; transition:background .15s, transform .1s; margin-top:4px;
  }
  .knapp-blå { background:var(--blue); }
  .knapp-blå:hover { background:var(--blue-h); }
  .knapp-rød { background:#991b1b; margin-top:10px; }
  .knapp-rød:hover { background:#7f1d1d; }
  .knapp:active { transform:scale(.98); }
  .knapp:disabled { opacity:.6; cursor:default; }
  .melding {
    display:none; padding:14px 16px; border-radius:12px;
    font-size:14px; margin-top:12px; line-height:1.5;
  }
  .melding.feil    { background:#450a0a; color:#fca5a5; border:1px solid #7f1d1d; display:block; }
  .melding.suksess { background:#052e16; color:#86efac; border:1px solid #14532d; display:block; }
  .status-boks {
    background:#0c1a2e; border:1px solid #1e3a5f; border-radius:12px;
    padding:12px 14px; font-size:13px; color:#93c5fd; line-height:1.6;
    margin-bottom:14px;
  }
  .status-boks strong { color:var(--text); }
</style>
</head>
<body>
<header>
  <div class="logo">
    <div class="logo-ikon">🎙️</div>
    <span class="logo-tekst">CuriousTide</span>
  </div>
  <div class="sub">Innstillinger</div>
</header>

<div class="status-boks">
  <strong>Status:</strong> Lytter aktivt<br>
  <strong>Server:</strong> {{ server }}<br>
  <strong>Kanal-ID:</strong> {{ kanal_id }}<br>
  <strong>E-post:</strong> {{ email }}
</div>

<div class="kort">
  <div class="kort-tittel">CuriousTide-innstillinger</div>

  <div class="felt">
    <label for="server-url">Server-adresse</label>
    <input type="url" id="server-url" value="{{ server }}" placeholder="http://192.168.50.10">
  </div>

  <div class="felt">
    <label for="inn-email">E-postadresse</label>
    <input type="email" id="inn-email" value="{{ email }}" placeholder="bruker@eksempel.no">
  </div>

  <div class="felt">
    <label for="inn-passord">Passord <span style="color:var(--muted);font-size:11px;">(la stå tomt for å beholde)</span></label>
    <div class="input-wrap">
      <input type="password" id="inn-passord" placeholder="••••••••">
      <button class="øye" onclick="toggleVis()" id="øye-knapp">👁</button>
    </div>
  </div>

  <hr>

  <div class="felt">
    <label for="kanal-id">Kanal-ID</label>
    <input type="text" id="kanal-id" value="{{ kanal_id }}"
           class="kanal-input" maxlength="10" placeholder="0PPUF9">
  </div>

  <button class="knapp knapp-blå" id="lagre-knapp" onclick="lagre()">
    Lagre og start på nytt
  </button>
  <div id="melding" class="melding"></div>
</div>

<div class="kort">
  <div class="kort-tittel">WiFi-konfigurasjon</div>
  <p style="color:var(--muted);font-size:14px;margin-bottom:14px;line-height:1.5;">
    Bytt til aksesspunkt-modus for å endre WiFi-nettverk.
    Enheten vil slutte å spille lyd midlertidig.
  </p>
  <button class="knapp knapp-rød" onclick="byttTilAP()">
    Bytt WiFi-nettverk…
  </button>
  <div id="ap-melding" class="melding"></div>
</div>

<div class="kort">
  <div class="kort-tittel">Strøm</div>
  <p style="color:var(--muted);font-size:14px;margin-bottom:14px;line-height:1.5;">
    Slår av enheten trygt. Vent til all aktivitet stopper før du tar ut strømmen.
  </p>
  <button class="knapp" style="background:#374151;" onclick="slåAv()">
    Slå av enhet…
  </button>
  <div id="av-melding" class="melding"></div>
</div>

<script>
function toggleVis() {
  const f = document.getElementById("inn-passord");
  const e = document.getElementById("øye-knapp");
  f.type = f.type === "password" ? "text" : "password";
  e.textContent = f.type === "password" ? "👁" : "🙈";
}

function visMelding(id, tekst, type) {
  const el = document.getElementById(id);
  el.textContent = tekst;
  el.className = "melding" + (type ? " " + type : "");
}

async function lagre() {
  const knapp = document.getElementById("lagre-knapp");
  knapp.disabled = true;
  knapp.textContent = "Lagrer…";
  visMelding("melding", "", "");

  try {
    const res = await fetch("/lagre", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        server:   document.getElementById("server-url").value.trim(),
        email:    document.getElementById("inn-email").value.trim(),
        password: document.getElementById("inn-passord").value,
        kanal_id: document.getElementById("kanal-id").value.trim().toUpperCase(),
      }),
    });
    const data = await res.json();
    if (data.ok) {
      visMelding("melding",
        "✓ Lagret! Enheten starter om noen sekunder med nye innstillinger.", "suksess");
    } else {
      visMelding("melding", data.melding || "Feil ved lagring.", "feil");
      knapp.disabled = false;
      knapp.textContent = "Lagre og start på nytt";
    }
  } catch {
    visMelding("melding", "Kunne ikke nå serveren.", "feil");
    knapp.disabled = false;
    knapp.textContent = "Lagre og start på nytt";
  }
}

async function byttTilAP() {
  if (!confirm("Enheten slutter å spille lyd og starter WiFi-oppsett. Fortsette?")) return;
  try {
    await fetch("/bytt-til-ap", { method: "POST" });
    visMelding("ap-melding",
      "Starter aksesspunkt… Koble til «CuriousTide-Setup» (passord: curioustide).", "suksess");
  } catch {
    visMelding("ap-melding", "Feil – prøv igjen.", "feil");
  }
}

async function slåAv() {
  if (!confirm("Slå av enheten? Vent til all aktivitet stopper før du tar ut strømmen.")) return;
  try {
    await fetch("/slå-av", { method: "POST" });
    visMelding("av-melding", "Enheten slås av… Du kan ta ut strømmen om ca. 30 sekunder.", "suksess");
  } catch {
    visMelding("av-melding", "Feil – prøv igjen.", "feil");
  }
}
</script>
</body>
</html>
"""


@_innst_app.route("/")
def _innst_index():
    konfig = _les_konfig()
    return render_template_string(_INNST_HTML,
        server=konfig.get("server", ""),
        email=konfig.get("email", ""),
        kanal_id=konfig.get("kanal_id", ""),
    )


@_innst_app.route("/lagre", methods=["POST"])
def _innst_lagre():
    data = request.get_json() or {}
    oppdatering = {}
    if data.get("server"):
        oppdatering["server"]   = data["server"].strip().rstrip("/")
    if data.get("email"):
        oppdatering["email"]    = data["email"].strip()
    if data.get("password"):
        oppdatering["password"] = data["password"]
    if data.get("kanal_id"):
        oppdatering["kanal_id"] = data["kanal_id"].strip().upper()
    _skriv_konfig(oppdatering)
    threading.Thread(target=_restart_listen, daemon=True).start()
    return jsonify({"ok": True})


@_innst_app.route("/bytt-til-ap", methods=["POST"])
def _bytt_til_ap():
    threading.Thread(target=_start_wifi_setup, daemon=True).start()
    return jsonify({"ok": True})


@_innst_app.route("/slå-av", methods=["POST"])
def _slå_av():
    threading.Thread(target=_shutdown, daemon=True).start()
    return jsonify({"ok": True})


def _restart_listen():
    import time
    time.sleep(1)
    os.execvp(sys.executable, [sys.executable, os.path.abspath(__file__)])


def _start_wifi_setup():
    import time
    time.sleep(1)
    setup_sti = os.path.join(_SKRIPT_DIR, "wifi_setup.py")
    os.execvp(sys.executable, [sys.executable, setup_sti])


def _shutdown():
    import time
    time.sleep(1)
    subprocess.run(["shutdown", "-h", "now"])


def _kjor_innstillingsserver():
    _innst_app.run(host="0.0.0.0", port=INNST_PORT, debug=False)


# ── Lyd-streaming ─────────────────────────────────────────────────────────────

async def hent_livekit_token() -> tuple[str, str]:
    async with httpx.AsyncClient() as klient:
        svar = await klient.post(
            f"{SERVER}/api/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
            timeout=10,
        )
        svar.raise_for_status()
        jwt = svar.json()["token"]

        svar = await klient.post(
            f"{SERVER}/api/channels/join/{KANAL_ID}",
            headers={"Authorization": f"Bearer {jwt}"},
            timeout=10,
        )
        svar.raise_for_status()
        data = svar.json()
        return data["token"], data.get("channelName", KANAL_ID)


async def les_lydspor(spor: rtc.AudioTrack, kø: "asyncio.Queue[np.ndarray]") -> None:
    lydstrøm = rtc.AudioStream(spor, sample_rate=SAMPLE_RATE, num_channels=KANALER)
    async for hendelse in lydstrøm:
        ramme = hendelse.frame
        pcm = np.frombuffer(bytes(ramme.data), dtype=np.int16).copy()
        try:
            kø.put_nowait(pcm)
        except asyncio.QueueFull:
            pass


async def main() -> None:
    # Start innstillingsserver i bakgrunnen
    threading.Thread(target=_kjor_innstillingsserver, daemon=True).start()
    ip = _lokal_ip()
    print(f"\n{'═'*50}")
    print(f"  Innstillinger: http://{ip}:{INNST_PORT}")
    print(f"{'═'*50}\n")

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

    try:
        with sd.OutputStream(
            samplerate=SAMPLE_RATE,
            channels=KANALER,
            dtype="int16",
            blocksize=960,
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
