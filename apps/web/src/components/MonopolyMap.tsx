'use client'

import { useState, useMemo, useCallback } from 'react'

/* ── Types ── */
export type Biome = 'plains' | 'forest' | 'lake' | 'desert' | 'mountain' | 'city' | 'mine'

export interface Cell {
  id: number
  row: number
  col: number
  biome: Biome
  owner: string | null       // user id
  ownerName?: string
  cost: number               // steps to claim
}

interface Props {
  steps: number
  userId?: string
  onClaim?: (cellId: number, cost: number) => void
}

/* ── Biome config ── */
const BIOME_CONFIG: Record<Biome, { label: string; icon: string; color: string; baseCost: number }> = {
  plains:   { label: '平原',  icon: '🌾', color: '#6b9e5a', baseCost: 50 },
  forest:   { label: '森林',  icon: '🌲', color: '#2d6a2d', baseCost: 80 },
  lake:     { label: '湖泊',  icon: '🌊', color: '#2b6cb0', baseCost: 120 },
  desert:   { label: '沙漠',  icon: '🏜️', color: '#c9a96e', baseCost: 100 },
  mountain: { label: '山脈',  icon: '🏔️', color: '#8b8b8b', baseCost: 150 },
  city:     { label: '城市',  icon: '🌆', color: '#6b46c1', baseCost: 200 },
  mine:     { label: '礦山',  icon: '💎', color: '#d97706', baseCost: 250 },
}

const BIOMES: Biome[] = ['plains','forest','lake','desert','mountain','city','mine']

/* ── Generate grid (deterministic from seed) ── */
function generateGrid(rows: number, cols: number): Cell[] {
  const cells: Cell[] = []
  const seed = 42
  let id = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Use position-based pseudo-random for consistent layout
      const idx = (r * 7 + c * 13 + seed) % BIOMES.length
      const biome = BIOMES[idx]
      const config = BIOME_CONFIG[biome]
      // Cost varies slightly per cell
      const variance = ((r * 3 + c * 5) % 7) - 3
      cells.push({
        id: id++,
        row: r,
        col: c,
        biome,
        owner: null,
        cost: Math.max(20, config.baseCost + variance * 10),
      })
    }
  }
  return cells
}

/* ── Player colors for claiming ── */
const OWNER_COLORS = [
  '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b',
  '#ef4444', '#ec4899', '#3b82f6', '#14b8a6',
]

