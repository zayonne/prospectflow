'use client'

import { useState } from 'react'
import type { Prospect } from '@/lib/supabase'

interface Props {
  prospect: Prospect
  onClose: () => void
}

export default function EmailPreview({ prospect, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!prospect.body) return
    await navigator.clipboard.writeText(prospect.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 space-y-1">
          <h2 className="text-base font-semibold text-white">
            {prospect.boutique_name ?? prospect.url}
          </h2>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                prospect.score !== undefined && prospect.score > 75
                  ? 'bg-green-700 text-green-200'
                  : prospect.score !== undefined && prospect.score >= 60
                  ? 'bg-yellow-700 text-yellow-200'
                  : 'bg-red-800 text-red-200'
              }`}
            >
              Score {prospect.score ?? '—'}
            </span>
            {prospect.objet && (
              <span className="text-gray-400 text-xs truncate">{prospect.objet}</span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {prospect.body ? (
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
              {prospect.body}
            </pre>
          ) : (
            <p className="text-gray-600 text-sm">Aucun email généré.</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-800 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={handleCopy}
            disabled={!prospect.body}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {copied ? 'Copié !' : "Copier l'email"}
          </button>
        </div>
      </div>
    </div>
  )
}
