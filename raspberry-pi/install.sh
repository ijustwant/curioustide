#!/usr/bin/env bash
# CuriousTide – Installasjonsscript for Raspberry Pi
# Kjør som root: sudo bash install.sh
set -e

SKRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRUKER="${SUDO_USER:-pi}"

echo ""
echo "══════════════════════════════════════════════════"
echo "  CuriousTide – Pi-installasjon"
echo "══════════════════════════════════════════════════"
echo ""

# ── 1. Avhengigheter ──────────────────────────────────────────────────────────
echo "→ Installerer systemavhengigheter..."
apt-get update -q
apt-get install -y -q python3-pip python3-venv network-manager libportaudio2

# ── 2. Python-miljø ───────────────────────────────────────────────────────────
echo "→ Oppretter Python-virtuelt miljø..."
python3 -m venv "$SKRIPT_DIR/.venv"
"$SKRIPT_DIR/.venv/bin/pip" install -q --upgrade pip
"$SKRIPT_DIR/.venv/bin/pip" install -q \
    flask \
    livekit \
    httpx \
    sounddevice \
    numpy

PYTHON="$SKRIPT_DIR/.venv/bin/python3"

# ── 3. Captive portal DNS-omdirigering ───────────────────────────────────────
# Får NetworkManagers innebygde dnsmasq til å peke all DNS til Pi-en i AP-modus
echo "→ Konfigurerer captive portal DNS-omdirigering..."
mkdir -p /etc/NetworkManager/dnsmasq-shared.d
cat > /etc/NetworkManager/dnsmasq-shared.d/curioustide-portal.conf << 'EOF'
# Omdiriger all DNS til Pi-en slik at nettlesere åpner oppsettssiden automatisk
address=/#/10.42.0.1
EOF

# Aktiver dnsmasq-shared i NetworkManager
NM_CONF="/etc/NetworkManager/NetworkManager.conf"
if ! grep -q "dns=dnsmasq" "$NM_CONF" 2>/dev/null; then
    # Sjekk om [main]-seksjonen eksisterer
    if grep -q "\[main\]" "$NM_CONF"; then
        sed -i '/\[main\]/a dns=dnsmasq' "$NM_CONF"
    else
        echo -e "[main]\ndns=dnsmasq" >> "$NM_CONF"
    fi
fi

systemctl restart NetworkManager
sleep 2

# ── 4. Systemd-tjeneste ───────────────────────────────────────────────────────
echo "→ Oppretter systemd-tjeneste..."
cat > /etc/systemd/system/curioustide.service << EOF
[Unit]
Description=CuriousTide – lyd-streaming
After=network.target NetworkManager.service
Wants=NetworkManager.service

[Service]
Type=simple
ExecStart=$PYTHON $SKRIPT_DIR/main.py
WorkingDirectory=$SKRIPT_DIR
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable curioustide.service

echo ""
echo "══════════════════════════════════════════════════"
echo "  Installasjon fullført!"
echo "══════════════════════════════════════════════════"
echo ""
echo "  Start tjenesten nå:  sudo systemctl start curioustide"
echo "  Se logger:           sudo journalctl -u curioustide -f"
echo "  Stopp tjenesten:     sudo systemctl stop curioustide"
echo ""
echo "  Ved neste oppstart starter CuriousTide automatisk."
echo "  Hvis ingen WiFi er konfigurert, starter enheten som:"
echo "    Nettverk : CuriousTide-Setup"
echo "    Passord  : curioustide"
echo "    Adresse  : http://10.42.0.1"
echo ""
