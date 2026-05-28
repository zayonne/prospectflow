import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params

  const { data: run, error: runError } = await supabase
    .from('runs')
    .select('*')
    .eq('id', runId)
    .single()

  if (runError || !run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  const { data: prospects } = await supabase
    .from('prospects')
    .select('*')
    .eq('run_id', runId)

  return NextResponse.json({ run, prospects: prospects ?? [] })
}
