import { NextRequest, NextResponse } from 'next/server'

// Pipz 生活收集版 —— 物件生成 proxy
// 玩家 app 唔需要任何 API key；key 只喺 server（Vercel env）存在。
//
// 環境變數：
//   PIPZ_AI_KEY        （必需）OpenAI 相容 API key
//   PIPZ_AI_BASE_URL   （選填）預設 https://api.commandcode.ai/provider/v1
//   PIPZ_AI_MODEL      （選填）逗號分隔，逐個試（預設免費 model → 付費後備）
//
// POST /api/mini/spawn
// body: { "category": "動物", "rarity": "稀有", "source": "衝擊", "seed": "123456" }
// 回： { "name": "...", "note": "...", "archetype": "creature", "ear": 2, "pattern": 1, "palette": "#B08968" }

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// deepseek 會先花 token 做 reasoning，實測 2-13 秒，所以要放寬 function 時限
export const maxDuration = 30

const ATTEMPT_TIMEOUT_MS = 13_000
// 免費 model 成功時多數 3-9 秒，慢起上嚟要 20-31 秒；唔值得等，夠鐘就交畀後備
const FREE_MODEL_TIMEOUT_MS = 9_000
// 成個請求嘅總預算，一定要細過 maxDuration（30 秒）同 iOS client timeout（26 秒）
const TOTAL_BUDGET_MS = 24_000
const MAX_ATTEMPTS = 2

// 免費 model 優先；免費 quota 用完／429 就退去付費（便宜）後備
const DEFAULT_MODELS = [
  'minimax/minimax-m3.1-flash:free',
  'deepseek/deepseek-v4-flash',
]

/** 分類 → 允許嘅外觀骨架（生物類一定要 creature，物件類唔可以變生物） */
const CATEGORY_ARCHETYPES: Record<string, string[]> = {
  動物: ['creature'],
  怪奇: ['creature'],
  家居: ['cup', 'bottle', 'lamp', 'clock', 'box', 'chair', 'blob'],
  食物: ['cup', 'bottle', 'box', 'blob'],
  植物: ['blob', 'brush', 'creature'],
  工具: ['brush', 'box', 'chair', 'clock', 'blob'],
}
const DEFAULT_ARCHETYPES = ['creature', 'cup', 'bottle', 'lamp', 'clock', 'box', 'chair', 'brush', 'blob']

const CATEGORY_KEYS: Record<string, string> = {
  animal: '動物',
  household: '家居',
  food: '食物',
  plant: '植物',
  tool: '工具',
  oddity: '怪奇',
}

