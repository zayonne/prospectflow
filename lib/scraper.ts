const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

const SKIP_CONTAINS = ['cdn', 'shopify', 'example', 'sentry', 'pixel', 'noreply', 'no-reply', 'donotreply']
const SKIP_EXTENSIONS = ['.png', '.jpg', '.gif', '.svg']

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}
const TIMEOUT = 10_000

export interface ScrapedEmail {
  email: string
  source: string
}

function isValidEmail(email: string): boolean {
  const lower = email.toLowerCase()
  if (SKIP_EXTENSIONS.some(ext => lower.endsWith(ext))) return false
  if (SKIP_CONTAINS.some(s => lower.includes(s))) return false
  return true
}

function extractEmail(html: string): string | null {
  const matches = html.matchAll(EMAIL_RE)
  for (const [match] of matches) {
    const email = match.toLowerCase()
    if (isValidEmail(email)) return email
  }
  return null
}

function extractFooterHtml(html: string): string {
  const match = /<footer[\s\S]*?<\/footer>/i.exec(html)
  return match ? match[0] : html
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function scrapeEmail(shopUrl: string): Promise<ScrapedEmail | null> {
  const base = shopUrl.replace(/\/$/, '')
  const pages = ['/pages/contact', '/pages/mentions-legales', '/pages/faq', '/']

  for (let i = 0; i < pages.length; i++) {
    const path = pages[i]
    const url = base + path
    console.log(`  Trying ${url}`)

    try {
      const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(TIMEOUT),
        redirect: 'follow',
      })

      if (res.ok) {
        const html = await res.text()
        const searchable = path === '/' ? extractFooterHtml(html) : html
        const email = extractEmail(searchable)

        if (email) {
          return { email, source: path }
        }
      }
    } catch (e) {
      console.log(`  Failed ${url}: ${e}`)
    }

    if (i < pages.length - 1) {
      await sleep(1_000)
    }
  }

  return null
}

export async function scrapeEmails(urls: string[]): Promise<Map<string, ScrapedEmail | null>> {
  const results = new Map<string, ScrapedEmail | null>()

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const result = await scrapeEmail(url)
    results.set(url, result)

    if (i < urls.length - 1) {
      await sleep(2_000)
    }
  }

  return results
}
