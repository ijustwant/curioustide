#!/usr/bin/env python3
"""
CuriousTide – WiFi-oppsett
Starter et aksesspunkt med captive portal og webgrensesnitt for å konfigurere
WiFi og CuriousTide-innstillinger.

Krav: NetworkManager (nmcli), python3-flask
Kjøring: sudo python3 wifi_setup.py
"""

import subprocess
import json
import os
import sys
import time
import threading
import re
import shutil
from flask import Flask, jsonify, request, render_template_string, redirect

# Tving linje-bufret output slik at journalctl ser print() umiddelbart
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

# ── Konfigurasjon ──────────────────────────────────────────────────────────────
SKRIPT_DIR     = os.path.dirname(os.path.abspath(__file__))
KONFIG_FIL     = os.path.join(SKRIPT_DIR, "config.json")
AP_SSID        = "CuriousTide-Setup"
AP_PASSORD     = "curioustide"          # Min 8 tegn for WPA2
AP_GRENSESNITT = "wlan0"
WEB_PORT       = 80                     # Krever root

STANDARDKONFIG = {
    "wifi_ssid":    None,
    "wifi_passord": None,
    "server":       "http://192.168.50.10",
    "email":        "test@example.com",
    "password":     "testpass123",
    "kanal_id":     "0PPUF9",
}

IPTABLES = (
    shutil.which("iptables") or
    shutil.which("iptables-nft") or
    shutil.which("iptables-legacy")
)  # None hvis ikke installert – captive portal fungerer via DNS alene

app = Flask(__name__)


# ── Konfig-hjelpere ────────────────────────────────────────────────────────────

def les_konfig() -> dict:
    if os.path.exists(KONFIG_FIL):
        with open(KONFIG_FIL) as f:
            data = json.load(f)
        return {**STANDARDKONFIG, **data}
    return dict(STANDARDKONFIG)


