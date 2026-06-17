'use client'

import { useState } from 'react'
import { useAuth } from '../lib/auth-context'

export default function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signIn, signOut, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSignIn = async () => {
    if (!email.includes('@')) { setError('請輸入有效電郵'); return }
    setSending(true); setError('')
    const err = await signIn(email)
    if (err) { setError(err); setSending(false) }
    else { setSent(true); setSending(false) }
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      padding: 16
    }} onClick={onClose}>
      <div style={{
        background: '#141b2d', border: '1px solid #1e2a45', borderRadius: 20,
        padding: 24, width: '100%', maxWidth: 320,
      }} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16}}>
          <span style={{fontSize:18, fontWeight:700, color:'#f0f4f8'}}>登入</span>
          <button onClick={onClose} style={{background:'none', border:'none', color:'#5a6d85', fontSize:20, cursor:'pointer', padding:4}}>✕</button>
        </div>

        {user ? (
          <div>
            <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
              <div style={{width:40, height:40, borderRadius:20, background:'#8b5cf6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18}}>
                {user.email?.[0].toUpperCase() || '?'}
              </div>
              <div>
                <div style={{fontSize:13, fontWeight:600, color:'#f0f4f8'}}>{user.email}</div>
                <div style={{fontSize:11, color:'#5a6d85'}}>已登入</div>
              </div>
            </div>
            <button onClick={handleSignOut} className="btn btn-ghost" style={{width:'100%', justifyContent:'center'}}>
              登出
            </button>
          </div>
        ) : sent ? (
          <div style={{textAlign:'center', padding: '20px 0'}}>
            <div style={{fontSize:36, marginBottom:8}}>✉️</div>
            <p style={{color:'#94a5b8', fontSize:13, marginBottom:4}}>確認電郵已發送</p>
            <p style={{color:'#5a6d85', fontSize:11}}>請檢查 {email} 嘅收件箱</p>
          </div>
        ) : (
          <div>
            <p style={{color:'#94a5b8', fontSize:12, marginBottom:12}}>輸入電郵，我哋會 send  Magic Link 俾你</p>
            <input
              type="email" placeholder="你嘅電郵"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              style={{
                width:'100%', padding:'10px 14px', borderRadius:12, border:'1px solid #2a3a5a',
                background:'#1a2338', color:'#f0f4f8', fontSize:14, outline:'none',
                boxSizing:'border-box', marginBottom:12
              }}
            />
            {error && <p style={{color:'#ef4444', fontSize:11, marginBottom:8}}>{error}</p>}
            <button onClick={handleSignIn} disabled={sending}
              className="btn btn-primary" style={{width:'100%', justifyContent:'center', opacity: sending ? 0.6 : 1}}>
              {sending ? '發送中...' : '發送 Magic Link'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
