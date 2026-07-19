/**
 * generate-icons.js
 * Run once to create placeholder PNG icons for SmartEGE.
 * Usage: node generate-icons.js
 *
 * Requires: npm install canvas  (only for this script)
 * Or use any image editor to create 16x16, 48x48, 128x128 PNGs in public/icons/
 */

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const SIZES = [16, 48, 128]
const OUT_DIR = path.join(__dirname, 'public', 'icons')

fs.mkdirSync(OUT_DIR, { recursive: true })

SIZES.forEach((size) => {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background — purple gradient
  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, '#6c47ff')
  grad.addColorStop(1, '#a855f7')
  ctx.fillStyle = grad

  // Rounded rect
  const r = size * 0.2
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fill()

  // Lamp emoji / bulb shape
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${size * 0.6}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('💡', size / 2, size / 2)

  const buffer = canvas.toBuffer('image/png')
  const outPath = path.join(OUT_DIR, `icon${size}.png`)
  fs.writeFileSync(outPath, buffer)
  console.log(`✅ Created ${outPath}`)
})

console.log('\nDone! Icons saved to public/icons/')
