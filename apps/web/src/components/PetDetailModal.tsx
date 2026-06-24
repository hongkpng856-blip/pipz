'use client'

import { useState, useMemo, useEffect } from 'react'
import { Pet, formatSteps, RARITY_COLORS, RARITY_LABELS, EVOLUTION_STEPS, calculateEvolution, generatePixelPet, EQUIPMENT_POOL, EquipmentDef, EquipmentSlot } from '@pipz/core'
import PixelPetCanvas from './PixelPetCanvas'

interface Props {
  pet: Pet
  totalSteps: number
  onClose: () => void
  onEvolve: () => void
  onDelete: (petId: string) => void
  onList?: (petId: string, price: number) => void
  onUnlist?: (petId: string) => void
  onBuy?: (petId: string, sellerId: string, price: number) => void
  isMarket?: boolean
  sellerId?: string
  currentUserId?: string
  equipment?: { equipmentId: string; slot: string }[]   // currently equipped items
  onUnequip?: (slot: string) => void
  onEquipToSlot?: (slot: string, equipmentId: string) => void  // equipped from inventory
  availableEquipment?: EquipmentDef[]                       // items in inventory that can be equipped
  hasInventory?: boolean                                    // whether user has any equip in inv
  onOpenInventory?: () => void                             // open full inventory modal
}

const PC: Record<string, string> = {
  common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6',
  epic: '#8b5cf6', legendary: '#f59e0b',
}
const ME: Record<string, string> = {
  happy: '😊', excited: '🤩', hungry: '🍽️', sleepy: '😴', sad: '😢',
}
const MOOD_CN: Record<string, string> = {
  happy: '開心', excited: '興奮', hungry: '肚餓', sleepy: '眼瞓', sad: '傷心',
}

const STAGE_NAMES = ['BB', 'I', 'II', 'III', 'IV']
const STAGE_CANTO = ['BB', '幼年', '成年', '完全體', '傳說']

// Evolution step requirements
const NEXT_STEP_REQ: Record<number, number> = { 1: 10000, 2: 30000, 3: 60000, 4: 100000, 5: 999999 }

