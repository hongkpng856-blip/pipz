'use client'

import { createClient } from '@supabase/supabase-js'
import type { Pet, PetSkill } from '@pipz/core'

// ── Client ──

let _client: ReturnType<typeof createClient> | null = null

function db() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}

// ── Types matching our SQL schema ──

interface DbProfile {
  id: string
  username: string | null
  total_steps: number
  created_at: string
}

interface DbPet {
  id: string
  user_id: string
  name: string
  species_id: string
  image_url: string
  rarity: string
  level: number
  xp: number
  total_steps: number
  evolution_stage: number
  status: string
  speed: number
  luck: number
  charm: number
  energy: number
  mood: string
  mood_value: number
  last_fed_at: string
  last_interaction_at: string
  created_at: string
  is_for_sale: boolean
  price: number
  skills?: any // JSONB — array of PetSkill
}

// ── Profile ──

export async function ensureProfile(userId: string): Promise<DbProfile | null> {
  const supabase = db()

  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (existing) return existing as unknown as DbProfile

  const { data: user } = await supabase.auth.getUser()
  const username = user?.user?.email?.split('@')[0] ?? 'player'

  // Use upsert to avoid race condition on concurrent calls
  const { data: created } = await supabase
    .from('profiles')
    .upsert({ id: userId, username, total_steps: 0 } as never, { onConflict: 'id', ignoreDuplicates: false })
    .select()
    .single()

  return (created as unknown as DbProfile) ?? null
}

export async function getProfile(userId: string): Promise<DbProfile | null> {
  const supabase = db()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data as unknown as DbProfile | null
}

export async function updateTotalSteps(userId: string, steps: number) {
  const supabase = db()
  const { error } = await supabase
    .from('profiles')
    .update({ total_steps: steps } as never)
    .eq('id', userId)
  return error
}

// ── Daily Activity ──

export async function upsertDailySteps(
  userId: string,
  steps: number,
  date: string = new Date().toISOString().split('T')[0]
) {
  const supabase = db()

  // Use upsert to avoid TOCTOU race between select and insert/update
  const { error } = await supabase
    .from('daily_activity')
    .upsert({ user_id: userId, date, steps } as never, { onConflict: 'user_id,date', ignoreDuplicates: false })
  return error
}

export async function getWeeklySteps(userId: string): Promise<{date: string; dayLabel: string; steps: number; isToday: boolean}[]> {
  const supabase = db()
  const days: {date: string; dayLabel: string; steps: number; isToday: boolean}[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayLabel = i === 0 ? '今日' : ['日','一','二','三','四','五','六'][d.getDay()]
    days.push({ date: dateStr, dayLabel, steps: 0, isToday: i === 0 })
  }

  const { data } = await supabase
    .from('daily_activity')
    .select('date, steps')
    .eq('user_id', userId)
    .gte('date', days[0].date)
    .lte('date', days[6].date)
    .order('date', { ascending: true })

  const rows = (data as unknown as {date: string; steps: number}[]) ?? []
  for (const row of rows) {
    const match = days.find(d => d.date === row.date)
    if (match) match.steps = row.steps
  }

  return days
}

export async function getTodaySteps(userId: string): Promise<number> {
  const supabase = db()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('daily_activity')
    .select('steps')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()
  return (data as unknown as { steps: number } | null)?.steps ?? 0
}

// ── Eggs ──

interface DbEgg {
  id: string
  user_id: string
  rarity: string
  collected_at: string
}

export async function loadEggs(userId: string): Promise<{id:string; rarity:string; collectedAt:number}[]> {
  const supabase = db()
  const { data } = await supabase
    .from('eggs')
    .select('*')
    .eq('user_id', userId)
    .order('collected_at', { ascending: false })
  return ((data as unknown as DbEgg[]) ?? []).map(e => ({
    id: e.id,
    rarity: e.rarity,
    collectedAt: new Date(e.collected_at).getTime(),
  }))
}

export async function saveEgg(userId: string, rarity: string, eggId?: string): Promise<string | null> {
  const supabase = db()
  const insertData: Record<string, any> = { user_id: userId, rarity }
  if (eggId) insertData.id = eggId
  const { data, error } = await supabase
    .from('eggs')
    .insert(insertData as never)
    .select('id')
    .single()
  if (error) {
    console.error('saveEgg error:', error.message)
    return null
  }
  return (data as unknown as { id: string } | null)?.id ?? null
}

