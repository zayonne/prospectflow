import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
}
if (!supabaseKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY')
}

export interface Run {
  id?: string
  categorie: string
  keyword?: string
  volume_cible?: number
  statut?: string
  total_scanned?: number
  total_qualified?: number
  created_at?: string
}

export interface Prospect {
  id?: string
  run_id: string
  boutique_name?: string
  url: string
  score?: number
  label?: string
  issue_principale?: string
  email?: string
  email_source?: string
  objet?: string
  body?: string
  statut?: string
  created_at?: string
}

export default createClient(supabaseUrl, supabaseKey)
