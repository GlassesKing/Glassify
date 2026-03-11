#!/usr/bin/env node
/**
 * 다비치마켓 BODAM 02 상품 페이지에서 이미지 URL 추출
 * 사용: node scripts/fetchBodam02Images.mjs
 * 출력된 URL로 이미지 저장 후 public/glasses/bodam02-front.png, bodam02-side.png 로 저장
 */
const PRODUCT_URL = 'https://www.davichmarket.com/products/G2201191207_8901'

async function main() {
  try {
    const res = await fetch(PRODUCT_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })
    const html = await res.text()
    const urls = [...html.matchAll(/https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) => m[0])
    const unique = [...new Set(urls)].filter((u) => !u.includes('icon') && !u.includes('logo'))
    console.log('Found image URLs (save first as front, second as side if applicable):')
    unique.slice(0, 10).forEach((u, i) => console.log(`${i + 1}. ${u}`))
    if (unique.length === 0) {
      console.log('No images found. Page may be JS-rendered. Open the URL in a browser, open DevTools > Network, reload, and copy image URLs from there.')
    }
  } catch (e) {
    console.error(e.message)
    console.log('Manual: Open', PRODUCT_URL, 'in browser, right-click product images > Save as, save to public/glasses/bodam02-front.png and bodam02-side.png')
  }
}

main()
