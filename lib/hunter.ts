import { load } from 'cheerio'

export const CATEGORIES = ['mode', 'bijoux', 'maison-deco', 'sante-beaute', 'sport']

const BASE_URL = 'https://www.annuaire-du-ecommerce.com'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}
const TIMEOUT = 10_000
const MAX_PAGES = 5

function extractShopDomain(srcset: string): string | null {
  const decoded = decodeURIComponent(srcset)
  const pattern = /https?:\/\/([a-zA-Z0-9\-.]+\.(?:com|fr|shop|net|io|store))\/cdn\/shop\//
  let match = pattern.exec(decoded)
  if (match) return match[1].replace('www.', '')
  match = pattern.exec(srcset)
  if (match) return match[1].replace('www.', '')
  return null
}

async function scrapeCategoryPage(categorie: string, page: number): Promise<string[]> {
  const url =
    page > 1
      ? `${BASE_URL}/sites/${categorie}?page=${page}`
      : `${BASE_URL}/sites/${categorie}`

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT),
    })
    const html = await res.text()
    const $ = load(html)
    const domains: string[] = []

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') ?? ''
      if (!href.startsWith('/site/')) return

      for (const img of $(el).find('img').toArray()) {
        const $img = $(img)
        const srcset =
          $img.attr('srcSet') ?? $img.attr('srcset') ?? $img.attr('src') ?? ''
        const domain = extractShopDomain(srcset)
        if (domain) {
          domains.push(domain)
          break
        }
      }
    })

    return domains
  } catch (e) {
    console.error(`  Error on page ${page}: ${e}`)
    return []
  }
}

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT),
      redirect: 'follow',
    })
    return res.status === 200
  } catch {
    return false
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function huntShopifyStores(
  categorie: string,
  keyword?: string,
  volume?: number,
): Promise<string[]> {
  const seen = new Set<string>()
  const verified: string[] = []
  const target = volume ?? Infinity

  for (let page = 1; page <= MAX_PAGES; page++) {
    if (verified.length >= target) break

    const domains = await scrapeCategoryPage(categorie, page)

    if (domains.length === 0) break

    let pageFound = 0

    for (const domain of domains) {
      if (seen.has(domain)) continue
      seen.add(domain)

      const shopUrl = `https://${domain}`
      if (await verifyUrl(shopUrl)) {
        verified.push(shopUrl)
        pageFound++
      }

      if (verified.length >= target) break
    }

    console.log(`Scanning page ${page} for category ${categorie}... found ${pageFound} shops`)

    if (page < MAX_PAGES && verified.length < target) {
      await sleep(2000 + Math.random() * 2000)
    }
  }

  return verified
}