/** 每次抽幾個隨機靈感，避免成日都係「半夜 + 自己」 */
const INSPIRATION = {
  moment: ['清晨', '正午', '黃昏', '凌晨兩點', '落雨天', '颱風前夕', '停電嗰晚', '禮拜日朝早', '收工之後'],
  place: ['茶餐廳', '士多', '天橋底', '巴士站', '舊樓樓梯', '廚房鋅盆邊', '床下底', '便利店雪櫃前', '街市魚檔', '圖書館還書箱', '屋企窗台'],
  texture: ['毛茸茸', '陶瓷', '生鏽鐵', '半透明', '絨布', '蠟質', '玻璃', '粗糙麻布', '濕漉漉'],
  quirk: ['打呵欠', '發呆', '偷望人', '裝死', '慢慢震', '自己唱歌', '倒轉企', '聞嘢', '數手指', '避開眼神'],
  animalKind: ['小型哺乳類', '鳥類', '昆蟲', '魚類', '爬蟲', '兩棲類', '軟體動物', '傳說生物', '混種'],
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function resolveCategory(raw: unknown, key: unknown): string {
  const text = sanitizeText(raw, 24)
  if (CATEGORY_ARCHETYPES[text]) return text
  const mapped = CATEGORY_KEYS[sanitizeText(key, 16).toLowerCase()]
  return mapped ?? '動物'
}

function buildSystemPrompt(allowed: string[], category: string): string {
  return `你係一個幫手機遊戲即時生成古怪小物件嘅作家，全部用香港繁體中文（廣東話語感，可以帶少少口語）。
風格：日常、平凡之中有少少驚喜、好奇多過恐怖、唔色情、唔涉及真人、政治、品牌或商標。

只可以輸出一個 JSON object，唔可以有其他文字或 markdown code fence：
{"name":"...","note":"...","archetype":"...","ear":0,"pattern":0,"palette":"#RRGGBB"}

規則：
- name：4 至 10 個中文字，具體、有畫面感，唔好用引號，唔好用「第X號」。
- note：一句 30 字以內描述，講佢點出現或者畀人咩感覺。
- archetype：一定要係 ${allowed.join(' / ')} 其中之一（物件類型「${category}」決定咗範圍）。
- ear：0-3 整數，只有 archetype=creature 有意義（0=無耳 1=尖耳 2=圓耳 3=觸鬚）。
- pattern：0 或 1，身上有冇花紋（大約一半機會有就好）。
- palette：一個 hex 色，作為物件主色，要符合物件氣質（唔要純黑或純白）。

嚴禁以下開頭或者用語（因為已經用得太多）：半夜、凌晨三點、自己、會嘆氣嘅、半融、半溶。
每次都要用唔同嘅場景、質感同小動作，唔好重複同一個句式。`
}

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
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/["'`]/g, '')
    .trim()
    .slice(0, maxLen)
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

function hashPick(text: string, list: string[]): string {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 1_000_003
  }
  return list[hash % list.length]
}

function normalize(json: Record<string, unknown>, allowed: string[]): Generated | null {
  const name = sanitizeText(json.name, 24)
  if (!name) return null
  const archetypeRaw = sanitizeText(json.archetype, 16).toLowerCase()
  // 模型偶爾會唔聽話（例如「動物」生成咗水壺），用名字穩定咁揀返一個合法骨架
  const archetype = allowed.includes(archetypeRaw) ? archetypeRaw : hashPick(name, allowed)
  return {
    name,
    note: sanitizeText(json.note, 60),
    archetype,
    ear: clampInt(json.ear, 0, 3, 1),
    // 模型幾乎每次都答 pattern=1，所以改用名字 hash 決定（穩定、大約一半一半）
    pattern: hashPick(name, ['0', '1']) === '1' ? 1 : 0,
    palette: sanitizePalette(json.palette) ?? '#B08968',
  }
}

async function attempt(params: {
  baseUrl: string
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
  allowed: string[]
  budgetMs: number
}): Promise<Generated | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), params.budgetMs)
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
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: 1.15,
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
    return json ? normalize(json, params.allowed) : null
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

  const category = resolveCategory(body.category, body.categoryKey)
  const rarity = sanitizeText(body.rarity, 12) || '常見'
  const source = sanitizeText(body.source, 24) || '行路'
  const allowed = CATEGORY_ARCHETYPES[category] ?? DEFAULT_ARCHETYPES

  const baseUrl = (process.env.PIPZ_AI_BASE_URL || 'https://api.commandcode.ai/provider/v1').replace(
    /\/$/,
    ''
  )
  const modelList = (process.env.PIPZ_AI_MODEL || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
  const models = modelList.length > 0 ? modelList : DEFAULT_MODELS

  // 每次抽隨機靈感：令同一分類都會生出好唔同嘅嘢
  const inspiration = [
    `場景：${pick(INSPIRATION.moment)}，${pick(INSPIRATION.place)}`,
    `質感：${pick(INSPIRATION.texture)}`,
    `小動作：${pick(INSPIRATION.quirk)}`,
  ]
  if (category === '動物' || category === '怪奇') {
    inspiration.push(`生物類型：${pick(INSPIRATION.animalKind)}`)
  }

  const userPrompt = `物件類型：${category}
稀有度：${rarity}
出現情況：${source}

靈感（可以自由發揮，唔一定要照跟，但唔好同上一件撞）：
${inspiration.join('\n')}

生成一件物件。`

  const systemPrompt = buildSystemPrompt(allowed, category)

  // 逐輪試：第一輪先免費後付費，第二輪再試一次（免費 model 延遲好飘，1.8–31 秒）
  const deadline = Date.now() + TOTAL_BUDGET_MS
  outer: for (let round = 0; round < MAX_ATTEMPTS; round += 1) {
    for (const model of models) {
      const remaining = deadline - Date.now()
      if (remaining <= 1_000) break outer
      const isFree = model.includes(':free') || model.endsWith('-free')
      const result = await attempt({
        baseUrl,
        apiKey,
        model,
        systemPrompt,
        userPrompt,
        allowed,
        budgetMs: Math.min(isFree ? FREE_MODEL_TIMEOUT_MS : ATTEMPT_TIMEOUT_MS, remaining),
      })
      if (result) {
        return NextResponse.json(
          { ...result, model, round },
          { headers: { 'Cache-Control': 'no-store' } }
        )
      }
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
