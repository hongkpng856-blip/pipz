'use client'

import { formatSteps } from '@pipz/core'
import PixelPetCanvas from './PixelPetCanvas'
import type { Pet } from '@pipz/core'

interface Props {
  open: boolean
  onClose: () => void
  user: { id: string; email?: string } | null
  totalSteps: number
  todaySteps: number
  pets: Pet[]
  eggCount: number
  onSignOut: () => void
}

interface Achievement {
  id: string
  icon: string
  title: string
  unlocked: boolean
  desc: string
}

export default function ProfileModal({ open, onClose, user, totalSteps, todaySteps, pets, eggCount, onSignOut }: Props) {
  if (!open || !user) return null

  const firstLetter = user.email?.[0]?.toUpperCase() ?? '?'
  const joinDate = '2026' // simplified — could fetch from profile

  // Compute achievements
  const achievements: Achievement[] = [
    { id: 'first-step', icon: '👣', title: '第一步', unlocked: totalSteps >= 1000, desc: '行夠 1,000 步' },
    { id: 'hatcher', icon: '🥚', title: '孵化者', unlocked: pets.length >= 1, desc: '孵化第一隻寵物' },
    { id: 'evolver', icon: '🌟', title: '進化大師', unlocked: pets.some(p => p.evolutionStage > 1), desc: '第一次進化' },
    { id: 'walker', icon: '🚶', title: '行路人', unlocked: totalSteps >= 10000, desc: '累積 10,000 步' },
    { id: 'collector', icon: '🐾', title: '收藏家', unlocked: pets.length >= 3, desc: '擁有 3 隻寵物' },
    { id: 'breeder', icon: '💜', title: '繁殖者', unlocked: pets.length >= 5, desc: '擁有 5 隻寵物' },
    { id: 'marathon', icon: '🏃', title: '馬拉松', unlocked: totalSteps >= 50000, desc: '累積 50,000 步' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', justifyContent: 'center',
      background: '#0b1120',
      overflow: 'hidden',
    }}>
      <div style={{
        width: '100%', maxWidth: '24rem',
        display: 'flex', flexDirection: 'column',
        background: '#0b1120',
        height: '100dvh',
      }}>
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #1e2a45',
        }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#94a5b8',
            fontSize: 16, cursor: 'pointer', padding: '4px 8px',
            fontFamily: 'inherit',
          }}>
            ← 返回
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f4f8' }}>
            👤 個人檔案
          </span>
          <div style={{ width: 48 }} />
        </div>

        {/* ── Scrollable ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

          {/* ── Avatar Card ── */}
          <div style={{
            background: '#141b2d', border: '1px solid #1e2a45', borderRadius: 20,
            padding: 20, textAlign: 'center', marginBottom: 12,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28,
              background: 'linear-gradient(135deg, #8b5cf6, #22d3ee)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
              fontSize: 24, fontWeight: 700, color: 'white',
            }}>
              {firstLetter}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f4f8', wordBreak: 'break-all' }}>
              {user.email}
            </div>
            <div style={{ fontSize: 10, color: '#22c55e', marginTop: 4 }}>
              ● 已登入
            </div>
          </div>

          {/* ── Stats ── */}
          <div style={{
            background: '#141b2d', border: '1px solid #1e2a45', borderRadius: 16,
            padding: 16, marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8', marginBottom: 10 }}>
              📊 統計
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: '👣 總步數', value: formatSteps(totalSteps), color: '#f59e0b' },
                { label: '⚡ 今日步數', value: formatSteps(todaySteps), color: '#22d3ee' },
                { label: '🐾 寵物', value: `${pets.length} 隻`, color: '#8b5cf6' },
                { label: '🥚 蛋', value: `${eggCount} 粒`, color: '#22c55e' },
              ].map(s => (
                <div key={s.label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '6px 0', borderBottom: '1px solid #1a2338',
                }}>
                  <span style={{ fontSize: 12, color: '#94a5b8' }}>{s.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Achievements ── */}
          <div style={{
            background: '#141b2d', border: '1px solid #1e2a45', borderRadius: 16,
            padding: 16, marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8', marginBottom: 10 }}>
              🏆 成就
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {achievements.map(a => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 12,
                  background: a.unlocked ? `${a.icon === '🌟' ? '#f59e0b' : '#8b5cf6'}0d` : '#1a2338',
                  border: `1px solid ${a.unlocked ? '#8b5cf644' : '#2a3a5a'}`,
                  opacity: a.unlocked ? 1 : 0.5,
                }}>
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700,
                      color: a.unlocked ? '#f0f4f8' : '#5a6d85',
                    }}>
                      {a.title}
                    </div>
                    <div style={{ fontSize: 9, color: a.unlocked ? '#94a5b8' : '#3a4a5a' }}>
                      {a.desc}
                    </div>
                  </div>
                  <span style={{ fontSize: 11 }}>
                    {a.unlocked ? '✅' : '🔒'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Sign Out ── */}
          <button onClick={onSignOut} style={{
            width: '100%', padding: '12px 0', borderRadius: 16, border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.08)', color: '#ef4444',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', marginTop: 4,
          }}>
            🔴 登出
          </button>
        </div>
      </div>
    </div>
  )
}