export default function PetDetailModal({ pet, totalSteps, onClose, onEvolve, onDelete, onList, onUnlist, onBuy, isMarket, sellerId, currentUserId, equipment, onUnequip, onEquipToSlot, availableEquipment, hasInventory, onOpenInventory }: Props) {
  const [showDelete, setShowDelete] = useState(false)
  const [listPrice, setListPrice] = useState('500')
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)

  // Reset list price when pet changes
  useEffect(() => { setListPrice('500'); setShowDelete(false) }, [pet.id])
  const canEvolve = calculateEvolution(pet.totalSteps, pet.evolutionStage, pet.stats)
  const cp = pet.stats.speed + pet.stats.luck + pet.stats.charm + pet.stats.energy
  const speciesName = useMemo(() => {
    const data = generatePixelPet({ seed: parseInt(pet.speciesId) || 1, rarity: pet.rarity, evolutionStage: pet.evolutionStage })
    return data.speciesName
  }, [pet.speciesId, pet.rarity, pet.evolutionStage])

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
      background: '#0b1120',
      overflow: 'hidden',
    }}>
      {/* Centered wrapper matching main layout */}
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
            background: '#141b2d', border: '1px solid #1e2a45', borderRadius: 20,
            padding: 24, marginBottom: 12,
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

            <div style={{ marginTop: 6, fontSize: 11, color: '#5a6d85' }}>
              #{speciesName}
            </div>

            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 16 }}>
              <span style={{ fontSize: 13, color: '#94a5b8' }}>Lv.{pet.level}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>CP {cp}</span>
              <span style={{ fontSize: 13, color: '#94a5b8' }}>
                {STAGE_CANTO[pet.evolutionStage - 1] || '初級'}
              </span>
            </div>

            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 4 }}>
              <span>{ME[pet.mood] || '😐'}</span>
              <span style={{ fontSize: 12, color: '#22c55e' }}>
                {MOOD_CN[pet.mood] || pet.mood}
              </span>
            </div>

            {/* Mood bar */}
            <div style={{ marginTop: 6, padding: '0 20px' }}>
              <div className="progress-wrap" style={{ height: 4 }}>
                <div className="progress-bar"><div className="progress-fill" style={{
                  width: `${Math.max(5, pet.moodValue)}%`,
                  background: pet.moodValue > 60 ? 'linear-gradient(90deg,#22c55e,#4ade80)' :
                             pet.moodValue > 30 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' :
                             'linear-gradient(90deg,#ef4444,#f87171)',
                }}/></div>
              </div>
              <div style={{ fontSize: 9, color: '#5a6d85', textAlign: 'right', marginTop: 2 }}>
                ❤️ {pet.moodValue}%
              </div>
            </div>

            {/* ── Equipment — WoW slots inside pet image card ── */}
            {equipment && (
              <div style={{ marginTop: 14 }} onDragOver={e => e.preventDefault()}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['head', 'body', 'feet', 'accessory'] as const).map(slot => {
                    const label = { head: '頭', body: '身', feet: '腳', accessory: '飾' }[slot]
                    const slotIcon = { head: '👑', body: '👕', feet: '👟', accessory: '📿' }[slot]
                    const equipped = equipment.find(e => e.slot === slot)
                    const def = equipped ? EQUIPMENT_POOL.find(d => d.id === equipped.equipmentId) : null
                    const rarColor = def ? RARITY_COLORS[def.rarity] : '#2a3a5a'
                    const isDragOver = dragOverSlot === slot
                    return (
                      <div key={slot}
                        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverSlot(slot) }}
                        onDragLeave={() => setDragOverSlot(null)}
                        onDrop={e => {
                          e.preventDefault(); setDragOverSlot(null)
                          const data = e.dataTransfer.getData('text/plain')
                          if (data && onEquipToSlot) onEquipToSlot(slot, data)
                        }}
                        style={{
                          aspectRatio: '1', borderRadius: 14,
                          background: def
                            ? `radial-gradient(circle at 50% 40%, ${rarColor}18, transparent 80%)`
                            : '#1a2338',
                          border: def
                            ? `2px solid ${rarColor}55`
                            : isDragOver
                              ? '2px dashed #8b5cf688'
                              : '2px dashed #2a3a5a',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          gap: 2, cursor: def ? 'pointer' : 'default',
                          position: 'relative',
                          transition: 'border-color 0.15s, background 0.15s',
                          minHeight: 70,
                        }}
                        onClick={() => {
                          if (def && onUnequip) onUnequip(slot)
                          else if (!def && onOpenInventory) onOpenInventory()
                        }}
                      >
                        {def ? (
                          <>
                            <span style={{ fontSize: 24, lineHeight: 1 }}>{def.icon}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: rarColor, lineHeight: 1.1, textAlign: 'center', padding: '0 4px' }}>{def.name}</span>
                            <span style={{ fontSize: 8, color: '#22c55e', lineHeight: 1 }}>+{def.bonusValue}</span>
                            {onUnequip && (
                              <div style={{
                                position: 'absolute', top: 4, right: 4,
                                width: 16, height: 16, borderRadius: 8,
                                background: 'rgba(239,68,68,0.15)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 8, color: '#ef4444', cursor: 'pointer', lineHeight: 1,
                              }}
                                onClick={e => { e.stopPropagation(); onUnequip(slot) }}
                              >
                                ✕
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 18, opacity: 0.25 }}>{slotIcon}</span>
                            <span style={{ fontSize: 8, color: isDragOver ? '#8b5cf6' : '#3a4d65', fontWeight: 600 }}>{label}</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Available equipment — draggable */}
                {availableEquipment && availableEquipment.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 9, color: '#5a6d85', marginBottom: 6, fontWeight: 600 }}>
                      📦 可用裝備（拖到 slot 上）
                    </div>
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                      {availableEquipment.map(item => (
                        <div key={item.id} draggable="true"
                          onDragStart={e => {
                            e.dataTransfer.setData('text/plain', item.id)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          style={{ flexShrink: 0, width: 44, textAlign: 'center', cursor: 'grab' }}
                        >
                          <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: `${RARITY_COLORS[item.rarity]}15`,
                            border: `1px solid ${RARITY_COLORS[item.rarity]}33`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, margin: '0 auto',
                          }}>
                            {item.icon}
                          </div>
                          <div style={{ fontSize: 7, color: RARITY_COLORS[item.rarity], marginTop: 2, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ── Stats ── */}
          <div style={{
            background: '#141b2d', border: '1px solid #1e2a45', borderRadius: 16,
            padding: 16, marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8', marginBottom: 10 }}>
              📊 能力值 <span style={{ fontSize: 9, color: '#5a6d85', fontWeight: 400 }}>（含裝備加成）</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {([
                { label: '⚡ 速度', value: pet.stats.speed, key: 'speed' },
                { label: '🍀 運氣', value: pet.stats.luck, key: 'luck' },
                { label: '💜 魅力', value: pet.stats.charm, key: 'charm' },
                { label: '🔋 體力', value: pet.stats.energy, key: 'energy' },
              ] as const).map(s => {
                const bonus = equipment ? EQUIPMENT_POOL
                  .filter(e => equipment.some(eq => eq.equipmentId === e.id))
                  .reduce((sum, e) => sum + ((e.statBonuses[s.key as keyof typeof e.statBonuses] as number) || 0), 0) : 0
                const effective = s.value + bonus
                return (
                  <div key={s.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: '#94a5b8' }}>{s.label}</span>
                      <span>
                        <span style={{ color: '#f0f4f8', fontWeight: 700 }}>{effective}</span>
                        {bonus > 0 && <span style={{ color: '#22c55e', fontSize: 9, marginLeft: 4 }}>+{bonus}</span>}
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#1a2338', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${Math.min(100, (effective / 200) * 100)}%`,
                        background: 'linear-gradient(90deg, #8b5cf6, #22d3ee)',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Skills ── */}
          <div style={{
            background: '#141b2d', border: '1px solid #1e2a45', borderRadius: 16,
            padding: 16, marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8', marginBottom: 10 }}>
              🎯 技能
            </div>
            {pet.skills.length === 0 ? (
              <div style={{ fontSize: 11, color: '#5a6d85', textAlign: 'center', padding: '8px 0' }}>
                未有技能
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pet.skills.map(skill => (
                  <div key={skill.id} style={{
                    background: '#1a2338', border: '1px solid #2a3a5a', borderRadius: 12,
                    padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 20 }}>{skill.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8' }}>{skill.name}</span>
                        {skill.effect && (
                          <span style={{
                            fontSize: 8, fontWeight: 700, color: '#f59e0b',
                            background: 'rgba(245,158,11,0.15)',
                            borderRadius: 4, padding: '1px 6px',
                          }}>效</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: '#5a6d85' }}>{skill.description}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#22d3ee' }}>+{skill.power}</div>
                      <div style={{ fontSize: 9, color: '#5a6d85' }}>Lv.{skill.unlockedAtLevel}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Evolution ── */}
          <div style={{
            background: '#141b2d', border: '1px solid #1e2a45', borderRadius: 16,
            padding: 16, marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8', marginBottom: 10 }}>
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
                    width: 28, height: 28, borderRadius: 14,
                    background: i < pet.evolutionStage - 1 ? '#8b5cf6' : i === pet.evolutionStage - 1 ? '#f59e0b' : '#1a2338',
                    border: `2px solid ${i <= pet.evolutionStage - 1 ? '#8b5cf6' : '#2a3a5a'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 4px',
                    fontSize: 10, fontWeight: 700, color: 'white',
                  }}>
                    {STAGE_NAMES[i]}
                  </div>
                  <div style={{ fontSize: 8, color: '#94a5b8' }}>{name}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {pet.evolutionStage < 5 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#5a6d85', marginBottom: 4 }}>
                  <span>下一步：{STAGE_CANTO[pet.evolutionStage] || '進化'}</span>
                  <span>{formatSteps(pet.totalSteps)} / {formatSteps(nextReq)}步</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: '#1a2338', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: `${Math.min(100, evoProgress)}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #ffd700)',
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            )}

            {/* Evolution button — ALWAYS visible */}
            {canEvolve ? (
              <button onClick={onEvolve} style={{
                width: '100%', marginTop: 12, padding: '12px 0', borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: '0 0 20px rgba(245,158,11,0.3)',
              }}>
                🌟 進化！
              </button>
            ) : pet.evolutionStage < 5 && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <div style={{
                  width: '100%', padding: '12px 0', borderRadius: 16, border: '1px dashed #2a3a5a',
                  background: '#1a2338', color: '#5a6d85', fontSize: 12, fontWeight: 600,
                  fontFamily: 'inherit',
                }}>
                  🔒 需要多 {formatSteps(stepsRemaining)} 步進化
                </div>
              </div>
            )}
          </div>

          {/* ── Total Stats ── */}
          <div style={{
            background: '#141b2d', border: '1px solid #1e2a45', borderRadius: 16,
            padding: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8', marginBottom: 10 }}>
              📈 總計
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {[
                { label: '總步數', value: formatSteps(pet.totalSteps) },
                { label: '等級', value: `Lv.${pet.level}` },
                { label: '階段', value: STAGE_CANTO[pet.evolutionStage - 1] || '初級' },
                { label: 'CP', value: cp.toString() },
                { label: '技能數量', value: `${pet.skills.length}個` },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: '#94a5b8' }}>{s.label}</span>
                  <span style={{ color: '#f0f4f8', fontWeight: 600 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Market / Trading ── */}
          {isMarket ? (
            /* Viewing from market — Buy button */
            sellerId && sellerId !== currentUserId && onBuy && (
              <div style={{
                marginTop: 12,
                background: '#141b2d', border: '1px solid #f59e0b44', borderRadius: 16,
                padding: 16, textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, color: '#94a5b8', marginBottom: 8 }}>
                  賣家開價
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', marginBottom: 12 }}>
                  ⚡ {formatSteps(pet.price)}
                </div>
                <button onClick={() => onBuy(pet.id, sellerId, pet.price)}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 16, border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>
                  ⚡ 購買
                </button>
              </div>
            )
          ) : onList ? (
            /* Own pet — List / Unlist */
            pet.isForSale ? (
              <div style={{
                marginTop: 12,
                background: '#141b2d', border: '1px solid #22c55e44', borderRadius: 16,
                padding: 16, textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>
                  ✅ 已上架
                </div>
                <div style={{ fontSize: 11, color: '#94a5b8', marginBottom: 8 }}>
                  價格：⚡ {formatSteps(pet.price)} 能量
                </div>
                <button onClick={() => onUnlist?.(pet.id)}
                  style={{
                    padding: '8px 24px', borderRadius: 14, border: '1px solid #ef4444',
                    background: 'transparent', color: '#ef4444', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  取消上架
                </button>
              </div>
            ) : (
              <div style={{
                marginTop: 12,
                background: '#141b2d', border: '1px solid #f59e0b33', borderRadius: 16,
                padding: 16,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8', marginBottom: 8 }}>
                  🏪 上架交易市場
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: '#94a5b8' }}>價格（能量）</span>
                  <input type="number" value={listPrice} onChange={e => setListPrice(e.target.value)}
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: 10, border: '1px solid #2a3a5a',
                      background: '#1a2338', color: 'white', fontSize: 13, fontWeight: 700,
                      fontFamily: 'inherit', outline: 'none',
                    }} />
                </div>
                <button onClick={() => onList!(pet.id, parseInt(listPrice) || 500)}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>
                  📤 上架
                </button>
              </div>
            )
          ) : null}

          {/* ── Delete / Sacrifice — only for own pets, not market view ── */}
          {!isMarket && (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <button onClick={() => setShowDelete(true)}
              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', opacity: 0.6 }}>
              🗑️ 剷除此寵物
            </button>
          </div>
          )}

          </div>
      </div>

      {/* ════ Delete confirmation popup ════ */}
      {showDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          padding: 16,
        }} onClick={() => setShowDelete(false)}>
          <div style={{
            background: '#141b2d', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20,
            padding: 24, maxWidth: 280, width: '100%', textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 15, color: '#ef4444', fontWeight: 700, marginBottom: 6 }}>
              確定要剷除呢隻寵物？
            </div>
            <div style={{ fontSize: 12, color: '#5a6d85', marginBottom: 20 }}>
              此操作無法還原
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setShowDelete(false)}
                style={{
                  padding: '10px 24px', borderRadius: 16, border: '1px solid #2a3a5a',
                  background: '#1a2338', color: '#94a5b8', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', flex: 1,
                }}>
                取消
              </button>
              <button onClick={() => onDelete(pet.id)}
                style={{
                  padding: '10px 24px', borderRadius: 16, border: 'none',
                  background: '#dc2626', color: 'white', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', flex: 1,
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
