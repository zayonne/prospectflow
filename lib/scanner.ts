export interface ScannedProspect {
  url: string
  boutique_name: string
  score: number
  label: string
  issues: string[]
  issue_principale: string
}

interface AgentReadyResponse {
  scanId: string
  arsScore: number
  breakdown: Record<string, number>
  issues: Array<{
    field: string
    message: string
    severity: string
    productId?: string
    productTitle?: string
  }>
  productCount: number
}

function extractBoutiqueName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    if (hostname.includes('myshopify.com')) {
      return hostname.split('.')[0]
    }
    return hostname.replace(/\.[^.]+$/, '')
  } catch {
    return url
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function scanSingle(url: string): Promise<ScannedProspect | null> {
  const apiBase = process.env.AGENTREADY_API_URL
  if (!apiBase) {
    console.warn('AGENTREADY_API_URL is not set')
    return null
  }

  try {
    const res = await fetch(`${apiBase}/api/scan?skipReport=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopUrl: url }),
      signal: AbortSignal.timeout(30_000),
      redirect: 'follow',
    })

    if (!res.ok) {
      console.warn(`  Warning: ${url} returned HTTP ${res.status}`)
      return null
    }

    const data: AgentReadyResponse = await res.json()
    const score = data.arsScore
    const label = score >= 80 ? 'Good' : score >= 60 ? 'Needs Work' : 'Critical'

    return {
      url,
      boutique_name: extractBoutiqueName(url),
      score,
      label,
      issues: data.issues.map(i => i.message),
      issue_principale: data.issues[0]?.message ?? 'No issues detected',
    }
  } catch (e) {
    console.warn(`  Warning: scan failed for ${url} — ${e}`)
    return null
  }
}

export async function scanStores(urls: string[]): Promise<ScannedProspect[]> {
  const results: ScannedProspect[] = []

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const prospect = await scanSingle(url)

    if (prospect) {
      console.log(`Scanning ${i + 1}/${urls.length}: ${url} → score ${prospect.score}`)
      if (prospect.score < 80) {
        results.push(prospect)
      }
    } else {
      console.warn(`  Warning: skipping ${url}`)
    }

    if (i < urls.length - 1) {
      await sleep(3_000)
    }
  }

  return results
}
