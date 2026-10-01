import { supabase } from '../lib/supabase'

function getClient() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

export async function getProfileName(userId: string) {
  const { data, error } = await getClient().from('profiles').select('full_name').eq('id', userId).maybeSingle()
  if (error) throw error
  return (data?.full_name ?? '').trim()
}

export async function saveProfileName(userId: string, name: string) {
  const { data, error } = await getClient()
    .from('profiles')
    .update({ full_name: name.trim() || null })
    .eq('id', userId)
    .select('full_name')
    .single()
  if (error) throw error
  return (data.full_name ?? '').trim()
}