export async function deleteEgg(eggId: string): Promise<string | null> {
  const supabase = db()
  const { error } = await supabase
    .from('eggs')
    .delete()
    .eq('id', eggId)
  return error?.message ?? null
}

// ── Favorites ──

export async function loadFavorites(userId: string): Promise<string[]> {
  const supabase = db()
  const { data } = await supabase
    .from('pets')
    .select('id')
    .eq('user_id', userId)
    .not('favorite_order', 'is', null)
    .order('favorite_order', { ascending: true })
  return ((data as unknown as { id: string }[]) ?? []).map(p => p.id)
}

export async function setFavoriteOrder(petId: string, order: number | null): Promise<string | null> {
  const supabase = db()
  const { error } = await supabase
    .from('pets')
    .update({ favorite_order: order } as never)
    .eq('id', petId)
  return error?.message ?? null
}

// ── Pets ──

function petToDb(userId: string, p: Pet): Record<string, unknown> {
  return {
    user_id: userId,
    name: p.name,
    species_id: p.speciesId,
    image_url: p.imageUrl,
    rarity: p.rarity,
    level: p.level,
    xp: p.xp,
    total_steps: p.totalSteps,
    evolution_stage: p.evolutionStage,
    status: p.status,
    speed: p.stats.speed,
    luck: p.stats.luck,
    charm: p.stats.charm,
    energy: p.stats.energy,
    mood: p.mood,
    mood_value: p.moodValue,
    last_fed_at: new Date(p.lastFedAt).toISOString(),
    last_interaction_at: new Date(p.lastInteractionAt).toISOString(),
    is_for_sale: p.isForSale,
    price: p.price,
    skills: p.skills,
  }
}

function dbToPet(d: DbPet): Pet {
  return {
    id: d.id,
    userId: d.user_id,
    name: d.name,
    speciesId: d.species_id,
    imageUrl: d.image_url,
    rarity: d.rarity as Pet['rarity'],
    level: d.level,
    xp: d.xp,
    totalSteps: d.total_steps,
    evolutionStage: d.evolution_stage,
    status: d.status as Pet['status'],
    stats: {
      speed: d.speed,
      luck: d.luck,
      charm: d.charm,
      energy: d.energy,
    },
    skills: d.skills ? (Array.isArray(d.skills) ? d.skills as PetSkill[] : []) : [],
    mood: d.mood as Pet['mood'],
    moodValue: d.mood_value,
    lastFedAt: new Date(d.last_fed_at).getTime(),
    lastInteractionAt: new Date(d.last_interaction_at).getTime(),
    createdAt: new Date(d.created_at).getTime(),
    isForSale: d.is_for_sale,
    price: d.price,
  }
}

