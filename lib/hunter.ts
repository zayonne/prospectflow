export const CATEGORIES = ['mode', 'bijoux', 'maison-deco', 'sante-beaute', 'sport', 'autre']

const TIMEOUT = 10_000
const MAX_PAGES = 5
const DELAY_MS = 1000

const DORK_MAP: Record<string, string> = {
  mode: 'site:myshopify.com mode france',
  bijoux: 'site:myshopify.com bijoux france',
  'maison-deco': 'site:myshopify.com maison decoration france',
  'sante-beaute': 'site:myshopify.com cosmetiques beaute france',
  sport: 'site:myshopify.com sport france',
  autre: 'site:myshopify.com boutique france',
}

const VALID_TLD = /\.(fr|com|shop|store|net|io)$/i

interface SerpResult {
  link?: string
  displayed_link?: string
}

interface SerpResponse {
  organic_results?: SerpResult[]
}

function buildQuery(categorie: string, keyword?: string): string {
  if (categorie === 'autre' && keyword) {
    return `site:myshopify.com ${keyword} france`
  }
  return DORK_MAP[categorie] ?? DORK_MAP['autre']
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function isShopUrl(url: string): boolean {
  if (url.includes('myshopify.com')) return true
  try {
    const { hostname } = new URL(url)
    return VALID_TLD.test(hostname)
  } catch {
    return false
  }
}

async function fetchSerpPage(query: string, start: number): Promise<SerpResult[]> {
  const key = process.env.SERPAPI_KEY
  if (!key) throw new Error('SERPAPI_KEY environment variable is not set')

  const params = new URLSearchParams({
    q: query,
    api_key: key,
    num: '10',
    hl: 'fr',
    gl: 'fr',
    start: String(start),
  })

  const res = await fetch(`https://serpapi.com/search.json?${params}`, {
    signal: AbortSignal.timeout(TIMEOUT),
  })

  if (!res.ok) throw new Error(`SerpAPI error: ${res.status}`)

  const data: SerpResponse = await res.json()
  return data.organic_results ?? []
}

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
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
  const query = buildQuery(categorie, keyword)
  const target = volume ?? Infinity
  const seenDomains = new Set<string>()
  const verified: string[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    if (verified.length >= target) break

    const start = page * 10
    let results: SerpResult[]

    try {
      results = await fetchSerpPage(query, start)
    } catch (e) {
      console.error(`  SerpAPI error on page ${page + 1}: ${e}`)
      break
    }

    if (results.length === 0) break

    let pageFound = 0

    for (const result of results) {
      if (verified.length >= target) break

      const url = result.link
      if (!url || !isShopUrl(url)) continue

      const domain = extractDomain(url)
      if (!domain || seenDomains.has(domain)) continue
      seenDomains.add(domain)

      const shopUrl = url.startsWith('http') ? url : `https://${domain}`
      if (await verifyUrl(shopUrl)) {
        verified.push(shopUrl)
        pageFound++
      }
    }

    console.log(`Page ${page + 1} [${categorie}] — ${pageFound} shops found (total: ${verified.length})`)

    if (page < MAX_PAGES - 1 && verified.length < target) {
      await sleep(DELAY_MS)
    }
  }

  return verified
}
