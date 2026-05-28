import { NextRequest, NextResponse } from 'next/server'
import { huntShopifyStores } from '@/lib/hunter'
import { scanStores } from '@/lib/scanner'
import { scrapeEmails } from '@/lib/scraper'
import { generateEmails } from '@/lib/generator'
import supabase from '@/lib/supabase'
import type { Prospect } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.json() as { categorie: string; keyword?: string; volume?: number }
  const { categorie, keyword, volume } = body

  if (!categorie) {
    return NextResponse.json({ error: 'categorie is required' }, { status: 400 })
  }

  const { data: runData, error: runError } = await supabase
    .from('runs')
    .insert({ categorie, keyword, volume_cible: volume ?? 20, statut: 'running' })
    .select('id')
    .single()

  if (runError || !runData) {
    return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
  }

  const runId: string = runData.id

  ;(async () => {
    try {
      const urls = await huntShopifyStores(categorie, keyword, volume ?? 20)
      const scanned = await scanStores(urls)
      const emailMap = await scrapeEmails(scanned.map(s => s.url))
      const emails = await generateEmails(
        scanned.map(s => ({
          boutique_name: s.boutique_name,
          url: s.url,
          score: s.score,
          issues: s.issues,
          issue_principale: s.issue_principale,
        }))
      )

      const prospects: Prospect[] = scanned.map((s, i) => {
        const scraped = emailMap.get(s.url)
        const generated = emails[i]
        return {
          run_id: runId,
          boutique_name: s.boutique_name,
          url: s.url,
          score: s.score,
          label: s.label,
          issue_principale: s.issue_principale,
          email: scraped?.email,
          email_source: scraped?.source,
          objet: generated?.objet,
          body: generated?.body,
          statut: 'new',
        }
      })

      if (prospects.length > 0) {
        await supabase.from('prospects').insert(prospects)
      }

      await supabase
        .from('runs')
        .update({ statut: 'done', total_scanned: urls.length, total_qualified: scanned.length })
        .eq('id', runId)
    } catch (err) {
      console.error('Pipeline error:', err)
      await supabase.from('runs').update({ statut: 'error' }).eq('id', runId)
    }
  })()

  return NextResponse.json({ runId, statut: 'started' })
}