/* ── Component ── */
export default function MonopolyMap({ steps, userId, onClaim }: Props) {
  const [cells, setCells] = useState<Cell[]>(() => generateGrid(10, 10))
  const [playerPos, setPlayerPos] = useState<number>(0) // current cell id
  const [selectedCell, setSelectedCell] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Count owned cells
  const ownedCount = useMemo(() => cells.filter(c => c.owner !== null).length, [cells])
  const myCount = useMemo(() => cells.filter(c => c.owner === userId).length, [cells, userId])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

  const handleCellClick = useCallback((cellId: number) => {
    const cell = cells[cellId]
    if (!cell) return

    if (cell.owner) {
      // Already owned - just select
      setSelectedCell(cellId)
      return
    }

    // Claim!
    if (steps < cell.cost) {
      showToast(`步數不足！需要 ${cell.cost} 步，得 ${steps} 步`)
      return
    }

    if (!userId) {
      showToast('請先登入')
      return
    }

    setCells(prev => prev.map(c =>
      c.id === cellId ? { ...c, owner: userId, ownerName: '你' } : c
    ))
    setSelectedCell(cellId)
    onClaim?.(cellId, cell.cost)
    showToast(`✅ 佔領了 ${BIOME_CONFIG[cell.biome].icon} ${BIOME_CONFIG[cell.biome].label}！`)
  }, [cells, steps, userId, onClaim, showToast])

  const selected = selectedCell !== null ? cells[selectedCell] : null
  const GRID_SIZE = 10

  return (
    <div style={{ padding: 8, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Stats bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '4px 8px 8px', gap: 8, flexShrink: 0,
      }}>
        <div style={{ fontSize: 11, color: '#94a5b8' }}>
          👣 <strong style={{color:'#f0f4f8'}}>{steps}</strong> 步可佔地
        </div>
        <div style={{ fontSize: 11, color: '#94a5b8' }}>
          🏠 你佔了 <strong style={{color:'#8b5cf6'}}>{myCount}</strong> / {ownedCount} 格
        </div>
      </div>

      {/* Grid */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        gap: 2, padding: 4,
        background: '#0f172a', borderRadius: 12, border: '1px solid #1e2a45',
        minHeight: 0,
      }}>
        {cells.map(cell => {
          const config = BIOME_CONFIG[cell.biome]
          const isOwned = cell.owner !== null
          const isMine = cell.owner === userId
          const isSelected = cell.id === selectedCell
          const isPlayerPos = cell.id === playerPos

          let bgColor = '#1a2338'
          if (isMine) bgColor = `${OWNER_COLORS[hashCode(cell.owner || '') % OWNER_COLORS.length]}33`
          else if (isOwned) bgColor = '#2a3a5a'

          return (
            <button
              key={cell.id}
              onClick={() => handleCellClick(cell.id)}
              style={{
                background: isSelected
                  ? '#8b5cf644'
                  : isPlayerPos
                    ? '#f59e0b44'
                    : bgColor,
                border: isSelected
                  ? '2px solid #8b5cf6'
                  : isPlayerPos
                    ? '2px solid #f59e0b'
                    : isMine
                      ? `1px solid ${OWNER_COLORS[hashCode(cell.owner || '') % OWNER_COLORS.length]}66`
                      : '1px solid #2a3a5a',
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isPlayerPos ? 14 : 11,
                fontFamily: 'inherit',
                position: 'relative',
                transition: 'background 0.15s, border 0.15s',
                minHeight: 0,
                aspectRatio: '1',
                padding: 0,
              }}
              title={`${config.label} (${cell.cost}步)`}
            >
              {isPlayerPos ? '📍' : config.icon}
              {isMine && (
                <span style={{
                  position: 'absolute', bottom: 1, right: 2,
                  fontSize: 7, color: '#f0f4f8', opacity: 0.7,
                }}>●</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected cell info */}
      {selected && (
        <div style={{
          flexShrink: 0, marginTop: 6, padding: '8px 10px',
          background: '#1a2338', borderRadius: 10, border: '1px solid #2a3a5a',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <span style={{fontSize:16}}>{BIOME_CONFIG[selected.biome].icon}</span>
            <span style={{fontSize:12,fontWeight:700,marginLeft:6,color:'#f0f4f8'}}>
              {BIOME_CONFIG[selected.biome].label}
            </span>
            <span style={{fontSize:10,color:'#94a5b8',marginLeft:6}}>
              ｜第 {selected.row+1} 行 第 {selected.col+1} 列
            </span>
          </div>
          <div style={{fontSize:11, color:'#94a5b8'}}>
            {selected.owner
              ? `🏠 ${selected.ownerName ?? '佔領中'}`
              : `👣 ${selected.cost} 步佔領`
            }
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: '#1a2338', color: '#f0f4f8', padding: '6px 16px',
          borderRadius: 10, fontSize: 12, fontWeight: 600,
          border: '1px solid #2a3a5a', zIndex: 9999,
          whiteSpace: 'nowrap',
          animation: 'toastIn 2s ease-out forwards',
        }}>
          {toast}
        </div>
      )}

      {/* Legend */}
      <div style={{
        flexShrink: 0, display: 'flex', gap: 4, flexWrap: 'wrap',
        justifyContent: 'center', padding: '4px 0', marginTop: 2,
      }}>
        {BIOMES.map(b => (
          <span key={b} style={{fontSize:9,color:'#5a6d85'}}>
            {BIOME_CONFIG[b].icon} {BIOME_CONFIG[b].label}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Simple string hash for stable colors ── */
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}
