'use client'

import { useState, useMemo } from 'react'
import { GameEvent, RARITY_COLORS, EQUIPMENT_POOL, HELP_ITEM_POOL } from '@pipz/core'

interface Props {
  event: GameEvent
  onChoose: (choiceIndex?: number) => void
  onDismiss: () => void
}

export default function EventModal({ event, onChoose, onDismiss }: Props) {
  // ── Risk Ladder (連環寶箱) ──
  if (event.id === 'risk_ladder') {
    return <RiskLadderGame onFinish={(reward) => { onChoose(reward); onDismiss() }} />
  }

  // ── Regular event ──
  const isPositive = event.type === 'positive'
  const bgColor = isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'
  const borderColor = isPositive ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'
  const accentColor = isPositive ? '#22c55e' : '#ef4444'

  return (
    <div className="fixed-modal-layer-top" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      padding: 16,
    }} onClick={onDismiss}>
      <div style={{
        background: '#141b2d', border: `1px solid ${borderColor}`, borderRadius: 20,
        padding: 24, maxWidth: 300, width: '100%',
      }} onClick={e => e.stopPropagation()}>

        {/* Icon */}
        <div style={{ textAlign: 'center', fontSize: 48, marginBottom: 8 }}>
          {event.icon}
        </div>

        {/* Type label */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
            color: accentColor, background: bgColor,
            padding: '2px 10px', borderRadius: 10,
          }}>
            {isPositive ? '✨ 正面事件' : '⚠️ 負面事件'}
          </span>
        </div>

        {/* Name */}
        <div style={{
          fontSize: 18, fontWeight: 800, color: '#f0f4f8',
          textAlign: 'center', marginBottom: 8,
        }}>
          {event.name}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 12, color: '#94a5b8', textAlign: 'center',
          lineHeight: 1.5, marginBottom: 16,
        }}>
          {event.description}
        </div>

        {/* Effects preview */}
        <div style={{
          display:'flex', flexWrap:'wrap', gap:4, justifyContent:'center',
          marginBottom: event.choices ? 12 : 0,
        }}>
          {event.effects.map((eff, i) => (
            <span key={i} style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 6,
              background: `${accentColor}15`, color: accentColor,
            }}>
              {effectLabel(eff)}
            </span>
          ))}
        </div>

        {/* Choices (or dismiss) */}
        {event.choices && event.choices.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {event.choices.map((c, i) => (
              <button key={i} onClick={() => onChoose(i)}
                style={{
                  width:'100%', padding: '10px 0', borderRadius: 14, border: '1px solid #2a3a5a',
                  background: '#1a2338', color: '#f0f4f8', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                {c.label}
              </button>
            ))}
          </div>
        ) : (
          <button onClick={() => onChoose()}
            style={{
              width:'100%', padding: '10px 0', borderRadius: 14, border: 'none',
              background: accentColor, color: 'white', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            繼續
          </button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════
// Risk Ladder — interactive mini-game
// ═══════════════════════════════════

interface ChestInfo {
  steps: number
  itemId: string | null
  label: string
}

const CHEST_REWARDS: ChestInfo[] = [
  { steps: 50,  itemId: null,      label: '👣 +50' },
  { steps: 100, itemId: null,      label: '👣 +100' },
  { steps: 200, itemId: 'berry',       label: '👣 +200 + 🫐' },
  { steps: 400, itemId: 'power_herb',  label: '👣 +400 + 🌿' },
  { steps: 800, itemId: 'xp_elixir',   label: '👣 +800 + ✨×2' },
]

type GameStep = 'first_open' | 'safe' | 'bomb' | 'taken' | 'done'

function RiskLadderGame({ onFinish }: { onFinish: (reward: number) => void }) {
  const [bombIdx] = useState(() => Math.floor(Math.random() * 5))
  const [idx, setIdx] = useState(0)          // current chest index
  const [step, setStep] = useState<GameStep>('first_open')
  const [accumulated, setAccumulated] = useState(0)

  const openChest = (i: number) => {
    if (i === bombIdx) {
      setStep('bomb')
    } else {
      setAccumulated(a => a + CHEST_REWARDS[i].steps)
      setStep('safe')
    }
  }

  const handleOpen = () => {
    openChest(idx)
  }

  const handleContinue = () => {
    const next = idx + 1
    setIdx(next)
    openChest(next)
  }

  const handleTake = () => {
    setStep('taken')
  }

  const isRevealed = (i: number) => i < idx || (i === idx && step !== 'first_open')
  const curReward = CHEST_REWARDS[idx]

  return (
    <div className="fixed-modal-layer-top" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      padding: 16,
    }}>
      <div style={{
        background: '#141b2d', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20,
        padding: 24, maxWidth: 300, width: '100%',
      }}>

        {/* Icon */}
        <div style={{ textAlign: 'center', fontSize: 36, marginBottom: 4 }}>📦</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b', textAlign: 'center', marginBottom: 4 }}>
          連環寶箱
        </div>
        <div style={{ fontSize: 11, color: '#94a5b8', textAlign: 'center', marginBottom: 16, lineHeight: 1.4 }}>
          逐個開箱，隨時停手拎走獎勵！<br />
          㩒中 💣 就冇曬
        </div>

        {/* Chests row */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
          {Array.from({ length: 5 }, (_, i) => {
            const rev = isRevealed(i)
            const isBomb = i === bombIdx
            const isCurrent = i === idx
            let border: string
            let bg: string
            let content: string
            if (rev && isBomb) { border = '2px solid #ef444455'; bg = 'rgba(239,68,68,0.12)'; content = '💣' }
            else if (rev) { border = '2px solid #22c55e44'; bg = 'rgba(34,197,94,0.10)'; content = i >= 3 ? '🎁' : '✨' }
            else if (isCurrent && step === 'first_open') { border = '2px solid #f59e0b55'; bg = '#1a2338'; content = '📦' }
            else { border = '2px solid #2a3a5a'; bg = '#1a2338'; content = '📦' }
            return (
              <div key={i} style={{
                width: 46, height: 52, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, background: bg, border, transition: 'all 0.2s',
              }}>
                {content}
              </div>
            )
          })}
        </div>

        {/* Status area */}
        <div style={{ textAlign: 'center', marginBottom: 16, minHeight: 52 }}>
          {step === 'first_open' && (
            <div>
              <div style={{ fontSize: 12, color: '#f0f4f8', fontWeight: 600, marginBottom: 2 }}>
                第 {idx + 1} 箱
              </div>
              <div style={{ fontSize: 11, color: '#5a6d85' }}>
                獎勵：{curReward.label}
              </div>
            </div>
          )}
          {step === 'safe' && (
            <div>
              <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, marginBottom: 2 }}>
                ✨ 開到好嘢！
              </div>
              <div style={{ fontSize: 11, color: '#94a5b8' }}>
                拎到 {curReward.label}
              </div>
              {accumulated > 0 && (
                <div style={{ fontSize: 13, color: '#22d3ee', fontWeight: 700, marginTop: 4 }}>
                  已累積：👣 +{accumulated}
                </div>
              )}
            </div>
          )}
          {step === 'bomb' && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#ef4444', marginBottom: 2 }}>
                💥 爆咗！
              </div>
              <div style={{ fontSize: 11, color: '#5a6d85' }}>
                唔好貪心... 下次再試啦
              </div>
            </div>
          )}
          {step === 'taken' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', marginBottom: 2 }}>
                ✅ 成功拎走獎勵！
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>
                👣 +{accumulated}
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        {step === 'first_open' && (
          <button onClick={handleOpen}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: 'white', fontSize: 14, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 0 20px rgba(245,158,11,0.3)',
            }}>
            📦 打開第 {idx + 1} 箱！
          </button>
        )}
        {step === 'safe' && idx < 4 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleTake}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 14, border: '1px solid #22c55e44',
                background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              🧳 拎走（+{accumulated}）
            </button>
            <button onClick={handleContinue}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              ▶️ 繼續 · 下箱 {CHEST_REWARDS[idx + 1].label}
            </button>
          </div>
        )}
        {step === 'safe' && idx >= 4 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleTake}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 14, border: '1px solid #22c55e44',
                background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              🧳 拎走（+{accumulated}）
            </button>
            <button onClick={handleContinue}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 14, border: 'none',
                background: '#f59e0b', color: 'white',
                fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              🏆 全開 bonus？
            </button>
          </div>
        )}
        {step === 'bomb' && (
          <button onClick={() => onFinish(0)}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 14, border: 'none',
              background: '#ef4444', color: 'white', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            💀 算我唔好彩
          </button>
        )}
        {step === 'taken' && (
          <button onClick={() => onFinish(accumulated)}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 14, border: 'none',
              background: '#22c55e', color: 'white', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            ✅ 繼續行路（+{accumulated}步）
          </button>
        )}
      </div>
    </div>
  )
}

function effectLabel(eff: { type: string; value: number; target?: string }): string {
  switch (eff.type) {
    case 'mood_change': return eff.value > 0 ? `❤️ +${eff.value}` : `💔 ${eff.value}`
    case 'step_bonus': return `👣 +${eff.value}`
    case 'step_loss': return `👣 -${eff.value}`
    case 'item_gain': return `📦 獲得道具`
    case 'item_loss': return `📦 失去道具`
    case 'xp_gain': return `✨ +${eff.value}XP`
    case 'stat_boost': return `📈 ${eff.target} +${eff.value}`
    default: return ''
  }
}
