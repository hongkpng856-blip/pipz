'use client'

import { useState } from 'react'
import { Pet, formatSteps, RARITY_COLORS, RARITY_LABELS, EVOLUTION_STEPS, calculateEvolution } from '@pipz/core'
import PixelPetCanvas from './PixelPetCanvas'

interface Props {
  pet: Pet
  totalSteps: number
  onClose: () => void
  onEvolve: () => void
  onFeed: () => void
  onPet: () => void
  onPlay: () => void
  onDelete: (petId: string) => void
}

const PC: Record<string, string> = {
  common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6',
  epic: '#8b5cf6', legendary: '#f59e0b',
}
const ME: Record<string, string> = {
  happy: '😊', excited: '🤩', hungry: '🍽️', sleepy: '😴', sad: '😢',
}

const STAGE_NAMES = ['BB', 'I', 'II', 'III', 'IV']
const STAGE_CANTO = ['BB', '幼年', '成年', '完全體', '傳說']

// Evolution step requirements
const NEXT_STEP_REQ: Record<number, number> = { 1: 10000, 2: 30000, 3: 60000, 4: 100000, 5: 999999 }

export default function PetDetailModal({ pet, totalSteps, onClose, onEvolve, onFeed, onPet, onPlay, onDelete }: Props) {
  const [showDelete, setShowDelete] = useState(false)
  const canEvolve = calculateEvolution(pet.totalSteps, pet.evolutionStage, pet.stats)
  const cp = pet.stats.speed + pet.stats.luck + pet.stats.charm + pet.stats.energy

  const nextReq = NEXT_STEP_REQ[pet.evolutionStage] ?? 999999
  const currentReq = EVOLUTION_STEPS[pet.evolutionStage] ?? 0
  const evoProgress = pet.evolutionStage >= 5
    ? 100
    : Math.min(100, ((pet.totalSteps - currentReq) / (nextReq - currentReq)) * 100)

  const stepsRemaining = Math.max(0, nextReq - pet.totalSteps)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', justifyContent: 'center',
      background: '#0b0b1a',
      overflow: 'hidden',
    }}>
      {/* Centered wrapper matching main layout */}
      <div style={{
        width: '100%', maxWidth: '24rem',
        display: 'flex', flexDirection: 'column',
        background: '#0b0b1a',
        height: '100dvh',
      }}>
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '2px solid #2a2f4a',
        }}>
          <button onClick={onClose} style={{
            background: 'none', border: '2px solid var(--border)', cursor: 'pointer',
            color: 'var(--text-2)', fontFamily: 'var(--font-title)', fontSize: 8,
            padding: '4px 8px', letterSpacing: '0.3px',
          }}>
            ← 返回
          </button>
          <span style={{ fontFamily: 'var(--font-title)', fontSize: 9, color: '#e0e8f0', letterSpacing: '0.5px' }}>
            寵物詳情
          </span>
          <button onClick={() => setShowDelete(true)} style={{
            background: 'rgba(255,51,85,0.1)', border: '2px solid rgba(255,51,85,0.3)', cursor: 'pointer',
            color: '#ff3355', fontFamily: 'var(--font-title)', fontSize: 9,
            padding: '2px 8px', letterSpacing: '0.3px',
          }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,51,85,0.2)'; e.currentTarget.style.borderColor = '#ff3355' }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,51,85,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,51,85,0.3)' }}
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>

          {/* ── Pet Display ── */}
          <div style={{
            textAlign: 'center',
            background: '#12162b', border: '2px solid #2a2f4a',
            padding: 20, marginBottom: 10,
            boxShadow: '4px 4px 0 rgba(0,0,0,0.4)',
          }}>
            <div style={{
              background: `radial-gradient(circle,${PC[pet.rarity]}22,transparent 70%)`,
              width: 100, height: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
            }}>
              <PixelPetCanvas
                seed={parseInt(pet.speciesId) || 1}
                rarity={pet.rarity}
                evolutionStage={pet.evolutionStage}
                animation="happy"
                size={6}
              />
            </div>

            <div style={{ marginTop: 6 }}>
              <span style={{
                fontFamily: 'var(--font-title)', fontSize: 8,
                color: RARITY_COLORS[pet.rarity], background: RARITY_COLORS[pet.rarity] + '18',
                padding: '3px 10px', letterSpacing: '0.5px',
              }}>
                {RARITY_LABELS[pet.rarity]}
              </span>
            </div>

            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center', gap: 14 }}>
              <span style={{ fontFamily: 'var(--font-title)', fontSize: 9, color: 'var(--text-3)' }}>Lv.{pet.level}</span>
              <span style={{ fontFamily: 'var(--font-title)', fontSize: 9, color: 'var(--pixel-gold)' }}>CP {cp}</span>
              <span style={{ fontFamily: 'var(--font-title)', fontSize: 9, color: 'var(--text-3)' }}>
                {STAGE_CANTO[pet.evolutionStage - 1] || '初級'}
              </span>
            </div>

            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center', gap: 4 }}>
              <span>{ME[pet.mood] || '😐'}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--pixel-green)' }}>
                {pet.mood === 'happy' ? '開心' : pet.mood}
              </span>
            </div>

            {/* ── Actions ── */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
              <button onClick={onFeed}
                style={{ padding: '5px 12px', border: '2px solid #33dd77',
                  background: '#1a6b3a', color: 'white', fontFamily: 'var(--font-title)',
                  fontSize: 7, cursor: 'pointer', letterSpacing: '0.3px',
                  boxShadow: '2px 2px 0 rgba(0,0,0,0.4)' }}>
                🍖FEED
              </button>
              <button onClick={onPet}
                style={{ padding: '5px 12px', border: '2px solid #4488ff',
                  background: '#1a4b8a', color: 'white', fontFamily: 'var(--font-title)',
                  fontSize: 7, cursor: 'pointer', letterSpacing: '0.3px',
                  boxShadow: '2px 2px 0 rgba(0,0,0,0.4)' }}>
                ✋PET
              </button>
              <button onClick={onPlay}
                style={{ padding: '5px 12px', border: '2px solid #ffcc00',
                  background: '#8a5a00', color: 'white', fontFamily: 'var(--font-title)',
                  fontSize: 7, cursor: 'pointer', letterSpacing: '0.3px',
                  boxShadow: '2px 2px 0 rgba(0,0,0,0.4)' }}>
                🎾PLAY
              </button>
            </div>
          </div>

          {/* ── Stats ── */}
          <div style={{
            background: '#12162b', border: '2px solid #2a2f4a',
            padding: 14, marginBottom: 10,
            boxShadow: '4px 4px 0 rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 8, color: '#44ccff', marginBottom: 8, letterSpacing: '0.5px' }}>
              STATS
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {[
                { label: 'SPD', value: pet.stats.speed, key: 'speed' },
                { label: 'LUK', value: pet.stats.luck, key: 'luck' },
                { label: 'CHA', value: pet.stats.charm, key: 'charm' },
                { label: 'ENR', value: pet.stats.energy, key: 'energy' },
              ].map(s => (
                <div key={s.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-2)' }}>{s.label}</span>
                    <span style={{ fontFamily: 'var(--font-title)', fontSize: 8, color: '#e0e8f0' }}>{s.value}</span>
                  </div>
                  <div style={{ height: 8, background: '#1a1f38', border: '2px solid #363b58', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (s.value / 200) * 100)}%`,
                      background: 'linear-gradient(90deg, #8b5cf6, #22d3ee)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Skills ── */}
          <div style={{
            background: '#12162b', border: '2px solid #2a2f4a',
            padding: 14, marginBottom: 10,
            boxShadow: '4px 4px 0 rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 8, color: '#44ccff', marginBottom: 8, letterSpacing: '0.5px' }}>
              SKILLS
            </div>
            {pet.skills.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-3)', textAlign: 'center', padding: '6px 0' }}>
                No skills
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pet.skills.map(skill => (
                  <div key={skill.id} style={{
                    background: '#1a1f38', border: '2px solid #363b58',
                    padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 18 }}>{skill.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-title)', fontSize: 7, color: '#e0e8f0' }}>{skill.name}</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-3)' }}>{skill.description}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-title)', fontSize: 8, color: '#22d3ee' }}>+{skill.power}</div>
                      <div style={{ fontFamily: 'var(--font-title)', fontSize: 6, color: 'var(--text-3)' }}>Lv.{skill.unlockedAtLevel}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Evolution ── */}
          <div style={{
            background: '#12162b', border: '2px solid #2a2f4a',
            padding: 14, marginBottom: 10,
            boxShadow: '4px 4px 0 rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 8, color: '#44ccff', marginBottom: 8, letterSpacing: '0.5px' }}>
              EVOLUTION
            </div>

            {/* Stage dots */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              {STAGE_CANTO.slice(0, 5).map((name, i) => (
                <div key={i} style={{
                  textAlign: 'center',
                  opacity: i <= pet.evolutionStage - 1 ? 1 : 0.3,
                }}>
                  <div style={{
                    width: 28, height: 28,
                    background: i < pet.evolutionStage - 1 ? '#8b5cf6' : i === pet.evolutionStage - 1 ? '#f59e0b' : '#1a1f38',
                    border: `2px solid ${i <= pet.evolutionStage - 1 ? '#8b5cf6' : '#363b58'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 3px',
                    fontFamily: 'var(--font-title)', fontSize: 8, color: 'white',
                  }}>
                    {STAGE_NAMES[i]}
                  </div>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 6, color: 'var(--text-2)' }}>{name}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {pet.evolutionStage < 5 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: 'var(--font-title)', fontSize: 7, color: 'var(--text-3)' }}>下一步：{STAGE_CANTO[pet.evolutionStage] || '進化'}</span>
                  <span style={{ fontFamily: 'var(--font-title)', fontSize: 7, color: 'var(--text-3)' }}>{formatSteps(pet.totalSteps)} / {formatSteps(nextReq)}步</span>
                </div>
                <div style={{ height: 8, background: '#1a1f38', border: '2px solid #363b58', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, evoProgress)}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #ffd700)',
                  }} />
                </div>
              </div>
            )}

            {/* Evolution button — ALWAYS visible */}
            {canEvolve ? (
              <button onClick={onEvolve} style={{
                width: '100%', marginTop: 10, padding: '10px 0',
                border: '2px solid #ffcc00',
                background: '#8a5a00', color: 'white',
                fontFamily: 'var(--font-title)', fontSize: 9, cursor: 'pointer',
                letterSpacing: '0.5px', boxShadow: '2px 2px 0 rgba(0,0,0,0.4)',
              }}>
                EVOLVE
              </button>
            ) : pet.evolutionStage < 5 && (
              <div style={{ marginTop: 10, textAlign: 'center' }}>
                <div style={{
                  width: '100%', padding: '10px 0',
                  border: '2px dashed #363b58',
                  background: '#1a1f38', color: 'var(--text-3)',
                  fontFamily: 'var(--font-title)', fontSize: 7, letterSpacing: '0.3px',
                }}>
                  🔒 NEED {formatSteps(stepsRemaining)} STEPS
                </div>
              </div>
            )}
          </div>

          {/* ── Total Stats ── */}
          <div style={{
            background: '#12162b', border: '2px solid #2a2f4a',
            padding: 14, marginBottom: 10,
            boxShadow: '4px 4px 0 rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 8, color: '#44ccff', marginBottom: 8, letterSpacing: '0.5px' }}>
              TOTAL
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              {[
                { label: 'Steps', value: formatSteps(pet.totalSteps) },
                { label: 'Level', value: `Lv.${pet.level}` },
                { label: 'Stage', value: STAGE_CANTO[pet.evolutionStage - 1] || '初級' },
                { label: 'CP', value: cp.toString() },
                { label: 'Skills', value: `${pet.skills.length}` },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-2)' }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--font-title)', fontSize: 8, color: '#e0e8f0' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Delete / Sacrifice ── */}
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <button onClick={() => setShowDelete(true)}
              style={{ background: 'none', border: '2px solid rgba(255,51,85,0.2)', cursor: 'pointer',
                color: '#ff3355', fontFamily: 'var(--font-title)', fontSize: 7, padding: '4px 10px',
                letterSpacing: '0.3px', opacity: 0.7 }}>
                DELETE
            </button>
          </div>

          </div>
      </div>

      {/* ════ Delete confirmation popup ════ */}
      {showDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          padding: 16,
        }} onClick={() => setShowDelete(false)}>
          <div style={{
            background: '#12162b', border: '2px solid rgba(255,51,85,0.4)',
            padding: 24, maxWidth: 280, width: '100%', textAlign: 'center',
            boxShadow: '6px 6px 0 rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 8, color: '#ff3355', letterSpacing: '0.5px', marginBottom: 4 }}>
              DELETE THIS PET?
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-3)', marginBottom: 16 }}>
              Cannot be undone
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setShowDelete(false)}
                style={{
                  padding: '8px 20px', border: '2px solid #363b58',
                  background: '#1a1f38', color: 'var(--text-2)',
                  fontFamily: 'var(--font-title)', fontSize: 7, cursor: 'pointer',
                  letterSpacing: '0.3px', flex: 1,
                }}>
                CANCEL
              </button>
              <button onClick={() => onDelete(pet.id)}
                style={{
                  padding: '8px 20px', border: '2px solid #ff3355',
                  background: '#5c1010', color: 'white',
                  fontFamily: 'var(--font-title)', fontSize: 7, cursor: 'pointer',
                  letterSpacing: '0.3px', flex: 1,
                }}>
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
