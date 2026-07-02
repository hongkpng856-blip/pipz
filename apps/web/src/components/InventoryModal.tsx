'use client'

import { useState, useEffect } from 'react'
import { EQUIPMENT_POOL, HELP_ITEM_POOL, EquipmentDef, HelpItemDef, RARITY_COLORS, RARITY_LABELS, formatSteps } from '@pipz/core'

interface InventoryEntry {
  itemId: string
  itemType: 'equipment' | 'help'
  quantity: number
}

interface Props {
  inventory: InventoryEntry[]
  onUseHelpItem: (item: HelpItemDef) => void
  onEquipItem: (item: EquipmentDef) => void
  onClose: () => void
}

export default function InventoryModal({ inventory, onUseHelpItem, onEquipItem, onClose }: Props) {
  const [tab, setTab] = useState<'all' | 'help' | 'equipment'>('all')

  const helpItems = inventory
    .filter(e => e.itemType === 'help')
    .map(e => ({ entry: e, def: HELP_ITEM_POOL.find(d => d.id === e.itemId) }))
    .filter((x): x is { entry: InventoryEntry; def: HelpItemDef } => !!x.def)

  const equipItems = inventory
    .filter(e => e.itemType === 'equipment')
    .map(e => ({ entry: e, def: EQUIPMENT_POOL.find(d => d.id === e.itemId) }))
    .filter((x): x is { entry: InventoryEntry; def: EquipmentDef } => !!x.def)

  const filtered = tab === 'help' ? helpItems : tab === 'equipment' ? equipItems :
    [...helpItems.map(h => ({ ...h, _type: 'help' as const })), ...equipItems.map(e => ({ ...e, _type: 'equipment' as const }))]
    .sort((a, b) => (b.entry.quantity || 1) - (a.entry.quantity || 1))

  return (
    <div className="fixed-modal-layer" style={{
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
            fontSize: 16, cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit',
          }}>
            ← 返回
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f4f8' }}>
            🎒 背包
          </span>
          <span style={{ width: 40 }} />
        </div>

        {/* ── Tab bar ── */}
        <div style={{ display: 'flex', gap: 4, padding: '8px 16px', borderBottom: '1px solid #1e2a45' }}>
          {[
            { key: 'all' as const, label: '全部' },
            { key: 'help' as const, label: `道具 (${helpItems.length})` },
            { key: 'equipment' as const, label: `裝備 (${equipItems.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 10, border: 'none',
                background: tab === t.key ? 'rgba(139,92,246,0.2)' : '#1a2338',
                color: tab === t.key ? '#c084fc' : '#94a5b8',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Items list ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#5a6d85', fontSize: 12 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>
              未有{tab === 'help' ? '道具' : tab === 'equipment' ? '裝備' : '物品'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((item, i) => {
                const def = item.def
                const isHelp = 'effect' in def
                const rarity = def.rarity
                const color = RARITY_COLORS[rarity] || '#9ca3af'
                const qty = item.entry.quantity

                return (
                  <div key={`${def.id}-${i}`} style={{
                    background: '#141b2d', border: `1px solid ${color}22`, borderRadius: 14,
                    padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    {/* Icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${color}15`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>
                      {def.icon}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f4f8' }}>{def.name}</span>
                        <span style={{ fontSize: 8, color, fontWeight: 600 }}>{RARITY_LABELS[rarity]}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#5a6d85', marginTop: 1, lineHeight: 1.3 }}>
                        {'description' in def ? (def as any).description : ''}
                      </div>
                    </div>

                    {/* Qty + Action */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {qty > 1 && (
                        <span style={{ fontSize: 10, color: '#94a5b8' }}>x{qty}</span>
                      )}
                      {isHelp ? (
                        <button onClick={() => onUseHelpItem(def as any as HelpItemDef)}
                          style={{
                            fontSize: 8, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                            border: '1px solid #22c55e44', background: 'rgba(34,197,94,0.12)',
                            color: '#22c55e', cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                          使用
                        </button>
                      ) : (
                        <button onClick={() => onEquipItem(def as any as EquipmentDef)}
                          style={{
                            fontSize: 8, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                            border: '1px solid #3b82f644', background: 'rgba(59,130,246,0.12)',
                            color: '#3b82f6', cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                          裝備
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
