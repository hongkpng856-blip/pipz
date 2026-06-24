'use client'

import { GameEvent } from '@pipz/core'

interface Props {
  event: GameEvent
  onChoose: (choiceIndex?: number) => void
  onDismiss: () => void
}

export default function EventModal({ event, onChoose, onDismiss }: Props) {
  const isPositive = event.type === 'positive'
  const bgColor = isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'
  const borderColor = isPositive ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'
  const accentColor = isPositive ? '#22c55e' : '#ef4444'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
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
        <div style={{
          textAlign: 'center', marginBottom: 8,
        }}>
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
