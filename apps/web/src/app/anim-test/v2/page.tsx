'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { generatePixelPet, generatePetAnimation, drawPixelGrid } from '@pipz/core'

// ── 20 diverse seeds ──
const ALL_SEEDS = [1, 42, 99, 302, 777, 1111, 2024, 3301, 4040, 5555, 6666, 7777, 8888, 9999, 12345, 25000, 50000, 75000, 88888, 99999]

// ── Pixel cat walk ──
type Grid = string[]
const C = ['#000000','#1d2b53','#7e2553','#ff77a8','#ab5236','#5f574f','#c2c3c7','#fff1e8','#29adff','#ffa300']
const CAT_WALK: Grid[] = [
  ["66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666677776666666666666","66666666666667777777766666666666","66666666666667777767776666666666","66666666666677776666776666666666","66666666666677766666656666666666","66666666666776666666566666666666","66666666653776666666336536666666","66666666334666666665333345666666","66666666336666666653333333666666","66666666436666661313333133566666","66666666134333933313333563566666","66666666643333333313377747166666","66666666633333333334464637666666","66666666613333333334411156666666","66666666413333434433333411666666","66666634441333144413331551666666","66666174166133166666666666666666","66666616666633166666666666666666","66666666666644166666666666666666","66666666666617716666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666"],
  ["66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666661666666666666666666666666","66666617166666666666666666666666","66666177666666666666666666666666","66666177766666666666666666666666","66666667776666666666666666666666","66666665777666666666666666666666","66666666177166666666666666666666","66666666134666666666666666666666","66666661335666666666566666666666","66666661316666666666336636666666","66666661316666666661333346666666","66666661316666661113333331666666","66666666331111133313333133666666","66666666133333333313333565666666","66666666633333333333677567666666","66666666633333333334367546666666","66666666643333333433411166666666","66666666623345343333541666666666","66666666613316133711147166666666","66666666615166117766155666666666","66666666614466617766666666666666","66666666661166617166666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666"],
  ["66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66665776666666666666666666666666","66666677666666666666666666666666","66666179166666666666666666666666","66666639166666666666666666666666","66666649566666666665666666666666","66666649166666666653366316666666","66666619966511166653699356666666","66666664913333993114393736666666","66666666433333333933341331666666","66666666133333333333376913666666","66666666433333333394777151666666","66666666443343333391161116666666","66666666143314913397661666666666","66666661444966619916641666666666","66666661451451113916144566666666","66666666776166661776617766666666","66666666666666666516666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666"],
  ["66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666556677777766666666666666","66666666777777777777766666666666","66666666777566666666766666666666","66666666166566666666666666666666","66666666131666666666666666666666","66666666435666666666556656666666","66666666436666666665331134666666","66666666436666666661333346666666","66666666435113333334333334666666","66666666133333333333333533566666","66666666133333333333337747666666","66666666433333333331377451666666","66666661433333333334111176666666","66666614334433343333466666666666","66666649445333343333666666666666","66666636566616712476166666666666","66666146116666644657716666666666","66666166666666141661771666666666","66666611666666116666516666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666","66666666666666666666666666666666"],
]

function CatWalkAnim() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!; const x = c.getContext('2d')!
    c.width = 32*6; c.height = 32*6; let f=0, t=0
    function r(ts:number){if(ts-t>=150){t=ts;f=(f+1)%4}
      x.clearRect(0,0,c.width,c.height)
      for(let y=0;y<CAT_WALK[f].length;y++)for(let X=0;X<CAT_WALK[f][y].length;X++){const ci=parseInt(CAT_WALK[f][y][X],10);x.fillStyle=C[ci];x.fillRect(X*6,y*6,6,6)}
      requestAnimationFrame(r)}
    const id=requestAnimationFrame(r);return()=>cancelAnimationFrame(id)
  },[])
  return <canvas ref={ref} style={{imageRendering:'pixelated',borderRadius:8,width:140,height:140}}/>
}

// ── Single pet player ──
const ANIM_KEYS = ['walk','idle','play'] as const
const ANIM_LABEL:{[k:string]:{i:string,c:string}} = {walk:{i:'🚶',c:'#ffa300'},idle:{i:'😴',c:'#29adff'},play:{i:'🎉',c:'#ff77a8'}}
const ANIM_SPD:{[k:string]:number} = {walk:150,idle:180,play:120}

