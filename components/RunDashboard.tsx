'use client'

import { useState, useEffect, useRef } from 'react'
import type { Prospect, Run } from '@/lib/supabase'
import ProspectTable from '@/components/ProspectTable'

const CATEGORIES = ['mode', 'bijoux', 'maison-deco', 'sante-beaute', 'sport', 'autre']
const VOLUMES = [10, 20, 50]

const DORK_STRATEGIES = [
  { value: 'standard',      label: 'Standard (myshopify.com)' },
  { value: 'custom_domain', label: 'Custom domain (.fr)' },
  { value: 'email_direct',  label: 'Email direct (gmail/hotmail)' },
] as const
type DorkStrategy = typeof DORK_STRATEGIES[number]['value']

type Statut = 'idle' | 'running' | 'done' | 'error'

export default function RunDashboard() {
  const [categorie, setCategorie] = useState('mode')
  const [keyword, setKeyword] = useState('')
  const [volume, setVolume] = useState(20)
  const [dorkStrategy, setDorkStrategy] = useState<DorkStrategy>('standard')
  const [runId, setRunId] = useState<string | null>(null)
  const [runData, setRunData] = useState<Run | null>(null)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const statut: Statut = isRunning
    ? 'running'
    : runData?.statut === 'done'
    ? 'done'
    : runData?.statut === 'error'
    ? 'error'
    : 'idle'

  const statusBadge: Record<Statut, { label: string; className: string }> = {
    idle: { label: 'Inactif', className: 'bg-gray-700 text-gray-300' },
    running: { label: 'En cours...', className: 'bg-blue-600 text-white animate-pulse' },
    done: { label: 'Terminé', className: 'bg-green-600 text-white' },
    error: { label: 'Erreur', className: 'bg-red-600 text-white' },
  }

  useEffect(() => {
    if (!runId) return

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/run/${runId}`)
        if (!res.ok) return
        const data = await res.json() as { run: Run; prospects: Prospect[] }
        setRunData(data.run)
        setProspects(data.prospects)
        if (data.run.statut === 'done' || data.run.statut === 'error') {
          setIsRunning(false)
          clearInterval(intervalRef.current!)
        }
      } catch {
        // network error — keep polling
      }
    }, 3000)

    return () => clearInterval(intervalRef.current!)
  }, [runId])

  async function handleLaunch() {
    setIsRunning(true)
    setRunData(null)
    setProspects([])
    setRunId(null)
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorie, keyword: keyword || undefined, volume, dork_strategy: dorkStrategy }),
      })
      const data = await res.json() as { runId: string }
      setRunId(data.runId)
    } catch {
      setIsRunning(false)
    }
  }

  async function handleExport() {
    if (!runId) return
    const res = await fetch(`/api/export/${runId}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prospects-${runId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const progress =
    runData?.volume_cible && runData.total_qualified !== undefined
      ? Math.min(100, Math.round((runData.total_qualified / runData.volume_cible) * 100))
      : 0

  const badge = statusBadge[statut]

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Section 1 — Launch */}
      <div className="bg-gray-900 rounded-2xl p-6 space-y-6 border border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white">ProspectFlow</h1>
          <p className="text-gray-400 text-sm mt-1">
            Trouve tes prospects Shopify. Scanne-les. Contacte-les.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Catégorie
            </label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Mot-clé (optionnel)
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="ex: chaussures femme"
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            Volume
          </label>
          <div className="flex gap-2">
            {VOLUMES.map((v) => (
              <button
                key={v}
                onClick={() => setVolume(v)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  volume === v
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            Stratégie de recherche
          </label>
          <select
            value={dorkStrategy}
            onChange={(e) => setDorkStrategy(e.target.value as DorkStrategy)}
            className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            {DORK_STRATEGIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleLaunch}
            disabled={isRunning}
            className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            Lancer ProspectFlow
          </button>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Section 2 — Progress */}
      {runId && (
        <div className="bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Progression
          </h2>

          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-sm text-gray-400">
            {statut === 'running'
              ? 'Run en cours...'
              : statut === 'done'
              ? 'Run terminé'
              : statut === 'error'
              ? 'Erreur lors du run'
              : ''}
          </p>

          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-2xl font-bold text-white">
                {runData?.total_scanned ?? '—'}
              </span>
              <p className="text-gray-500 text-xs mt-0.5">boutiques scannées</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-green-400">
                {runData?.total_qualified ?? '—'}
              </span>
              <p className="text-gray-500 text-xs mt-0.5">qualifiées</p>
            </div>
          </div>
        </div>
      )}

      {/* Section 3 — Results */}
      {prospects.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Résultats ({prospects.length})
            </h2>
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium transition-colors"
            >
              Exporter CSV
            </button>
          </div>
          <ProspectTable prospects={prospects} />
        </div>
      )}
    </div>
  )
}
