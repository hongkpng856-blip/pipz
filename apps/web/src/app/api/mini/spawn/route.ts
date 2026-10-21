import { NextRequest, NextResponse } from 'next/server'

// Pipz 生活收集版 —— 物件生成 proxy
// 玩家 app 唔需要任何 API key；key 只喺 server（Vercel env）存在。
//
// 環境變數：
//   PIPZ_AI_KEY        （必需）OpenAI 相容 API key
//   PIPZ_AI_BASE_URL   （選填）預設 https://api.commandcode.ai/provider/v1
//   PIPZ_AI_MODEL      （選填）預設 deepseek/deepseek-v4-flash
//
// POST /api/mini/spawn
// body: { "category": "動物", "rarity": "稀有", "source": "衝擊", "seed": "123456" }
// 回： { "name": "...", "note": "...", "archetype": "creature", "ear": 2, "pattern": 1, "palette": "#B08968" }

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// deepseek 會先花 token 做 reasoning，實測 2-13 秒，所以要放寬 function 時限
export const maxDuration = 30

const ARCHETYPES = ['creature', 'cup', 'bottle', 'lamp', 'clock', 'box', 'chair', 'brush', 'blob'] as const
const ATTEMPT_TIMEOUT_MS = 20_000
const MAX_ATTEMPTS = 2

const SYSTEM_PROMPT = `你係一個幫手機遊戲即時生成古怪小物件嘅作家，全部用香港繁體中文（廣東話語感，可以帶少少口語）。
風格：日常、平凡之中有少少驚喜、好奇多過恐怖、唔色情、唔涉及真人、政治、品牌或商標。

只可以輸出一個 JSON object，唔可以有其他文字或 markdown code fence：
{"name":"...","note":"...","archetype":"...","ear":0,"pattern":0,"palette":"#RRGGBB"}

規則：
- name：4 至 10 個中文字，具體、有畫面感，唔好用引號。
- note：一句 30 字以內描述，講佢點出現或者畀人咩感覺。
- archetype：外觀骨架，只可以係 creature / cup / bottle / lamp / clock / box / chair / brush / blob 之一。
  物件類型只係靈感提示，可以完全唔似；寧願怪都唔好普通。
- ear：0-3 整數，只有 archetype=creature 有意義（0=無耳 1=尖耳 2=圓耳 3=觸鬚）。
- pattern：0 或 1，身上有冇花紋。
- palette：一個 hex 色，作為物件主色，要符合物件氣質（唔要純黑或純白）。`

interface SpawnBody {
  category?: string
  categoryKey?: string
  rarity?: string
  source?: string
  seed?: string | number
}

interface Generated {
  name: string
  note: string
  archetype: string
  ear: number
  pattern: number
  palette: string
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? Math.round(value) : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function sanitizePalette(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^#?([0-9a-fA-F]{6})$/)
  if (!match) return null
  const hex = match[1].toUpperCase()
  if (hex === '000000' || hex === 'FFFFFF') return null
  return `#${hex}`
}

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[\r\n]+/g, ' ').replace(/["'`]/g, '').trim().slice(0, maxLen)
}

/** 由模型輸出抽 JSON，容忍 code fence 同前後雜訊 */
function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

function normalize(json: Record<string, unknown>): Generated | null {
  const name = sanitizeText(json.name, 24)
  if (!name) return null
  const archetypeRaw = sanitizeText(json.archetype, 16).toLowerCase()
  return {
    name,
    note: sanitizeText(json.note, 60),
    archetype: (ARCHETYPES as readonly string[]).includes(archetypeRaw) ? archetypeRaw : 'creature',
    ear: clampInt(json.ear, 0, 3, 1),
    pattern: clampInt(json.pattern, 0, 1, 0),
    palette: sanitizePalette(json.palette) ?? '#B08968',
  }
}

async function attempt(params: {
  baseUrl: string
  apiKey: string
  model: string
  userPrompt: string
}): Promise<Generated | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS)
  try {
    const upstream = await fetch(`${params.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`,
        // 上游用 Cloudflare：冇正常 User-Agent 會 403（Python/undici 預設 UA 會被擋）
        'User-Agent': 'Pipz-Web/1.0 (+https://pipz.anthroskill.com)',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: 1.0,
        // 一定要夠大：deepseek 會先用 token 做 reasoning，220 會令 content 變空字串
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })

    if (!upstream.ok) return null
    const data = (await upstream.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = data.choices?.[0]?.message?.content ?? ''
    const json = extractJson(content)
    return json ? normalize(json) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.PIPZ_AI_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'server not configured' }, { status: 501 })
  }

  let body: SpawnBody = {}
  try {
    body = (await req.json()) as SpawnBody
  } catch {
    // 空 body 都容許
  }

  const category = sanitizeText(body.category, 24) || '動物'
  const rarity = sanitizeText(body.rarity, 12) || '常見'
  const source = sanitizeText(body.source, 24) || '行路'

  const baseUrl = (process.env.PIPZ_AI_BASE_URL || 'https://api.commandcode.ai/provider/v1').replace(
    /\/$/,
    ''
  )
  const model = process.env.PIPZ_AI_MODEL || 'deepseek/deepseek-v4-flash'
  const userPrompt = `物件類型：${category}\n稀有度：${rarity}\n出現情況：${source}\n\n生成一件物件。`

  // 偶爾模型會回空 content 或者爛 JSON，重試一次就夠
  for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
    const result = await attempt({ baseUrl, apiKey, model, userPrompt })
    if (result) {
      return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
    }
  }

  return NextResponse.json({ error: 'generation failed' }, { status: 502 })
}

export async function GET() {
  return NextResponse.json({
    ok: Boolean(process.env.PIPZ_AI_KEY),
    hint: 'POST { category, rarity, source } 取得一件 AI 生成物件',
  })
}
