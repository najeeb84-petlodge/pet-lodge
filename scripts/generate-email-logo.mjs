/**
 * Generates public/logo-email.jpg from public/logo.jpg (the high-res source).
 * Output: 320x240 (4:3), white background, logo centred with 5% padding.
 *
 * Usage: node scripts/generate-email-logo.mjs
 */

import sharp from 'sharp'
import path  from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root      = path.resolve(__dirname, '..')

const SRC  = path.join(root, 'public', 'logo.jpg')
const DEST = path.join(root, 'public', 'logo-email.jpg')

const OUT_W   = 320
const OUT_H   = 240
const PADDING = Math.round(OUT_W * 0.05) // 5% = 16px each side

const innerW = OUT_W - PADDING * 2  // 288
const innerH = OUT_H - PADDING * 2  // 208

const output = await sharp(SRC)
  .resize(innerW, innerH, { fit: 'inside', withoutEnlargement: false })
  .toBuffer()

const meta = await sharp(output).metadata()
const left = Math.round((OUT_W - meta.width)  / 2)
const top  = Math.round((OUT_H - meta.height) / 2)

await sharp({
  create: { width: OUT_W, height: OUT_H, channels: 3, background: { r: 255, g: 255, b: 255 } },
})
  .composite([{ input: output, left, top }])
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(DEST)

import { statSync } from 'fs'
const check   = await sharp(DEST).metadata()
const sizeKB  = (statSync(DEST).size / 1024).toFixed(1)
console.log(`✓ ${DEST}`)
console.log(`  ${check.width}x${check.height}  format=${check.format}  size=${sizeKB} KB`)
