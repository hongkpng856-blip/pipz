'use client'

import React from 'react'

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6',
  epic: '#8b5cf6', legendary: '#f59e0b',
}
const RARITY_LABELS: Record<string, string> = {
  common: '普通', uncommon: '稀有', rare: '珍貴', epic: '史詩', legendary: '傳說',
}

interface MonsterData {
  emoji: string
  label: string
  color: string
  level: number
  rarity: string
  cellRow: number
  cellCol: number
}

interface Props {
  encounter: MonsterData | null
  addStRef: React.MutableRefObject<((n: number) => void) | undefined>
  logMsg: (msg: string) => void
  setEncounter: (v: MonsterData | null) => void
}

export default function MonsterModal({ encounter, addStRef, logMsg, setEncounter }: Props) {
  if (!encounter) return null

  const m = encounter
  const c = RARITY_COLORS[m.rarity] || '#9ca3af'

  console.log('[MonsterModal] RENDERING for', m?.label, m?.emoji)

  return (
    <div
      className="fixed-modal-layer"
      style={{ zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        className="card"
        style={{
          width: 260, padding: 20, textAlign: 'center',
          border: `1.5px solid ${c}66`, boxShadow: `0 0 30px ${c}33`,
        }}
      >
        <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 8 }}>{m.emoji}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#e8e0d0', marginBottom: 2 }}>{m.label}</div>
        <div style={{
          fontSize: 10, fontWeight: 700, color: c, marginBottom: 8,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>
          {RARITY_LABELS[m.rarity] || m.rarity} · Lv.{m.level}
        </div>
        <div style={{ fontSize: 11, color: '#5a6d85', marginBottom: 14 }}>
          ⚔️ 野生怪獸擋住去路！
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            onClick={() => {
              addStRef.current?.(m.level * 10)
              logMsg(`🎉 擊敗 ${m.emoji} ${m.label}！獲得 ${m.level * 10} 步獎勵！`)
              setEncounter(null)
            }}
            style={{
              padding: '6px 20px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
              color: '#22c55e', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            ⚔️ 戰鬥
          </button>
          <button
            onClick={() => {
              logMsg(`🏃 從 ${m.emoji} ${m.label} 手中逃走`)
              setEncounter(null)
            }}
            style={{
              padding: '6px 20px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            🏃 逃走
          </button>
        </div>
      </div>
    </div>
  )
}
