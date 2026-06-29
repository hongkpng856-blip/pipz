'use client'

import { useState } from 'react'
import PixelPetCanvas from '../../components/PixelPetCanvas'

export default function CatDemoPage() {
  const [anim, setAnim] = useState<'idle'|'walk'|'happy'>('walk')
  const [size, setSize] = useState(5)

  return (
    <>
      <style>{`html,body{margin:0;padding:0;background:#0b1120;height:100%;font-family:system-ui,sans-serif}`}</style>
      <div style={{background:'#0b1120',color:'#f0f4f8',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',padding:'24px 16px'}}>
        
        <h1 style={{fontSize:22,marginBottom:4}}>🐱 PixelLab Cat</h1>
        <p style={{color:'#94a5b8',fontSize:13,marginBottom:20}}>
          真正 project 測試 — seed 175 · species 0
        </p>

        {/* ── Canvas ── */}
        <div style={{
          background:'#141b2d',
          borderRadius:16,
          padding:16,
          marginBottom:20,
          width:280,
          height:280,
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          border:'1px solid #2a3a5a',
        }}>
          <PixelPetCanvas
            seed={175}
            rarity="rare"
            evolutionStage={2}
            animation={anim}
            size={size}
          />
        </div>

        {/* ── Controls ── */}
        <div style={{display:'flex',gap:8,marginBottom:20}}>
          {(['idle','walk','happy'] as const).map(a => (
            <button key={a} onClick={() => setAnim(a)}
              style={{
                padding:'10px 20px',borderRadius:10,border:'none',
                background: anim===a ? '#8b5cf644' : '#1a2338',
                color: anim===a ? '#c4b5fd' : '#5a6d85',
                fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'inherit',
              }}>
              {a === 'idle' ? '😴 Idle' : a === 'walk' ? '🚶 Walk' : '🎉 Happy'}
            </button>
          ))}
        </div>

        {/* ── Size slider ── */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <span style={{color:'#5a6d85',fontSize:12}}>細</span>
          <input type="range" min={3} max={12} value={size}
            onChange={e => setSize(parseInt(e.target.value))}
            style={{width:160}} />
          <span style={{color:'#5a6d85',fontSize:12}}>大</span>
        </div>

        {/* ── Info ── */}
        <div style={{
          background:'#141b2d',borderRadius:16,padding:16,
          maxWidth:360,width:'100%',border:'1px solid #2a3a5a'
        }}>
          <div style={{fontSize:12,fontWeight:700,marginBottom:8,color:'#94a5b8'}}>📋 Spec</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,color:'#94a5b8'}}>
            <thead><tr style={{borderBottom:'1px solid #1e2a45'}}>
              <th style={{textAlign:'left',padding:'3px 6px'}}>Property</th>
              <th style={{textAlign:'left',padding:'3px 6px'}}>Value</th>
            </tr></thead>
            <tbody>
              <tr><td style={{padding:'3px 6px'}}>Seed</td><td style={{padding:'3px 6px',color:'#f0f4f8'}}>175</td></tr>
              <tr><td style={{padding:'3px 6px'}}>Species</td><td style={{padding:'3px 6px',color:'#f0f4f8'}}>圓貓 (0)</td></tr>
              <tr><td style={{padding:'3px 6px'}}>Animation</td><td style={{padding:'3px 6px',color:'#f0f4f8'}}>PixelLab 32×32 frames</td></tr>
              <tr><td style={{padding:'3px 6px'}}>Source</td><td style={{padding:'3px 6px',color:'#f0f4f8'}}>PixelLab API (walk frame 0 ref)</td></tr>
              <tr><td style={{padding:'3px 6px'}}>Palette</td><td style={{padding:'3px 6px',color:'#f0f4f8'}}>PICO-8 (10 colors)</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
