'use client'

import { useState } from 'react'
import type { Prospect } from '@/lib/supabase'
import EmailPreview from '@/components/EmailPreview'

type Filter = 'all' | 'with-email' | 'without-email'

interface Props {
  prospects: Prospect[]
}

function scoreBadge(score?: number) {
  if (score === undefined) return { color: 'bg-gray-700 text-gray-300', label: '—' }
  if (score > 75) return { color: 'bg-green-700 text-green-200', label: String(score) }
  if (score >= 60) return { color: 'bg-yellow-700 text-yellow-200', label: String(score) }
  return { color: 'bg-red-800 text-red-200', label: String(score) }
}

function labelBadge(score?: number, label?: string) {
  if (!label) return 'bg-gray-700 text-gray-400'
  if (score !== undefined && score > 75) return 'bg-green-900 text-green-300'
  if (score !== undefined && score >= 60) return 'bg-yellow-900 text-yellow-300'
  return 'bg-red-900 text-red-300'
}

export default function ProspectTable({ prospects }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Prospect | null>(null)

  const filtered = prospects.filter((p) => {
    if (filter === 'with-email') return !!p.email
    if (filter === 'without-email') return !p.email
    return true
  })

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'with-email', label: 'Avec email' },
    { key: 'without-email', label: 'Sans email' },
  ]

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Boutique</th>
              <th className="text-left px-4 py-3">Score</th>
              <th className="text-left px-4 py-3">Label</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Objet</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const sb = scoreBadge(p.score)
              return (
                <tr
                  key={p.id ?? i}
                  className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-100 max-w-[160px] truncate">
                    {p.boutique_name ?? p.url}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sb.color}`}>
                      {sb.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${labelBadge(p.score, p.label)}`}
                    >
                      {p.label ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[180px] truncate">
                    {p.email ? (
                      <span className="text-gray-200">{p.email}</span>
                    ) : (
                      <span className="text-gray-600">Non trouvé</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">
                    {p.objet ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(p)}
                      className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium transition-colors"
                    >
                      Voir email
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-sm">
                  Aucun résultat
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <EmailPreview prospect={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
