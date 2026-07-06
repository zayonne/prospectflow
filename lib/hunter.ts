export const CATEGORIES = ['mode', 'bijoux', 'maison-deco', 'sante-beaute', 'sport', 'autre']

const TIMEOUT = 10_000
const MAX_PAGES = 5
const DELAY_MS = 1000

const DORK_MAP_STANDARD: Record<string, string> = {
  mode: 'site:myshopify.com mode france',
  bijoux: 'site:myshopify.com bijoux france',
  'maison-deco': 'site:myshopify.com maison decoration france',
  'sante-beaute': 'site:myshopify.com cosmetiques beaute france',
  sport: 'site:myshopify.com sport france',
  autre: 'site:myshopify.com boutique france',
}

const DORK_MAP_CUSTOM_DOMAIN: Record<string, string> = {
  mode: 'mode shopify site:.fr',
  bijoux: 'bijoux shopify site:.fr',
  'maison-deco': 'maison decoration shopify site:.fr',
  'sante-beaute': 'cosmetiques beaute shopify site:.fr',
  sport: 'sport shopify site:.fr',
  autre: 'boutique shopify site:.fr',
}

const DORK_MAP_EMAIL_DIRECT: Record<string, string> = {
  mode: 'mode shopify france "@gmail.com" OR "@hotmail.fr"',
  bijoux: 'bijoux shopify france "@gmail.com" OR "@hotmail.fr"',
  'maison-deco': 'maison decoration shopify france "@gmail.com" OR "@hotmail.fr"',
  'sante-beaute': 'cosmetiques beaute shopify france "@gmail.com" OR "@hotmail.fr"',
  sport: 'sport shopify france "@gmail.com" OR "@hotmail.fr"',
  autre: 'boutique shopify france "@gmail.com" OR "@hotmail.fr"',
}

const VALID_TLD = /\.(fr|com|shop|store|net|io)$/i

interface SerpResult {
  link?: string
  displayed_link?: string
}

interface SerpResponse {
  organic_results?: SerpResult[]
}

function buildQuery(
  categorie: string,
  keyword?: string,
  dork_strategy: 'standard' | 'custom_domain' | 'email_direct' = 'standard',
): string {
  // Si un keyword est fourni, on construit une query centrée sur le keyword
  if (keyword && keyword.trim().length > 0) {
    const kw = keyword.trim()
    if (dork_strategy === 'custom_domain') {
      return `${kw} shopify site:.fr`
    }
    if (dork_strategy === 'email_direct') {
      return `${kw} shopify france "@gmail.com" OR "@hotmail.fr"`
    }
    return `site:myshopify.com ${kw} france`
  }
  const map =
    dork_strategy === 'custom_domain' ? DORK_MAP_CUSTOM_DOMAIN :
    dork_strategy === 'email_direct'  ? DORK_MAP_EMAIL_DIRECT :
    DORK_MAP_STANDARD
  return map[categorie] ?? map['autre']
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

async function resolveUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(TIMEOUT),
      redirect: 'follow',
    })
    if (res.status !== 200) return null
    if (url.includes('myshopify.com') && res.url) {
      const resolvedHost = new URL(res.url).hostname
      const originalHost = new URL(url).hostname
      if (resolvedHost !== originalHost && !resolvedHost.includes('myshopify.com')) {
        return `https://${resolvedHost}`
      }
    }
    return url
  } catch {
    return null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function huntShopifyStores(
  categorie: string,
  keyword?: string,
  volume?: number,
  dork_strategy?: 'standard' | 'custom_domain' | 'email_direct',
): Promise<string[]> {
  const query = buildQuery(categorie, keyword, dork_strategy)
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
      const resolved = await resolveUrl(shopUrl)
      if (resolved) {
        verified.push(resolved)
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