export async function loadPets(userId: string): Promise<Pet[]> {
  const supabase = db()
  const { data } = await supabase
    .from('pets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return ((data as unknown as DbPet[]) ?? []).map(dbToPet)
}

export async function savePet(userId: string, pet: Pet): Promise<string | null> {
  const supabase = db()
  const record = petToDb(userId, pet)

  const { data, error } = await supabase
    .from('pets')
    .insert(record as never)
    .select('id')
    .single()

  if (error) {
    console.error('savePet error:', error.message)
    return null
  }
  return (data as unknown as { id: string } | null)?.id ?? null
}

export async function updatePet(pet: Pet): Promise<string | null> {
  const supabase = db()
  const { user_id: _unused, ...record } = petToDb(pet.userId, pet) as Record<string, unknown> & { user_id: string }

  const { error } = await supabase
    .from('pets')
    .update(record as never)
    .eq('id', pet.id)

  return error?.message ?? null
}

export async function deletePet(petId: string): Promise<string | null> {
  const supabase = db()
  const { error } = await supabase
    .from('pets')
    .delete()
    .eq('id', petId)
  return error?.message ?? null
}

// ── Market / Trading ──

export async function loadAllMarketData(userId: string): Promise<{ listings: Pet[]; myListings: Pet[] }> {
  try {
    const res = await fetch('/api/market')
    if (!res.ok) return { listings: [], myListings: [] }
    const json = await res.json()
    const all = (json.listings ?? []).map(dbToPet)
    return {
      listings: all.filter((p: Pet) => p.userId !== userId),
      myListings: all.filter((p: Pet) => p.userId === userId),
    }
  } catch {
    return { listings: [], myListings: [] }
  }
}

export async function loadMarketListings(userId: string): Promise<Pet[]> {
  const { listings } = await loadAllMarketData(userId)
  return listings
}

export async function loadMyListings(userId: string): Promise<Pet[]> {
  try {
    const res = await fetch('/api/market')
    if (!res.ok) return []
    const json = await res.json()
    // Only own listed pets
    return (json.listings ?? []).filter((p: any) => p.user_id === userId).map(dbToPet)
  } catch {
    return []
  }
}

export async function listPet(
  petId: string,
  price: number
): Promise<string | null> {
  const supabase = db()
  const { error } = await supabase
    .from('pets')
    .update({ is_for_sale: true, price } as never)
    .eq('id', petId)
  return error?.message ?? null
}

export async function unlistPet(petId: string): Promise<string | null> {
  const supabase = db()
  const { error } = await supabase
    .from('pets')
    .update({ is_for_sale: false, price: 0 } as never)
    .eq('id', petId)
  return error?.message ?? null
}

export async function buyPet(
  petId: string,
  buyerId: string,
  sellerId: string,
  price: number
): Promise<string | null> {
  try {
    const res = await fetch('/api/market', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'buy', petId, buyerId, sellerId, price }),
    })
    if (!res.ok) {
      const json = await res.json()
      return json.error || '購買失敗'
    }
    return null
  } catch {
    return '網絡錯誤'
  }
}

// ── Create notification (client-side via API) ──

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  relatedPetId?: string,
) {
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        userId,
        type,
        title,
        message,
        relatedPetId: relatedPetId ?? null,
      }),
    })
  } catch { /* silent */ }
}

// ── Milestone thresholds ──

export const MILESTONES = [
  1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000,
]

// ── Roguelike: Equipment ──

export async function equipItem(
  userId: string,
  petId: string,
  equipmentId: string,
  slot: string
): Promise<string | null> {
  const supabase = db()
  const { error } = await supabase
    .from('pet_equipment')
    .upsert({ user_id: userId, pet_id: petId, equipment_id: equipmentId, slot } as never,
      { onConflict: 'pet_id,slot', ignoreDuplicates: false })
  return error?.message ?? null
}

export async function unequipSlot(petId: string, slot: string): Promise<string | null> {
  const supabase = db()
  const { error } = await supabase
    .from('pet_equipment')
    .delete()
    .eq('pet_id', petId)
    .eq('slot', slot)
  return error?.message ?? null
}

export async function loadPetEquipment(petId: string): Promise<{equipmentId: string; slot: string}[]> {
  const supabase = db()
  const { data } = await supabase
    .from('pet_equipment')
    .select('equipment_id, slot')
    .eq('pet_id', petId)
  return ((data as unknown as {equipment_id: string; slot: string}[]) ?? []).map(d => ({
    equipmentId: d.equipment_id, slot: d.slot,
  }))
}

// ── Roguelike: Inventory ──

export async function addInventoryItem(
  userId: string,
  itemId: string,
  itemType: 'equipment' | 'help',
  quantity: number = 1,
): Promise<string | null> {
  const supabase = db()
  // Try insert first (fails if exists)
  const { error: insertError } = await supabase
    .from('inventory')
    .insert({ user_id: userId, item_id: itemId, item_type: itemType, quantity } as never)

  if (insertError?.message?.includes('duplicate key')) {
    // Already exists — increment quantity
    const { error: updateError } = await supabase.rpc('increment_inventory', {
      p_user_id: userId, p_item_id: itemId, p_quantity: quantity,
    } as never)
    return updateError?.message ?? null
  }
  return insertError?.message ?? null
}

export async function removeInventoryItem(
  userId: string,
  itemId: string,
  quantity: number = 1,
): Promise<string | null> {
  const supabase = db()
  const { error } = await supabase.rpc('decrement_inventory', {
    p_user_id: userId, p_item_id: itemId, p_quantity: quantity,
  } as never)
  return error?.message ?? null
}

