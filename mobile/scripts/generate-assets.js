const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

// Create PNG from raw RGBA pixel array (w x h x 4 bytes)
function makePNGFromPixels(w, h, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6 // bit depth 8, RGBA

  const rows = []
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 4)
    row[0] = 0
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      row[1 + x * 4] = pixels[i]
      row[2 + x * 4] = pixels[i + 1]
      row[3 + x * 4] = pixels[i + 2]
      row[4 + x * 4] = pixels[i + 3]
    }
    rows.push(row)
  }
  const idat = zlib.deflateSync(Buffer.concat(rows))
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4)

  const setPixel = (x, y, r, g, b, a = 255) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return
    const i = (y * size + x) * 4
    // Alpha blend over existing
    const srcA = a / 255
    pixels[i]     = Math.round(r * srcA + pixels[i]     * (1 - srcA))
    pixels[i + 1] = Math.round(g * srcA + pixels[i + 1] * (1 - srcA))
    pixels[i + 2] = Math.round(b * srcA + pixels[i + 2] * (1 - srcA))
    pixels[i + 3] = Math.min(255, pixels[i + 3] + Math.round(a * srcA))
  }

  const fillCircle = (cx, cy, r, R, G, B, A = 255) => {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        if (dist <= r) setPixel(x, y, R, G, B, A)
        else if (dist <= r + 1) setPixel(x, y, R, G, B, Math.round(A * (r + 1 - dist)))
      }
    }
  }

  const fillRect = (x1, y1, x2, y2, R, G, B, A = 255) => {
    for (let y = y1; y <= y2; y++)
      for (let x = x1; x <= x2; x++)
        setPixel(x, y, R, G, B, A)
  }

  const s = size
  // Background: dark navy
  fillRect(0, 0, s - 1, s - 1, 9, 23, 42, 255)

  // Rounded background circle: brand blue
  fillCircle(s / 2, s / 2, s * 0.42, 14, 116, 193, 255)

  // Microphone body (capsule): white
  const micW = Math.round(s * 0.14)
  const micH = Math.round(s * 0.26)
  const micX = Math.round(s / 2)
  const micTopY = Math.round(s * 0.24)
  const micBotY = micTopY + micH

  // Mic body rectangle
  fillRect(micX - micW, micTopY + micW, micX + micW, micBotY, 255, 255, 255, 255)
  // Mic top dome
  fillCircle(micX, micTopY + micW, micW, 255, 255, 255, 255)
  // Mic bottom dome
  fillCircle(micX, micBotY, micW, 255, 255, 255, 255)

  // Stand arc (thin arc below mic)
  const arcCx = micX
  const arcCy = micBotY
  const arcR = Math.round(s * 0.185)
  const lineW = Math.round(s * 0.035)
  for (let angle = 180; angle <= 360; angle += 0.5) {
    const rad = angle * Math.PI / 180
    for (let r = arcR - lineW; r <= arcR; r++) {
      const px = Math.round(arcCx + r * Math.cos(rad))
      const py = Math.round(arcCy + r * Math.sin(rad))
      setPixel(px, py, 255, 255, 255, 255)
    }
  }

  // Vertical stand line
  const standX = micX
  const standTopY = Math.round(arcCy + arcR)
  const standBotY = Math.round(arcCy + arcR + s * 0.08)
  fillRect(standX - lineW, standTopY, standX + lineW, standBotY, 255, 255, 255, 255)

  // Horizontal base line
  const baseY = standBotY
  const baseW = Math.round(s * 0.12)
  fillRect(standX - baseW, baseY, standX + baseW, baseY + lineW * 2, 255, 255, 255, 255)

  return makePNGFromPixels(s, s, pixels)
}

const dir = path.join(__dirname, '..', 'assets')
fs.mkdirSync(dir, { recursive: true })

console.log('Genererer ikon med mikrofon...')
const icon = drawIcon(512)
fs.writeFileSync(path.join(dir, 'icon.png'), icon)
fs.writeFileSync(path.join(dir, 'adaptive-icon.png'), icon)

// Splash: plain dark background
const zlib2 = require('zlib')
const splashSize = 512
const splashPx = new Uint8Array(splashSize * splashSize * 4)
for (let i = 0; i < splashPx.length; i += 4) {
  splashPx[i] = 9; splashPx[i+1] = 23; splashPx[i+2] = 42; splashPx[i+3] = 255
}
fs.writeFileSync(path.join(dir, 'splash.png'), makePNGFromPixels(splashSize, splashSize, splashPx))

console.log('Assets generert i mobile/assets/')