function PetViewer({seed}:{seed:number}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [anim,setAnim] = useState<'walk'|'idle'|'play'>('walk')
  const pd = useMemo(()=>generatePixelPet({seed,rarity:'rare',evolutionStage:2}),[seed])
  const animData = useMemo(()=>generatePetAnimation(pd),[seed])

  useEffect(()=>{
    const c=ref.current!;const x=c.getContext('2d')!
    c.width=16*10;c.height=16*10;let f=0,t=0
    const spd=ANIM_SPD[anim];const frames=anim==='walk'?animData.walkFrames:anim==='play'?animData.playFrames:animData.idleFrames
    function r(ts:number){if(ts-t>=spd){t=ts;f=(f+1)%4}
      x.clearRect(0,0,c.width,c.height);drawPixelGrid(x,frames[f],10,0,0)
      requestAnimationFrame(r)}
    const id=requestAnimationFrame(r);return()=>cancelAnimationFrame(id)
  },[anim,seed])

  return <div style={{textAlign:'center',padding:12,background:'#141b2d',borderRadius:16}}>
    <canvas ref={ref} style={{imageRendering:'pixelated',borderRadius:8,width:100,height:100}}/>
    <div style={{fontSize:10,color:'#5a6d85',marginTop:4}}>#{pd.speciesName}</div>
    <div style={{display:'flex',gap:4,marginTop:8}}>
      {ANIM_KEYS.map(a=>
        <button key={a} onClick={()=>setAnim(a)}
          style={{flex:1,padding:'5px 0',borderRadius:8,border:'none',
            background:anim===a?ANIM_LABEL[a].c+'33':'#1a2338',
            color:anim===a?ANIM_LABEL[a].c:'#5a6d85',
            fontWeight:700,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
          {ANIM_LABEL[a].i} {a}
        </button>
      )}
    </div>
  </div>
}

export default function AnimTestV2Page() {
  const [idx, setIdx] = useState(0)

  // Arrow nav
  const prev = useCallback(()=>setIdx(i=>(i-1+ALL_SEEDS.length)%ALL_SEEDS.length),[])
  const next = useCallback(()=>setIdx(i=>(i+1)%ALL_SEEDS.length),[])
  const seed = ALL_SEEDS[idx]

  return (
    <>
      <style>{`html,body{margin:0;padding:0;background:#0b1120;height:auto;overflow-y:scroll;-webkit-overflow-scrolling:touch}body>*{overflow:visible}`}</style>
      <div style={{background:'#0b1120',color:'#f0f4f8',fontFamily:'system-ui,sans-serif',padding:'16px 16px 100px',overflow:'visible'}}>
        <div style={{maxWidth:420,margin:'0 auto'}}>

          <h1 style={{fontSize:20,marginBottom:2}}>🎮 3 動作 Preview</h1>
          <p style={{color:'#94a5b8',fontSize:12,marginBottom:4}}>
            每隻寵物: 🚶walk · 😴idle · 🎉play
          </p>
          <p style={{color:'#ef4444',fontSize:11,marginBottom:16,fontStyle:'italic'}}>
            ⚠️ 測試用 · 未上正式 app
          </p>

          {/* ── PixelLab Cat ── */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>🐱 PixelLab Cat (32×32)</div>
            <div style={{background:'#141b2d',borderRadius:16,padding:20,display:'flex',justifyContent:'center'}}>
              <CatWalkAnim />
            </div>
          </div>

          {/* ── Pet display: single pet with nav ── */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>
              🎲 Procedural Pet <span style={{color:'#5a6d85',fontSize:11,fontWeight:400}}>({idx+1}/{ALL_SEEDS.length})</span>
            </div>

            {/* Nav bar */}
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <button onClick={prev}
                style={{background:'#1a2338',border:'none',borderRadius:10,color:'#f0f4f8',
                  fontSize:18,cursor:'pointer',padding:'8px 12px',fontFamily:'inherit'}}>
                ◀
              </button>
              <div style={{flex:1,textAlign:'center',fontSize:13,color:'#94a5b8',
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                #{generatePixelPet({seed,rarity:'rare',evolutionStage:2}).speciesName}
              </div>
              <button onClick={next}
                style={{background:'#1a2338',border:'none',borderRadius:10,color:'#f0f4f8',
                  fontSize:18,cursor:'pointer',padding:'8px 12px',fontFamily:'inherit'}}>
                ▶
              </button>
            </div>

            <PetViewer seed={seed} />
          </div>

          {/* ── Quick grid: see all species at a glance ── */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>📋 All {ALL_SEEDS.length} Species</div>
            <p style={{color:'#5a6d85',fontSize:11,marginBottom:8}}>
              Tap to view full animation
            </p>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {ALL_SEEDS.map((s,i)=>{
                const pd=generatePixelPet({seed:s,rarity:'rare',evolutionStage:2})
                return <button key={s} onClick={()=>setIdx(i)}
                  style={{
                    padding:'3px 8px',borderRadius:8,border:'1px solid #2a3a5a',
                    background:idx===i?'#8b5cf633':'transparent',
                    color:idx===i?'#c4b5fd':'#5a6d85',
                    fontSize:9,cursor:'pointer',fontFamily:'inherit',
                  }}>
                  {pd.speciesName}
                </button>
              })}
            </div>
          </div>

          {/* ── Spec ── */}
          <div style={{background:'#141b2d',borderRadius:16,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>📋 Spec</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,color:'#94a5b8'}}>
              <thead><tr style={{borderBottom:'1px solid #1e2a45'}}>
                <th style={{textAlign:'left',padding:'3px 6px'}}>動作</th>
                <th style={{textAlign:'left',padding:'3px 6px'}}>Frames</th>
                <th style={{textAlign:'left',padding:'3px 6px'}}>Timing</th>
                <th style={{textAlign:'left',padding:'3px 6px'}}>Description</th>
              </tr></thead>
              <tbody>
                <tr style={{borderBottom:'1px solid #1a2338'}}>
                  <td style={{padding:'3px 6px',color:'#ffa300'}}>🚶 Walk</td>
                  <td style={{padding:'3px 6px'}}>4</td><td style={{padding:'3px 6px'}}>150ms</td>
                  <td style={{padding:'3px 6px'}}>contact → strideR → contact → strideL</td>
                </tr>
                <tr style={{borderBottom:'1px solid #1a2338'}}>
                  <td style={{padding:'3px 6px',color:'#29adff'}}>😴 Idle</td>
                  <td style={{padding:'3px 6px'}}>4</td><td style={{padding:'3px 6px'}}>180ms</td>
                  <td style={{padding:'3px 6px'}}>normal → blink → ear twitch → normal</td>
                </tr>
                <tr>
                  <td style={{padding:'3px 6px',color:'#ff77a8'}}>🎉 Play</td>
                  <td style={{padding:'3px 6px'}}>4</td><td style={{padding:'3px 6px'}}>120ms</td>
                  <td style={{padding:'3px 6px'}}>bounce → squish → stretchR → stretchL</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </>
  )
}
