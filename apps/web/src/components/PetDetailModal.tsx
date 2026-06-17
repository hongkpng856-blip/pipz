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
      background: '#1e1e2e',
      overflow: 'hidden',
    }}>
      {/* Centered wrapper matching main layout */}
      <div style={{
        width: '100%', maxWidth: '24rem',
        display: 'flex', flexDirection: 'column',
        background: '#1e1e2e',
        height: '100dvh',
      }}>
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '2px solid #4a4a6a',
        }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
            fontSize: 16, cursor: 'pointer', padding: '4px 8px',
            fontFamily: 'inherit',
          }}>
            ← 返回
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
            寵物詳情
          </span>
          <button onClick={() => setShowDelete(true)} style={{
            background: 'none', border: 'none', color: '#ef4444',
            fontSize: 18, cursor: 'pointer', padding: '4px 8px',
            fontFamily: 'inherit', opacity: 0.7, transition: 'opacity 0.2s',
          }}
            onMouseOver={e => (e.currentTarget.style.opacity = '1')}
            onMouseOut={e => (e.currentTarget.style.opacity = '0.7')}
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

          {/* ── Pet Display ── */}
          <div style={{
            textAlign: 'center',
            background: '#252535', border: '2px solid #4a4a6a', padding: 20, marginBottom: 10,
            boxShadow: '2px 2px 0px #0a0a14',
          }}>
            <div style={{
              background: `radial-gradient(circle,${PC[pet.rarity]}22,transparent 70%)`,
              width: 100, height: 100, borderRadius: '50%',
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

            <div style={{ marginTop: 8 }}>
              <span className="pet-badge" style={{
                color: RARITY_COLORS[pet.rarity], background: RARITY_COLORS[pet.rarity] + '18',
                fontSize: 12, padding: '3px 12px', borderRadius: 20, fontWeight: 700,
              }}>
                {RARITY_LABELS[pet.rarity]}
              </span>
            </div>

            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center', gap: 14 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Lv.{pet.level}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>CP {cp}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {STAGE_CANTO[pet.evolutionStage - 1] || '初級'}
              </span>
            </div>

            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center', gap: 4 }}>
              <span>{ME[pet.mood] || '😐'}</span>
              <span style={{ fontSize: 12, color: '#22c55e' }}>
                {pet.mood === 'happy' ? '開心' : pet.mood}
              </span>
            </div>

            {/* ── Actions ── */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
              <button onClick={onFeed}
                style={{ padding: '5px 12px', border: '2px solid #22c55e',
                  background: '#166534', color: 'white', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '2px 2px 0px #0a0a14' }}>
                🍖餵食
              </button>
              <button onClick={onPet}
                style={{ padding: '5px 12px', border: '2px solid #3b82f6',
                  background: '#1e3a5f', color: 'white', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '2px 2px 0px #0a0a14' }}>
                ✋摸頭
              </button>
              <button onClick={onPlay}
                style={{ padding: '5px 12px', border: '2px solid #f59e0b',
                  background: '#5c3d0e', color: 'white', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '2px 2px 0px #0a0a14' }}>
                🎾玩
              </button>
            </div>
          </div>

          {/* ── Stats ── */}
          <div style={{
            background: '#252535', border: '2px solid #4a4a6a', padding: 12, marginBottom: 8,
            boxShadow: '2px 2px 0px #0a0a14',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>
              📊 能力值
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {[
                { label: '⚡ 速度', value: pet.stats.speed, key: 'speed' },
                { label: '🍀 運氣', value: pet.stats.luck, key: 'luck' },
                { label: '💜 魅力', value: pet.stats.charm, key: 'charm' },
                { label: '🔋 體力', value: pet.stats.energy, key: 'energy' },
              ].map(s => (
                <div key={s.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>{s.value}</span>
                  </div>
                  <div style={{ height: 4, background: '#2a2a3a', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (s.value / 200) * 100)}%`,
                      background: '#746fff',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Skills ── */}
          <div style={{
            background: '#252535', border: '2px solid #4a4a6a', padding: 12, marginBottom: 8,
            boxShadow: '2px 2px 0px #0a0a14',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>
              🎯 技能
            </div>
            {pet.skills.length === 0 ? (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '6px 0' }}>
                未有技能
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pet.skills.map(skill => (
                  <div key={skill.id} style={{
                    background: '#2a2a3a', border: '1px solid #4a4a6a', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 18 }}>{skill.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{skill.name}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{skill.description}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#746fff' }}>+{skill.power}</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)' }}>Lv.{skill.unlockedAtLevel}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Evolution ── */}
          <div style={{
            background: '#252535', border: '2px solid #4a4a6a', padding: 12, marginBottom: 8,
            boxShadow: '2px 2px 0px #0a0a14',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>
              🌟 進化進度
            </div>

            {/* Stage dots */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              {STAGE_CANTO.slice(0, 5).map((name, i) => (
                <div key={i} style={{
                  textAlign: 'center',
                  opacity: i <= pet.evolutionStage - 1 ? 1 : 0.3,
                }}>
                  <div style={{
                    width: 24, height: 24,
                    background: i < pet.evolutionStage - 1 ? '#6030ff' : i === pet.evolutionStage - 1 ? '#f59e0b' : '#2a2a3a',
                    border: `2px solid ${i <= pet.evolutionStage - 1 ? '#746fff' : '#4a4a6a'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 4px',
                    fontSize: 9, fontWeight: 700, color: 'white',
                  }}>
                    {STAGE_NAMES[i]}
                  </div>
                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)' }}>{name}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {pet.evolutionStage < 5 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>
                  <span>下一步：{STAGE_CANTO[pet.evolutionStage] || '進化'}</span>
                  <span>{formatSteps(pet.totalSteps)} / {formatSteps(nextReq)}步</span>
                </div>
                <div style={{ height: 4, background: '#2a2a3a', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, evoProgress)}%`,
                    background: '#746fff',
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            )}

            {/* Evolution button */}
            {canEvolve ? (
              <button onClick={onEvolve} style={{
                width: '100%', marginTop: 10, padding: '10px 0',
                border: '2px solid #f59e0b',
                background: '#5c3d0e',
                color: 'white', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: '2px 2px 0px #0a0a14',
              }}>
                🌟 進化！
              </button>
            ) : pet.evolutionStage < 5 && (
              <div style={{ marginTop: 10, textAlign: 'center' }}>
                <div style={{
                  width: '100%', padding: '10px 0', border: '2px dashed #4a4a6a',
                  background: '#2a2a3a', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600,
                  fontFamily: 'inherit',
                }}>
                  🔒 需要多 {formatSteps(stepsRemaining)} 步進化
                </div>
              </div>
            )}
          </div>

          {/* ── Total Stats ── */}
          <div style={{
            background: '#252535', border: '2px solid #4a4a6a', padding: 12,
            boxShadow: '2px 2px 0px #0a0a14',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>
              📈 總計
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              {[
                { label: '總步數', value: formatSteps(pet.totalSteps) },
                { label: '等級', value: `Lv.${pet.level}` },
                { label: '階段', value: STAGE_CANTO[pet.evolutionStage - 1] || '初級' },
                { label: 'CP', value: cp.toString() },
                { label: '技能數量', value: `${pet.skills.length}個` },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Delete / Sacrifice ── */}
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <button onClick={() => setShowDelete(true)}
              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', opacity: 0.6 }}>
              🗑️ 剷除此寵物
            </button>
          </div>

          </div>
      </div>

      {/* ════ Delete confirmation popup ════ */}
      {showDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', padding: 16,
        }} onClick={() => setShowDelete(false)}>
          <div style={{
            background: '#252535', border: '2px solid rgba(239,68,68,0.4)', padding: 20, maxWidth: 280, width: '100%', textAlign: 'center',
            boxShadow: '2px 2px 0px #0a0a14',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🗑️</div>
            <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 700, marginBottom: 6 }}>
              確定要剷除呢隻寵物？
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
              此操作無法還原
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setShowDelete(false)}
                style={{
                  padding: '8px 20px', border: '2px solid #4a4a6a',
                  background: '#2a2a3a', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', flex: 1,
                  boxShadow: '2px 2px 0px #0a0a14',
                }}>
                取消
              </button>
              <button onClick={() => onDelete(pet.id)}
                style={{
                  padding: '8px 20px', border: '2px solid #ef4444',
                  background: '#5c1a1a', color: 'white', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', flex: 1,
                  boxShadow: '2px 2px 0px #0a0a14',
                }}>
                確認剷除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