def skriv_konfig(data: dict):
    with open(KONFIG_FIL, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.chmod(KONFIG_FIL, 0o600)


# ── WiFi-funksjoner ────────────────────────────────────────────────────────────

def _konfigurer_dnsmasq_portal():
    """
    Skriver en konfig til NM sin dnsmasq-shared.d som omdirigerer ALL DNS
    til Pi-en (10.42.0.1). Må kalles FØR nmcli hotspot starter, slik at
    NM sin dnsmasq-instans plukker opp filen når den lanseres.
    Effekt: telefonen slår opp 'connectivitycheck.gstatic.com' og får
    svar 10.42.0.1 → captive portal-sjekk treffer vår Flask-server.
    """
    conf_dir = "/etc/NetworkManager/dnsmasq-shared.d"
    try:
        os.makedirs(conf_dir, exist_ok=True)
        with open(os.path.join(conf_dir, "curioustide.conf"), "w") as f:
            f.write("address=/#/10.42.0.1\n")
    except PermissionError:
        print("⚠ Mangler tillatelse til å skrive dnsmasq-konfig (kjør som root)")


def start_aksesspunkt() -> bool:
    _konfigurer_dnsmasq_portal()          # MÅ gjøres FØR hotspot startes
    # Koble eksplisitt fra eksisterende WiFi-tilkobling på wlan0.
    # Uten dette vil NM auto-gjenkoble til lagret nettverk og slå
    # av hotspotet etter ~1 sekund.
    subprocess.run(["nmcli", "device", "disconnect", AP_GRENSESNITT],
                   capture_output=True)
    time.sleep(2)
    subprocess.run(["nmcli", "connection", "delete", AP_SSID],
                   capture_output=True)
    res = subprocess.run([
        "nmcli", "device", "wifi", "hotspot",
        "ifname", AP_GRENSESNITT,
        "ssid", AP_SSID,
        "password", AP_PASSORD,
    ], capture_output=True, text=True)
    if res.returncode == 0:
        time.sleep(2)   # Vent til grensesnittet er oppe
        _setup_captive_portal_iptables()
    return res.returncode == 0


def _setup_captive_portal_iptables():
    """
    Omdirigerer innkommende HTTP-trafikk (port 80) på AP-grensesnittet til
    vår webserver. Valgfritt – captive portal fungerer via DNS alene.
    """
    if not IPTABLES:
        print("ℹ iptables ikke funnet – HTTP-redirect hoppes over (DNS-redirect er aktiv)")
        return
    regel_suffiks = [
        "-i", AP_GRENSESNITT, "-p", "tcp", "--dport", "80",
        "-j", "REDIRECT", "--to-port", str(WEB_PORT),
    ]
    subprocess.run([IPTABLES, "-t", "nat", "-D", "PREROUTING"] + regel_suffiks,
                   capture_output=True)
    subprocess.run([IPTABLES, "-t", "nat", "-A", "PREROUTING"] + regel_suffiks,
                   capture_output=True)


def skann_nettverk() -> list[dict]:
    subprocess.run(["nmcli", "device", "wifi", "rescan"], capture_output=True)
    time.sleep(3)
    res = subprocess.run(
        ["nmcli", "-t", "-e", "yes", "-f",
         "SSID,SIGNAL,SECURITY,IN-USE", "device", "wifi", "list"],
        capture_output=True, text=True,
    )
    nettverk = []
    sett = set()
    for linje in res.stdout.strip().splitlines():
        deler = re.split(r"(?<!\\):", linje)
        deler = [d.replace("\\:", ":").strip() for d in deler]
        if len(deler) < 4:
            continue
        ssid = deler[0]
        if not ssid or ssid == "--" or ssid in sett:
            continue
        sett.add(ssid)
        try:
            signal = int(deler[1])
        except ValueError:
            signal = 0
        nettverk.append({
            "ssid":   ssid,
            "signal": signal,
            "sikret": bool(deler[2] and deler[2] != "--"),
            "i_bruk": deler[3] == "*",
        })
    return sorted(nettverk, key=lambda x: x["signal"], reverse=True)


def restart_som_lytter():
    time.sleep(2)
    os.execvp(sys.executable,
              [sys.executable, os.path.join(SKRIPT_DIR, "listen.py")])


# Global tilstandssporing for pågående WiFi-tilkobling
_koble_status: dict = {"fase": "idle", "melding": ""}


def _koble_bakgrunn(ssid: str, passord: str):
    """
    Kjøres i bakgrunnen etter at HTTP-respons er sendt til klienten.
    Stopper AP-et (som frigjør wlan0), kobler til nytt nettverk,
    og starter listen.py. Ved feil startes AP på nytt.
    """
    global _koble_status

    # 1. Stopp aksesspunktet – wlan0 må være ledig for klientmodus
    _koble_status = {"fase": "kobler", "melding": "Stopper aksesspunkt…"}
    # Fjern vår HTTP-redirect-regel (ikke flush alt – bevarer NM sine regler)
    if IPTABLES:
        subprocess.run([
            IPTABLES, "-t", "nat", "-D", "PREROUTING",
            "-i", AP_GRENSESNITT, "-p", "tcp", "--dport", "80",
            "-j", "REDIRECT", "--to-port", str(WEB_PORT),
        ], capture_output=True)
    subprocess.run(["nmcli", "connection", "down", AP_SSID], capture_output=True)
    subprocess.run(["nmcli", "connection", "delete", AP_SSID], capture_output=True)
    time.sleep(3)

    # 2. Fjern gammel profil for samme SSID og koble til
    _koble_status = {"fase": "kobler", "melding": f"Kobler til «{ssid}»…"}
    subprocess.run(["nmcli", "connection", "delete", ssid], capture_output=True)

    try:
        args = ["nmcli", "device", "wifi", "connect", ssid,
                "ifname", AP_GRENSESNITT]
        if passord:
            args += ["password", passord]
        print(f"→ Kjører: {' '.join(args)}")
        res = subprocess.run(args, capture_output=True, text=True, timeout=40)
        print(f"  returncode={res.returncode}")
        print(f"  stdout={res.stdout.strip()!r}")
        print(f"  stderr={res.stderr.strip()!r}")
    except subprocess.TimeoutExpired:
        print("✗ nmcli tidsavbrudd (>40s)")
        res = None

    # 3a. Suksess → lagre og start lyttemodus
    if res and res.returncode == 0:
        print(f"✓ Koblet til «{ssid}» – lagrer konfig og starter listen.py")
        konfig = les_konfig()
        konfig["wifi_ssid"]    = ssid
        konfig["wifi_passord"] = passord
        skriv_konfig(konfig)
        _koble_status = {"fase": "ok", "melding": f"Koblet til «{ssid}»!"}
        restart_som_lytter()
        return

    # 3b. Feil → start AP på nytt så brukeren kan prøve igjen
    tekst = ""
    if res:
        tekst = (res.stderr + res.stdout).strip()
        if "password" in tekst.lower() or "Secrets" in tekst:
            tekst = "Feil passord"
    print(f"✗ WiFi-tilkobling feilet: {tekst or 'ukjent feil'}")
    _koble_status = {
        "fase": "feil",
        "melding": tekst or "Tilkobling feilet – ukjent feil",
    }
    time.sleep(2)
    start_aksesspunkt()


def _koble_bakgrunn_sikker(ssid: str, passord: str):
    try:
        _koble_bakgrunn(ssid, passord)
    except Exception as e:
        print(f"✗ Uventet feil i bakgrunnstråd: {e}", flush=True)
        import traceback; traceback.print_exc()
        time.sleep(2)
        start_aksesspunkt()


def _start_koble_bakgrunn(ssid: str, passord: str):
    threading.Thread(target=_koble_bakgrunn_sikker, args=(ssid, passord),
                     daemon=True).start()


# ── Captive portal + API ───────────────────────────────────────────────────────

PORTAL_URL = "http://10.42.0.1/"

@app.before_request
def captive_portal_fange_alt():
    """
    Fanger opp ALLE HTTP-forespørsler som ikke er API-kall eller hjemmesiden.
    Dette inkluderer:
      - iOS:     GET /hotspot-detect.html  (Host: captive.apple.com)
      - Android: GET /generate_204         (Host: connectivitycheck.gstatic.com)
      - Windows: GET /connecttest.txt      (Host: www.msftconnecttest.com)
    Med dnsmasq DNS-redirect peker alle disse domenene til oss, og vi
    omdirigerer til oppsettssiden. Telefonen tolker dette som captive portal.
    """
    if request.path == "/" or request.path.startswith("/api/"):
        return None   # La hjemmesiden og API-kall passere
    return redirect(PORTAL_URL, code=302)


@app.route("/")
def index():
    return render_template_string(HTML)


@app.route("/api/skann")
def api_skann():
    return jsonify(skann_nettverk())


@app.route("/api/koble-til", methods=["POST"])
def api_koble_til():
    data    = request.get_json() or {}
    ssid    = (data.get("ssid") or "").strip()
    passord = (data.get("passord") or "").strip()
    if not ssid:
        return jsonify({"ok": False, "melding": "SSID mangler"}), 400

    # Start tilkobling i bakgrunnen og returner med en gang.
    # AP stopper etter at klienten har mottatt denne responsen.
    _start_koble_bakgrunn(ssid, passord)
    return jsonify({
        "ok": True,
        "pending": True,
        "melding": (
            f"Kobler til «{ssid}»… Aksesspunktet slår seg av om noen sekunder. "
            "Koble tilbake til ditt vanlige WiFi. "
            "Hvis noe gikk galt starter aksesspunktet igjen."
        ),
    })


@app.route("/api/koble-status")
def api_koble_status():
    return jsonify(_koble_status)


@app.route("/api/innstillinger", methods=["GET"])
def api_hent_innstillinger():
    konfig = les_konfig()
    return jsonify({
        "server":   konfig.get("server", ""),
        "email":    konfig.get("email", ""),
        "kanal_id": konfig.get("kanal_id", ""),
    })


@app.route("/api/innstillinger", methods=["POST"])
def api_lagre_innstillinger():
    data   = request.get_json() or {}
    konfig = les_konfig()
    if data.get("server"):
        konfig["server"]   = data["server"].strip().rstrip("/")
    if data.get("email"):
        konfig["email"]    = data["email"].strip()
    if data.get("password"):
        konfig["password"] = data["password"]
    if data.get("kanal_id"):
        konfig["kanal_id"] = data["kanal_id"].strip().upper()
    skriv_konfig(konfig)
    return jsonify({"ok": True, "melding": "Innstillinger lagret"})


# ── HTML / CSS / JS ────────────────────────────────────────────────────────────

HTML = r"""<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>CuriousTide – Oppsett</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:      #020617;
    --surface: #0f172a;
    --card:    #1e293b;
    --border:  #334155;
    --text:    #f1f5f9;
    --muted:   #64748b;
    --blue:    #0284c7;
    --blue-h:  #0369a1;
    --green:   #22c55e;
    --red:     #ef4444;
    --yellow:  #eab308;
  }
  body {
    background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    min-height: 100dvh;
    display: flex; flex-direction: column; align-items: center;
    padding: 20px 16px 60px;
  }
  /* ── Topptekst ── */
  header { text-align: center; margin-bottom: 22px; width: 100%; max-width: 480px; }
  .logo { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 4px; }
  .logo-ikon {
    width: 38px; height: 38px; background: var(--blue);
    border-radius: 10px; display: flex; align-items: center;
    justify-content: center; font-size: 18px;
  }
  .logo-tekst { font-size: 22px; font-weight: 700; }
  .undertittel { color: var(--muted); font-size: 13px; }
  /* ── Faner ── */
  .faner {
    display: flex; gap: 4px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; padding: 4px;
    width: 100%; max-width: 480px; margin-bottom: 16px;
  }
  .fane-knapp {
    flex: 1; padding: 10px; border: none; background: none;
    color: var(--muted); font-size: 14px; font-weight: 600;
    border-radius: 10px; cursor: pointer; transition: all .15s;
  }
  .fane-knapp.aktiv { background: var(--blue); color: #fff; }
  /* ── Paneler ── */
  .panel { display: none; width: 100%; max-width: 480px; }
  .panel.vis { display: block; }
  /* ── Kort ── */
  .kort {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px; padding: 20px; width: 100%; margin-bottom: 14px;
  }
  .kort-tittel {
    font-size: 12px; font-weight: 600; color: var(--muted);
    text-transform: uppercase; letter-spacing: .06em;
    margin-bottom: 14px;
    display: flex; align-items: center; justify-content: space-between;
  }
  /* ── Nettverk ── */
  #nettverk-liste { display: flex; flex-direction: column; gap: 8px; }
  .nett-kort {
    display: flex; align-items: center; gap: 12px;
    padding: 13px 14px; background: var(--card);
    border: 1px solid var(--border); border-radius: 14px;
    cursor: pointer; transition: border-color .15s, background .15s;
    -webkit-tap-highlight-color: transparent;
  }
  .nett-kort:hover, .nett-kort.valgt { border-color: var(--blue); background: #0c2340; }
  .nett-kort.valgt { box-shadow: 0 0 0 1px var(--blue); }
  .nett-info { flex: 1; min-width: 0; }
  .nett-ssid {
    font-weight: 600; font-size: 15px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .nett-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .signal { display: flex; align-items: flex-end; gap: 3px; height: 18px; }
  .signal span { display: inline-block; width: 5px; border-radius: 2px; background: var(--border); }
  .signal span:nth-child(1) { height: 5px; }
  .signal span:nth-child(2) { height: 9px; }
  .signal span:nth-child(3) { height: 13px; }
  .signal span:nth-child(4) { height: 18px; }
  .lås { font-size: 14px; color: var(--muted); }
  /* ── Skann-knapp ── */
  #skann-knapp {
    background: none; border: none; color: var(--blue);
    font-size: 13px; font-weight: 600; cursor: pointer;
    padding: 2px 6px; border-radius: 6px; transition: background .15s;
  }
  #skann-knapp:hover { background: #0c2340; }
  #skann-knapp:disabled { opacity: .5; cursor: default; }
  /* ── Spinner ── */
  .spinner {
    display: inline-block; border-radius: 50%;
    border: 2px solid var(--border); border-top-color: var(--blue);
    animation: spin .7s linear infinite;
    width: 18px; height: 18px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .tom-melding { color: var(--muted); font-size: 14px; text-align: center; padding: 16px 0; }
  /* ── Skjema ── */
  label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px; }
  .felt { margin-bottom: 14px; }
  .input-wrap { position: relative; }
  input[type=text], input[type=password], input[type=url], input[type=email] {
    width: 100%; background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 14px 16px; color: var(--text);
    font-size: 16px; outline: none; transition: border-color .15s;
    -webkit-appearance: none;
  }
  input:focus { border-color: var(--blue); }
  input[readonly] { color: var(--muted); }
  input::placeholder { color: var(--muted); }
  .øye {
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: var(--muted);
    font-size: 18px; cursor: pointer; padding: 4px; line-height: 1;
  }
  /* ── Knapper ── */
  .hoved-knapp {
    width: 100%; padding: 16px; color: #fff; border: none;
    border-radius: 14px; font-size: 17px; font-weight: 700;
    cursor: pointer; transition: background .15s, transform .1s; margin-top: 4px;
    background: var(--blue);
  }
  .hoved-knapp:hover:not(:disabled) { background: var(--blue-h); }
  .hoved-knapp:active:not(:disabled) { transform: scale(.98); }
  .hoved-knapp:disabled { opacity: .6; cursor: default; }
  .hoved-knapp.grønn { background: #15803d; }
  .hoved-knapp.grønn:hover:not(:disabled) { background: #166534; }
  /* ── Meldinger ── */
  .melding {
    display: none; padding: 14px 16px; border-radius: 12px;
    font-size: 14px; margin-top: 12px; line-height: 1.5;
  }
  .melding.feil    { background: #450a0a; color: #fca5a5; border: 1px solid #7f1d1d; display: block; }
  .melding.suksess { background: #052e16; color: #86efac; border: 1px solid #14532d; display: block; }
  /* ── Manuell SSID ── */
  #manuell-toggle {
    background: none; border: none; color: var(--blue);
    font-size: 13px; cursor: pointer;
    margin-top: 8px; padding: 0; display: block; width: 100%; text-align: center;
  }
  #manuell-ssid-felt { display: none; margin-bottom: 14px; }
  /* ── Suksess-overlegg ── */
  #suksess-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(2,6,23,.93);
    align-items: center; justify-content: center;
    flex-direction: column; gap: 16px;
    text-align: center; padding: 32px; z-index: 100;
  }
  #suksess-overlay.vis { display: flex; }
  .suksess-ikon { font-size: 64px; }
  .suksess-tittel { font-size: 22px; font-weight: 700; }
  .suksess-tekst {
    color: var(--muted); font-size: 15px;
    line-height: 1.6; max-width: 320px; white-space: pre-line;
  }
  .suksess-spinner { width: 32px; height: 32px; border-width: 3px; margin-top: 8px; }
  /* ── Info-boks ── */
  .info-boks {
    background: #0c1a2e; border: 1px solid #1e3a5f; border-radius: 12px;
    padding: 12px 14px; font-size: 13px; color: #93c5fd;
    margin-bottom: 14px; line-height: 1.5; width: 100%; max-width: 480px;
  }
  .info-boks strong { color: var(--text); }
  hr.skillelinje { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
</style>
</head>
<body>

<header>
  <div class="logo">
    <div class="logo-ikon">🎙️</div>
    <span class="logo-tekst">CuriousTide</span>
  </div>
  <div class="undertittel">Enhetskonfigurasjon</div>
</header>

<!-- Faner -->
<div class="faner">
  <button class="fane-knapp aktiv" onclick="byttFane('wifi', this)">📶&nbsp;WiFi</button>
  <button class="fane-knapp" onclick="byttFane('innstillinger', this)">⚙️&nbsp;Innstillinger</button>
</div>

<!-- ═══════════════ WiFi-PANEL ═══════════════ -->
<div id="panel-wifi" class="panel vis">

  <div class="info-boks">
    Du er koblet til <strong>CuriousTide-Setup</strong>.
    Velg nettverket enheten skal bruke og skriv inn passordet.
  </div>

  <div class="kort">
    <div class="kort-tittel">
      Tilgjengelige nettverk
      <button id="skann-knapp" onclick="skann()">⟳ Skann</button>
    </div>
    <div id="nettverk-liste">
      <div class="tom-melding">Søker etter nettverk…</div>
    </div>
    <button id="manuell-toggle" onclick="toggleManuell()">Skriv inn SSID manuelt</button>
  </div>

  <div class="kort">
    <div class="kort-tittel">Tilkoblingsdetaljer</div>

    <div class="felt" id="manuell-ssid-felt">
      <label for="manuell-ssid">Nettverksnavn (SSID)</label>
      <input type="text" id="manuell-ssid" placeholder="MinRuter" oninput="oppdaterKobleKnapp()">
    </div>

    <div class="felt">
      <label>Valgt nettverk</label>
      <input type="text" id="valgt-ssid" placeholder="Ingen valgt" readonly>
    </div>

    <div class="felt">
      <label for="wifi-passord">Passord</label>
      <div class="input-wrap">
        <input type="password" id="wifi-passord" placeholder="WiFi-passord"
               oninput="oppdaterKobleKnapp()"
               onkeydown="if(event.key==='Enter')koble()">
        <button class="øye" onclick="toggleVis('wifi-passord','øye1')" id="øye1">👁</button>
      </div>
    </div>

    <button id="koble-knapp" class="hoved-knapp" onclick="koble()" disabled>Koble til</button>
    <div id="wifi-melding" class="melding"></div>
  </div>

</div>

<!-- ═══════════════ INNSTILLINGER-PANEL ═══════════════ -->
<div id="panel-innstillinger" class="panel">

  <div class="info-boks">
    Disse innstillingene brukes av enheten for å logge inn på CuriousTide-serveren
    og koble til riktig lydkanal.
  </div>

  <div class="kort">
    <div class="kort-tittel">Server og konto</div>

    <div class="felt">
      <label for="server-url">Server-adresse</label>
      <input type="url" id="server-url" placeholder="http://192.168.50.10">
    </div>

    <div class="felt">
      <label for="inn-email">E-postadresse</label>
      <input type="email" id="inn-email" placeholder="bruker@eksempel.no">
    </div>

    <div class="felt">
      <label for="inn-passord">Passord <span style="color:var(--muted);font-size:11px;">(la stå tomt for å beholde)</span></label>
      <div class="input-wrap">
        <input type="password" id="inn-passord" placeholder="••••••••">
        <button class="øye" onclick="toggleVis('inn-passord','øye2')" id="øye2">👁</button>
      </div>
    </div>

    <hr class="skillelinje">

    <div class="felt">
      <label for="kanal-id">Kanal-ID</label>
      <input type="text" id="kanal-id" placeholder="F.eks. 0PPUF9"
             maxlength="10"
             style="text-transform:uppercase;letter-spacing:4px;font-weight:700;font-size:20px;">
    </div>

    <button class="hoved-knapp grønn" onclick="lagreInnstillinger()">Lagre innstillinger</button>
    <div id="inn-melding" class="melding"></div>
  </div>

</div>

<!-- Suksess-overlegg (WiFi koblet til) -->
<div id="suksess-overlay">
  <div class="suksess-ikon">✅</div>
  <div class="suksess-tittel" id="suksess-tittel">Koblet til!</div>
  <div class="suksess-tekst" id="suksess-tekst"></div>
  <div class="spinner suksess-spinner"></div>
</div>

<script>
// ── Fane-bytting ──────────────────────────────────────────────────────────────
function byttFane(id, knapp) {
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("vis"));
  document.querySelectorAll(".fane-knapp").forEach(k => k.classList.remove("aktiv"));
  document.getElementById("panel-" + id).classList.add("vis");
  knapp.classList.add("aktiv");
}

// ── Hjelpere ─────────────────────────────────────────────────────────────────
function toggleVis(inputId, knappId) {
  const f = document.getElementById(inputId);
  const e = document.getElementById(knappId);
  f.type = f.type === "password" ? "text" : "password";
  e.textContent = f.type === "password" ? "👁" : "🙈";
}

function esc(t) {
  return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
          .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function visMelding(elId, tekst, type) {
  const el = document.getElementById(elId);
  el.textContent = tekst;
  el.className = "melding" + (type ? " " + type : "");
}

function signalTekst(s) { return s>=70?"Sterk":s>=40?"Middels":"Svak"; }

// ── WiFi-skanning ─────────────────────────────────────────────────────────────
let valgtSsid   = "";
let skannerNå   = false;
let manuellModus = false;

async function skann() {
  if (skannerNå) return;
  skannerNå = true;
  const knapp = document.getElementById("skann-knapp");
  const liste = document.getElementById("nettverk-liste");
  knapp.disabled = true;
  knapp.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;vertical-align:middle;"></span>';
  liste.innerHTML = '<div class="tom-melding">Søker etter nettverk…</div>';

  try {
    const res  = await fetch("/api/skann");
    const data = await res.json();
    if (!data.length) {
      liste.innerHTML = '<div class="tom-melding">Ingen nettverk funnet – prøv igjen.</div>';
    } else {
      liste.innerHTML = data.map(n => `
        <div class="nett-kort ${valgtSsid===n.ssid?"valgt":""}"
             data-ssid="${esc(n.ssid)}" data-signal="${n.signal}"
             onclick="velgNettverk(this)">
          <div class="nett-info">
            <div class="nett-ssid">${esc(n.ssid)}${n.i_bruk?' <span style="color:var(--green);font-size:11px;"> ✓</span>':''}</div>
            <div class="nett-meta">${signalTekst(n.signal)} signal (${n.signal}%)</div>
          </div>
          <div class="signal"><span></span><span></span><span></span><span></span></div>
          <span class="lås">${n.sikret?"🔒":"🔓"}</span>
        </div>`).join("");
      fargSignal(data);
    }
  } catch {
    liste.innerHTML = '<div class="tom-melding">Skanningsfeil – prøv igjen.</div>';
  }

  knapp.disabled = false;
  knapp.innerHTML = "⟳ Skann";
  skannerNå = false;
}

function fargSignal(data) {
  document.querySelectorAll(".nett-kort").forEach((el, i) => {
    const s = data[i]?.signal ?? 0;
    const f = s>=70?"var(--green)":s>=40?"var(--yellow)":"var(--red)";
    const a = s>=70?4:s>=50?3:s>=25?2:1;
    el.querySelectorAll(".signal span").forEach((b,j) => { if(j<a) b.style.background=f; });
  });
}

function velgNettverk(el) {
  valgtSsid = el.dataset.ssid;
  document.querySelectorAll(".nett-kort").forEach(k => k.classList.remove("valgt"));
  el.classList.add("valgt");
  const f = document.getElementById("valgt-ssid");
  f.value = valgtSsid; f.style.color = "var(--text)";
  if (manuellModus) toggleManuell();
  document.getElementById("wifi-passord").focus();
  oppdaterKobleKnapp();
  visMelding("wifi-melding", "", "");
}

function toggleManuell() {
  manuellModus = !manuellModus;
  document.getElementById("manuell-ssid-felt").style.display = manuellModus ? "block" : "none";
  document.getElementById("manuell-toggle").textContent =
    manuellModus ? "Velg fra liste" : "Skriv inn SSID manuelt";
  if (manuellModus) {
    document.querySelectorAll(".nett-kort").forEach(k => k.classList.remove("valgt"));
    valgtSsid = "";
    const f = document.getElementById("valgt-ssid");
    f.value = ""; f.style.color = "";
    document.getElementById("manuell-ssid").focus();
  }
  oppdaterKobleKnapp();
}

function hentSsid() {
  return manuellModus
    ? document.getElementById("manuell-ssid").value.trim()
    : valgtSsid;
}

function oppdaterKobleKnapp() {
  document.getElementById("koble-knapp").disabled = !hentSsid();
}

async function koble() {
  const ssid    = hentSsid();
  const passord = document.getElementById("wifi-passord").value;
  if (!ssid) return;

  const knapp = document.getElementById("koble-knapp");
  knapp.disabled = true;
  knapp.innerHTML =
    '<span class="spinner" style="width:18px;height:18px;border-width:2px;vertical-align:middle;margin-right:8px;"></span>Kobler til…';
  visMelding("wifi-melding", "", "");

  try {
    const res  = await fetch("/api/koble-til", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ssid, passord }),
    });
    const data = await res.json();

    if (data.ok) {
      // Vis overlegg umiddelbart – AP slår seg av straks etter
      document.getElementById("suksess-tittel").textContent = `Kobler til «${ssid}»…`;
      document.getElementById("suksess-tekst").textContent =
        "Aksesspunktet slår seg av om noen sekunder.\n\n" +
        "Koble tilbake til ditt vanlige WiFi-nettverk.\n\n" +
        "Hvis noe gikk galt starter «CuriousTide-Setup» igjen.";
      document.getElementById("suksess-overlay").classList.add("vis");
    } else {
      visMelding("wifi-melding", data.melding || "Noe gikk galt. Prøv igjen.", "feil");
      knapp.disabled = false;
      knapp.textContent = "Koble til";
    }
  } catch {
    visMelding("wifi-melding", "Kunne ikke nå serveren. Prøv igjen.", "feil");
    knapp.disabled = false;
    knapp.textContent = "Koble til";
  }
}

// ── Innstillinger ─────────────────────────────────────────────────────────────
async function lastInnstillinger() {
  try {
    const res  = await fetch("/api/innstillinger");
    const data = await res.json();
    if (data.server)   document.getElementById("server-url").value = data.server;
    if (data.email)    document.getElementById("inn-email").value   = data.email;
    if (data.kanal_id) document.getElementById("kanal-id").value    = data.kanal_id;
  } catch {}
}

async function lagreInnstillinger() {
  const server   = document.getElementById("server-url").value.trim();
  const email    = document.getElementById("inn-email").value.trim();
  const passord  = document.getElementById("inn-passord").value;
  const kanal_id = document.getElementById("kanal-id").value.trim().toUpperCase();

  const knapp = document.querySelector("#panel-innstillinger .hoved-knapp");
  knapp.disabled = true;
  knapp.textContent = "Lagrer…";

  try {
    const res = await fetch("/api/innstillinger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ server, email, password: passord, kanal_id }),
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById("inn-passord").value = "";
      visMelding("inn-melding", "✓ " + data.melding, "suksess");
    } else {
      visMelding("inn-melding", data.melding || "Feil ved lagring.", "feil");
    }
  } catch {
    visMelding("inn-melding", "Kunne ikke nå serveren.", "feil");
  }

  knapp.disabled = false;
  knapp.textContent = "Lagre innstillinger";
  setTimeout(() => visMelding("inn-melding", "", ""), 4000);
}

// ── Oppstart ──────────────────────────────────────────────────────────────────
window.onload = () => { skann(); lastInnstillinger(); };
</script>
</body>
</html>
"""


# ── Oppstart ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\n{'═'*50}")
    print("  CuriousTide – WiFi-oppsett")
    print(f"{'═'*50}")
    print(f"\nStarter aksesspunkt «{AP_SSID}»...")

    ok = start_aksesspunkt()
    if ok:
        print(f"  ✓ Aksesspunkt klart!")
        print(f"    SSID    : {AP_SSID}")
        print(f"    Passord : {AP_PASSORD}")
        print(f"    Adresse : http://10.42.0.1")
        print(f"\n  Koble til «{AP_SSID}» og åpne nettleseren.")
        print(f"  (Telefonen åpner ofte siden automatisk via captive portal.)")
    else:
        print("  ⚠ Klarte ikke starte aksesspunkt – fortsetter uten.")

    print(f"\nWebserver kjører på port {WEB_PORT}...\n")
    app.run(host="0.0.0.0", port=WEB_PORT, debug=False)
