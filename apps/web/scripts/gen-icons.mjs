import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SIZES = [192, 512]
const BG = '#0b1120'
const LIGHTNING = '#f59e0b'
const OUT = join(__dirname, '..', 'public')

function svgIcon(size) {
  const p = Math.round(size * 0.12)
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${Math.round(size*0.2)}" fill="${BG}"/>
  <path d="M${Math.round(size*0.52)} ${Math.round(size*0.12)} L${Math.round(size*0.22)} ${Math.round(size*0.52)} h${Math.round(size*0.16)} L${Math.round(size*0.38)} ${Math.round(size*0.88)} L${Math.round(size*0.78)} ${Math.round(size*0.42)} h${Math.round(size*0.14)} L${Math.round(size*0.56)} ${Math.round(size*0.12)} Z" fill="${LIGHTNING}"/>
</svg>`
}

for (const size of SIZES) {
  const svg = svgIcon(size)
  const buf = Buffer.from(svg)
  const png = await sharp(buf).resize(size, size).png().toBuffer()
  writeFileSync(join(OUT, `icon-${size}.png`), png)
  console.log(`✅ icon-${size}.png (${(png.length / 1024).toFixed(1)}KB)`)
}

// Favicon SVG
const favicon = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path d="M17 3L5 18h5L13 29l9-12h-4l1-14h-2z" fill="#f59e0b"/>
</svg>`
writeFileSync(join(OUT, 'favicon.svg'), favicon)
console.log('✅ favicon.svg')
