#!/bin/bash
# Kjøres én gang på serveren for å hente første SSL-sertifikat fra Let's Encrypt.
# Forutsetter at DNS A-post for curioustide.no (og evt. curioustide.com) peker til serverens offentlige IP.

set -e

DOMAIN="curioustide.no"
DOMAIN2="curioustide.com"
EMAIL="tommylarsen40@gmail.com"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "==> Oppretter midlertidig sjølvsignert sertifikat for $DOMAIN så nginx kan starte..."
$COMPOSE run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out    /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj   '/CN=localhost'" certbot

echo "==> Oppretter midlertidig sjølvsignert sertifikat for $DOMAIN2..."
$COMPOSE run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN2/privkey.pem \
    -out    /etc/letsencrypt/live/$DOMAIN2/fullchain.pem \
    -subj   '/CN=localhost'" certbot

echo "==> Starter nginx..."
$COMPOSE up -d nginx

echo "==> Henter ekte sertifikat for $DOMAIN fra Let's Encrypt..."
$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL \
    -d $DOMAIN -d www.$DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal" certbot

echo "==> Henter ekte sertifikat for $DOMAIN2 fra Let's Encrypt..."
$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL \
    -d $DOMAIN2 -d www.$DOMAIN2 \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal" certbot

echo "==> Laster nginx på nytt med ekte sertifikat..."
$COMPOSE exec nginx nginx -s reload

echo ""
echo "Ferdig! Begge domener er nå klare med SSL."
echo "  $DOMAIN (norsk) og $DOMAIN2 (engelsk)"
echo "Start resten av tjenestene med:"
echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
