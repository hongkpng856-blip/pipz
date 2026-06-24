'use client'

import { useState } from 'react'
import { useAuth } from '../lib/auth-context'

type Mode = 'magic' | 'password'

export default function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signIn, signInWithPassword, signUp, signOut, loading } = useAuth()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  if (!open) return null

  const handleMagicLink = async () => {
    if (!email.includes('@')) { setError('請輸入有效電郵'); return }
    setSending(true); setError('')
    const err = await signIn(email)
    if (err) { setError(err); setSending(false) }
    else { setSent(true); setSending(false) }
  }

  const handlePasswordAuth = async () => {
    if (!email.includes('@')) { setError('請輸入有效電郵'); return }
    if (password.length < 6) { setError('密碼至少 6 個字'); return }
    setSending(true); setError('')

    let err: string | null = null
    if (isSignUp) {
      err = await signUp(email, password)
      if (!err) {
        // Try signing in immediately (works if email confirmation is disabled)
        err = await signInWithPassword(email, password)
        if (err && err.includes('Email not confirmed')) {
          // Email confirmation required — show success message
          setSending(false)
          setSent(true)
          return
        }
      }
    } else {
      err = await signInWithPassword(email, password)
    }

    if (err) {
      // If sign-in with password fails, maybe user doesn't have password yet
      if (err.includes('Invalid login credentials')) {
        setError('密碼錯誤。未設定過密碼？請先用 Magic Link 登入')
      } else {
        setError(err)
      }
      setSending(false)
    } else {
      // Success — close modal
      onClose()
    }
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
    setSent(false)
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

        {/* ── Header ── */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16}}>
          <span style={{fontSize:18, fontWeight:700, color:'#f0f4f8'}}>
            {user ? '帳號' : isSignUp ? '註冊' : '登入'}
          </span>
          <button onClick={onClose} style={{background:'none', border:'none', color:'#5a6d85', fontSize:20, cursor:'pointer', padding:4}}>✕</button>
        </div>

        {/* ── Already logged in ── */}
        {user ? (
          <div>
            <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
              <div style={{
                width:40, height:40, borderRadius:20,
                background:'linear-gradient(135deg,#8b5cf6,#22d3ee)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:18, fontWeight:700, color:'white'
              }}>
                {user.email?.[0].toUpperCase() || '?'}
              </div>
              <div>
                <div style={{fontSize:13, fontWeight:600, color:'#f0f4f8', wordBreak:'break-all'}}>{user.email}</div>
                <div style={{fontSize:11, color:'#22c55e'}}>● 已登入</div>
              </div>
            </div>
            <button onClick={handleSignOut} style={{
              width:'100%', padding:'10px', borderRadius:12, border:'1px solid rgba(239,68,68,0.3)',
              background:'rgba(239,68,68,0.1)', color:'#ef4444', fontSize:13, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit', marginTop:4
            }}>
              登出
            </button>
          </div>
        ) : sent ? (
          /* ── Success sent ── */
          <div style={{textAlign:'center', padding: '20px 0'}}>
            <div style={{fontSize:36, marginBottom:8}}>{isSignUp ? '✅' : '✉️'}</div>
            <p style={{color:'#94a5b8', fontSize:13, marginBottom:4}}>{isSignUp ? '註冊成功！' : '確認電郵已發送'}</p>
            <p style={{color:'#5a6d85', fontSize:11, marginBottom:16}}>
              {isSignUp
                ? '你可以直接用密碼登入'
                : `請檢查 ${email} 嘅收件箱`}
            </p>
            <button onClick={() => { setSent(false); setMode(isSignUp ? 'password' : 'magic'); setIsSignUp(false) }}
              style={{background:'none', border:'none', color:'#8b5cf6', cursor:'pointer', fontSize:12, fontFamily:'inherit'}}>
              {isSignUp ? '繼續登入' : '再 Send 一次'}
            </button>
          </div>
        ) : (
          /* ── Login form ── */
          <div>

            {/* Mode tabs */}
            <div style={{display:'flex', gap:0, marginBottom:16, background:'#1a2338', borderRadius:10, padding:3}}>
              <button onClick={() => switchMode('password')}
                style={{
                  flex:1, padding:'7px 0', borderRadius:8, border:'none',
                  background: mode === 'password' ? '#8b5cf6' : 'transparent',
                  color: mode === 'password' ? 'white' : '#5a6d85',
                  fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  transition:'all 0.15s'
                }}>
                密碼
              </button>
              <button onClick={() => switchMode('magic')}
                style={{
                  flex:1, padding:'7px 0', borderRadius:8, border:'none',
                  background: mode === 'magic' ? '#8b5cf6' : 'transparent',
                  color: mode === 'magic' ? 'white' : '#5a6d85',
                  fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  transition:'all 0.15s'
                }}>
                Magic Link
              </button>
            </div>

            {/* ── One-click test login ── */}
            <button onClick={async () => {
              setSending(true); setError('')
              const err = await signInWithPassword('pipztest@gmail.com', 'Test123456!')
              if (err) { setError(err); setSending(false) }
              else { onClose() }
            }} style={{
              width:'100%', padding:'8px 0', borderRadius:10, border:'1px solid rgba(34,197,94,0.3)',
              background:'rgba(34,197,94,0.1)', color:'#22c55e', fontSize:11, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit', marginBottom:10, display:'flex',
              alignItems:'center', justifyContent:'center', gap:4,
            }}>
              <span>🔑 一鍵登入測試帳號</span>
            </button>

            {/* Email */}
            <input
              type="email" placeholder="你嘅電郵"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (mode === 'password' ? handlePasswordAuth() : handleMagicLink())}
              autoFocus
              style={{
                width:'100%', padding:'10px 14px', borderRadius:12, border:'1px solid #2a3a5a',
                background:'#1a2338', color:'#f0f4f8', fontSize:14, outline:'none',
                boxSizing:'border-box', marginBottom:10
              }}
            />

            {/* Password (password mode only) */}
            {mode === 'password' && (
              <input
                type="password" placeholder="密碼"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePasswordAuth()}
                style={{
                  width:'100%', padding:'10px 14px', borderRadius:12, border:'1px solid #2a3a5a',
                  background:'#1a2338', color:'#f0f4f8', fontSize:14, outline:'none',
                  boxSizing:'border-box', marginBottom:12
                }}
              />
            )}

            {/* Error */}
            {error && <p style={{color:'#ef4444', fontSize:11, marginBottom:8}}>{error}</p>}

            {/* Submit */}
            {mode === 'password' ? (
              <>
                <button onClick={handlePasswordAuth} disabled={sending}
                  style={{
                    width:'100%', padding:'10px 0', borderRadius:12, border:'none',
                    background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                    color:'white', fontSize:13, fontWeight:700,
                    cursor:'pointer', fontFamily:'inherit', opacity: sending ? 0.6 : 1,
                    marginBottom:8
                  }}>
                  {sending ? '處理中...' : isSignUp ? '註冊' : '登入'}
                </button>
                <div style={{textAlign:'center'}}>
                  <button onClick={() => { setIsSignUp(!isSignUp); setError('') }}
                    style={{background:'none', border:'none', color:'#8b5cf6', cursor:'pointer', fontSize:11, fontFamily:'inherit'}}>
                    {isSignUp ? '已有帳號？登入' : '未有帳號？註冊'}
                  </button>
                </div>
              </>
            ) : (
              <button onClick={handleMagicLink} disabled={sending}
                style={{
                  width:'100%', padding:'10px 0', borderRadius:12, border:'none',
                  background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                  color:'white', fontSize:13, fontWeight:700,
                  cursor:'pointer', fontFamily:'inherit', opacity: sending ? 0.6 : 1,
                }}>
                {sending ? '發送中...' : '發送 Magic Link'}
              </button>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