export async function loadInventory(userId: string): Promise<{itemId: string; itemType: string; quantity: number}[]> {
  const supabase = db()
  const { data } = await supabase
    .from('inventory')
    .select('item_id, item_type, quantity')
    .eq('user_id', userId)
    .gt('quantity', 0)
  return ((data as unknown as {item_id: string; item_type: string; quantity: number}[]) ?? []).map(d => ({
    itemId: d.item_id, itemType: d.item_type, quantity: d.quantity,
  }))
}

// ── Roguelike: Event Log ──

export async function logEvent(
  userId: string,
  eventId: string,
  petId?: string,
  choiceIndex?: number,
): Promise<void> {
  const supabase = db()
  await supabase.from('event_log').insert({
    user_id: userId, event_id: eventId,
    pet_id: petId ?? null, choice_index: choiceIndex ?? null,
  } as never)
}

// ── Monopoly Properties ──

export interface Property {
  id: number
  userId: string
  anchorLat: number
  anchorLng: number
  cellRow: number
  cellCol: number
  purchasedAt: string
  price: number
  name: string | null
  isListed: boolean
  listPrice: number | null
  sellerName?: string | null
  locationName?: string
}

function mapDbProp(d: any): Property {
  return {
    id: d.id,
    userId: d.user_id,
    anchorLat: d.anchor_lat,
    anchorLng: d.anchor_lng,
    cellRow: d.cell_row,
    cellCol: d.cell_col,
    purchasedAt: d.purchased_at,
    price: d.price,
    name: d.name,
    isListed: d.is_listed ?? false,
    listPrice: d.list_price ?? null,
    sellerName: d.profiles?.username ?? null,
  }
}

export async function loadProperties(userId: string): Promise<Property[]> {
  const supabase = db()
  const { data } = await supabase
    .from('properties')
    .select('*')
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false })
  return ((data as any[]) ?? []).map(mapDbProp)
}

/** Cell coordinates for flag rendering — all users */
export interface FlagCell {
  anchorLat: number
  anchorLng: number
  cellRow: number
  cellCol: number
}

export async function fetchAllFlagCells(): Promise<FlagCell[]> {
  const res = await fetch('/api/properties/all-cells')
  if (!res.ok) return []
  return res.json()
}

export async function getPropertyOwner(
  anchorLat: number, anchorLng: number, cellRow: number, cellCol: number
): Promise<{ userId: string; price: number } | null> {
  const supabase = db()
  const { data } = await supabase
    .from('properties')
    .select('user_id, price')
    .eq('anchor_lat', anchorLat)
    .eq('anchor_lng', anchorLng)
    .eq('cell_row', cellRow)
    .eq('cell_col', cellCol)
    .maybeSingle()
  if (!data) return null
  return { userId: (data as any).user_id, price: (data as any).price }
}

export async function buyProperty(
  userId: string,
  anchorLat: number, anchorLng: number,
  cellRow: number, cellCol: number,
  price: number,
): Promise<string | null> {
  const supabase = db()
  // Check if already owned
  const existing = await getPropertyOwner(anchorLat, anchorLng, cellRow, cellCol)
  if (existing) return 'already owned'

  // Insert property
  const { error } = await supabase
    .from('properties')
    .insert({
      user_id: userId, anchor_lat: anchorLat, anchor_lng: anchorLng,
      cell_row: cellRow, cell_col: cellCol, price,
    } as never)
  return error?.message ?? null
}

export async function sellProperty(propertyId: number): Promise<string | null> {
  const supabase = db()
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)
  return error?.message ?? null
}

export async function loadAllListedProperties(): Promise<Property[]> {
  const supabase = db()
  // Load properties without profiles join (profiles RLS blocks cross-user reads)
  const { data } = await supabase
    .from('properties')
    .select('*')
    .eq('is_listed', true)
    .order('list_price', { ascending: true })
  return ((data as any[]) ?? []).map(mapDbProp)
}

export async function listProperty(propertyId: number, listPrice: number): Promise<string | null> {
  const supabase = db()
  const { error } = await supabase
    .from('properties')
    .update({ is_listed: true, list_price: listPrice } as never)
    .eq('id', propertyId)
  return error?.message ?? null
}

export async function unlistProperty(propertyId: number): Promise<string | null> {
  const supabase = db()
  const { error } = await supabase
    .from('properties')
    .update({ is_listed: false, list_price: null } as never)
    .eq('id', propertyId)
  return error?.message ?? null
}
