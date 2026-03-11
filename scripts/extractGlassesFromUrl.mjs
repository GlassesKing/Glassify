#!/usr/bin/env node
/**
 * 상품 URL에서 안경 이미지 추출 → 앞면·옆면 저장
 * 사용: node scripts/extractGlassesFromUrl.mjs [URL]
 * 기본 URL: https://www.davichmarket.com/products/G2201191207_8901
 */
import puppeteer from 'puppeteer'
import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'glasses')
const DEFAULT_URL = 'https://www.davichmarket.com/products/G2201191207_8901'

function download(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function getExt(url) {
  const u = url.split('?')[0].toLowerCase()
  if (u.endsWith('.png')) return 'png'
  if (u.endsWith('.webp')) return 'webp'
  return 'jpg'
}

async function main() {
  const productUrl = process.argv[2] || DEFAULT_URL
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  console.log('Opening', productUrl, '...')
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 2000))

    const imageList = await page.evaluate(() => {
      const out = []
      const seen = new Set()
      document.querySelectorAll('img[src]').forEach((img) => {
        let src = (img.src || '').split('?')[0]
        if (!src || seen.has(src)) return
        if (!/\.(jpg|jpeg|png|webp)/i.test(src) || /logo|icon|avatar|button|favicon/i.test(src)) return
        seen.add(src)
        const w = img.naturalWidth || img.width || img.offsetWidth || 0
        const h = img.naturalHeight || img.height || img.offsetHeight || 0
        out.push({ src: img.src, w, h, area: w * h })
      })
      document.querySelectorAll('img[data-src]').forEach((img) => {
        const src = (img.getAttribute('data-src') || '').split('?')[0]
        if (!src || seen.has(src) || !/\.(jpg|jpeg|png|webp)/i.test(src)) return
        seen.add(src)
        const w = img.naturalWidth || img.width || img.offsetWidth || 0
        const h = img.naturalHeight || img.height || img.offsetHeight || 0
        out.push({ src: img.dataset.src || src, w, h, area: w * h })
      })
      return out
    })

    const minSize = 200 * 200
    const sorted = imageList
      .filter((u) => !/logo|icon|favicon/i.test(u.src) && u.area >= minSize)
      .sort((a, b) => b.area - a.area)

    if (sorted.length === 0) {
      console.log('No product images found. Saving page HTML for debug...')
      const html = await page.content()
      fs.writeFileSync(path.join(OUT_DIR, 'page-snapshot.html'), html, 'utf8')
      console.log('Run again or manually save product images to public/glasses/extracted-front.png, extracted-side.png')
      return
    }

    console.log('Found', sorted.length, 'image(s), using largest as front')
    const frontUrl = sorted[0].src
    const sideUrl = (sorted[1] || sorted[0]).src
    const ext1 = getExt(frontUrl)
    const ext2 = getExt(sideUrl)

    const frontBuf = await download(frontUrl)
    const sideBuf = await download(sideUrl)

    const frontName = `extracted-front.${ext1}`
    const sideName = `extracted-side.${ext2}`
    const frontPath = path.join(OUT_DIR, frontName)
    const sidePath = path.join(OUT_DIR, sideName)
    fs.writeFileSync(frontPath, frontBuf)
    fs.writeFileSync(sidePath, sideBuf)
    const manifest = { front: `/glasses/${frontName}`, side: `/glasses/${sideName}` }
    fs.writeFileSync(path.join(OUT_DIR, 'extracted-manifest.json'), JSON.stringify(manifest, null, 2))
    console.log('Saved:', frontPath, sidePath)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
