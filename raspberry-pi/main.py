#!/usr/bin/env python3
"""
CuriousTide – Oppstartsbehandler
Sjekker WiFi-status og starter enten WiFi-oppsett eller lyttemodus.
Kjøres automatisk av systemd ved oppstart.
"""

import json
import os
import subprocess
import sys
import time

SKRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
KONFIG_FIL = os.path.join(SKRIPT_DIR, "config.json")
VENTETID   = 10     # sekunder å vente på at nettverket initialiseres


def er_tilkoblet() -> bool:
    res = subprocess.run(
        ["nmcli", "-t", "-f", "STATE", "general"],
        capture_output=True, text=True,
    )
    return "connected" in res.stdout.lower()


def les_wifi_konfig() -> dict | None:
    if not os.path.exists(KONFIG_FIL):
        return None
    with open(KONFIG_FIL) as f:
        data = json.load(f)
    return data if data.get("wifi_ssid") else None


def start_script(navn: str):
    sti = os.path.join(SKRIPT_DIR, navn)
    print(f"Starter {navn}...")
    os.execvp(sys.executable, [sys.executable, sti])


def main():
    print(f"\n{'═'*50}")
    print("  CuriousTide – starter")
    print(f"{'═'*50}\n")

    # Vent på at nettverksstack er oppe
    print(f"Venter {VENTETID}s på nettverksinitialisering...")
    time.sleep(VENTETID)

    wifi_konfig = les_wifi_konfig()

    if wifi_konfig and er_tilkoblet():
        ssid = wifi_konfig.get("wifi_ssid", "ukjent")
        print(f"✓ Tilkoblet WiFi «{ssid}» – starter lyttemodus")
        start_script("listen.py")
    else:
        if wifi_konfig:
            print(f"⚠ Lagret nettverk «{wifi_konfig.get('wifi_ssid')}» ikke tilgjengelig")
        else:
            print("ℹ Ingen WiFi-konfigurasjon funnet")
        print("→ Starter WiFi-oppsettmodus\n")
        start_script("wifi_setup.py")


if __name__ == "__main__":
    main()
