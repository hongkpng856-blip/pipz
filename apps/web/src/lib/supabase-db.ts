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
}

// ── Profile ──

export async function ensureProfile(userId: string): Promise<DbProfile | null> {
  const supabase = db()

  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (existing) return existing as unknown as DbProfile

  const { data: user } = await supabase.auth.getUser()
  const username = user?.user?.email?.split('@')[0] ?? 'player'

  const { data: created } = await supabase
    .from('profiles')
    .insert({ id: userId, username, total_steps: 0 } as never)
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

  const { data: existing } = await supabase
    .from('daily_activity')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('daily_activity')
      .update({ steps } as never)
      .eq('user_id', userId)
      .eq('date', date)
    return error
  }

  const { error } = await supabase
    .from('daily_activity')
    .insert({ user_id: userId, date, steps } as never)
  return error
}

export async function getTodaySteps(userId: string): Promise<number> {
  const supabase = db()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('daily_activity')
    .select('steps')
    .eq('user_id', userId)
    .eq('date', today)
    .single()
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

export async function saveEgg(userId: string, rarity: string): Promise<string | null> {
  const supabase = db()
  const { data, error } = await supabase
    .from('eggs')
    .insert({ user_id: userId, rarity } as never)
    .select('id')
    .single()
  if (error) return error.message
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
    skills: [],
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

  if (error) return error.message
  return (data as unknown as { id: string } | null)?.id ?? null
}

export async function updatePet(pet: Pet): Promise<string | null> {
  const supabase = db()
  const { _user_id, ...record } = petToDb(pet.userId, pet) as Record<string, unknown> & { _user_id: string }

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
