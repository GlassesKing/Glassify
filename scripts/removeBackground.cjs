/**
 * 흰 배경을 투명하게 만든 안경 PNG 생성
 * 사용: node scripts/removeBackground.cjs
 */
const { Jimp } = require('jimp')
const path = require('path')

const DIR = path.join(__dirname, '..', 'public', 'glasses')
const SRC = path.join(DIR, 'source.png')
const OUT = path.join(DIR, 'glasses.png')

const WHITE_THRESHOLD = 250
const SOFT_EDGE = true

async function main() {
  const img = await Jimp.read(SRC)
  const w = img.bitmap.width
  const h = img.bitmap.height

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const r = img.bitmap.data[i]
      const g = img.bitmap.data[i + 1]
      const b = img.bitmap.data[i + 2]
      const a = img.bitmap.data[i + 3]
      const maxChannel = Math.max(r, g, b)

      let newAlpha = a
      if (maxChannel >= WHITE_THRESHOLD) {
        if (SOFT_EDGE && maxChannel < 255) {
          newAlpha = Math.round(a * (255 - maxChannel) / (255 - WHITE_THRESHOLD))
          if (newAlpha > a) newAlpha = a
        } else {
          newAlpha = 0
        }
      }
      img.bitmap.data[i + 3] = newAlpha
    }
  }

  await img.write(OUT)
  console.log('Saved:', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
