import { NextRequest } from 'next/server'
import supabase from '@/lib/supabase'

function escapeCsv(value: string | undefined | null): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params

  const { data: prospects } = await supabase
    .from('prospects')
    .select('boutique_name,url,score,issue_principale,email,objet,body')
    .eq('run_id', runId)

  const rows = (prospects ?? []).map(p =>
    [p.boutique_name, p.url, p.score, p.issue_principale, p.email, p.objet, p.body]
      .map(v => escapeCsv(v as string))
      .join(',')
  )

  const csv = ['boutique_name,url,score,issue_principale,email,objet,body', ...rows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=prospectflow-${runId}.csv`,
    },
  })
}
