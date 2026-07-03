'use client'

import { useState, useEffect } from 'react'

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  related_pet_id: string | null
  read: boolean
  created_at: string
}

interface Props {
  open: boolean
  onClose: () => void
  userId: string | null
}

export default function NotificationModal({ open, onClose, userId }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !userId) return
    loadNotifications()
  }, [open, userId])

  const loadNotifications = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`)
      const json = await res.json()
      setNotifications(json.notifications ?? [])
    } catch {}
    setLoading(false)
  }

  const markAllRead = async () => {
    if (!userId) return
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', ids: unreadIds, userId }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  if (!open) return null

  const unreadCount = notifications.filter(n => !n.read).length
  const ICONS: Record<string, { icon: string; color: string }> = {
    pet_sold:       { icon: '💰', color: '#f59e0b' },
    pet_bought:     { icon: '🎉', color: '#22c55e' },
    egg_hatched:    { icon: '🐣', color: '#a855f7' },
    pet_evolved:    { icon: '🌟', color: '#f59e0b' },
    milestone:      { icon: '🏆', color: '#3b82f6' },
    achievement:    { icon: '⭐', color: '#eab308' },
    egg_encounter:  { icon: '🥚', color: '#ec4899' },
    pet_care:       { icon: '🍖', color: '#ef4444' },
    reward:         { icon: '🎁', color: '#8b5cf6' },
    system:         { icon: '📢', color: '#64748b' },
    info:           { icon: 'ℹ️', color: '#5a6d85' },
  }

  return (
    <div className="fixed-modal-layer" style={{
      display: 'flex', justifyContent: 'center',
      background: '#0b1120',
      overflow: 'hidden',
      bottom: '85px',
    }}>
      <div style={{
        width: '100%', maxWidth: '24rem',
        display: 'flex', flexDirection: 'column',
        background: '#0b1120',
        height: 'calc(100dvh - 85px)',
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
            🔔 通知
            {unreadCount > 0 && (
              <span style={{
                marginLeft: 6, fontSize: 10, color: '#f0f4f8',
                background: '#ef4444', padding: '1px 7px', borderRadius: 10,
                verticalAlign: 'middle',
              }}>
                {unreadCount}
              </span>
            )}
          </span>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{
              background: 'none', border: 'none', color: '#8b5cf6',
              fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              全部已讀
            </button>
          )}
          {unreadCount === 0 && <div style={{ width: 60 }} />}
        </div>

        {/* ── List ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#5a6d85', fontSize: 13 }}>
              ⏳ 載入中...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#5a6d85' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔔</div>
              <div style={{ fontSize: 12 }}>未有通知</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {notifications.map(n => (
                <div key={n.id} style={{
                  display: 'flex', gap: 10,
                  padding: '12px 14px', borderRadius: 14,
                  background: n.read ? '#141b2d' : '#1a2540',
                  border: `1px solid ${n.read ? '#1e2a45' : (ICONS[n.type]?.color || '#8b5cf6') + '44'}`,
                  borderLeft: `3px solid ${ICONS[n.type]?.color || '#5a6d85'}`,
                  opacity: n.read ? 0.7 : 1,
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>
                    {ICONS[n.type]?.icon || 'ℹ️'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      color: n.read ? '#94a5b8' : '#f0f4f8',
                    }}>
                      {n.title}
                    </div>
                    <div style={{
                      fontSize: 11, color: '#5a6d85', marginTop: 2,
                    }}>
                      {n.message}
                    </div>
                    <div style={{
                      fontSize: 9, color: '#3a4a5a', marginTop: 4,
                    }}>
                      {new Date(n.created_at).toLocaleString('zh-HK')}
                    </div>
                  </div>
                  {!n.read && (
                    <span style={{
                      width: 8, height: 8, borderRadius: 4,
                      background: '#8b5cf6', flexShrink: 0, marginTop: 6,
                    }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
