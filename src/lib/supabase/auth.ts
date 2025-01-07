import { createClientComponent } from './client'

export const signInWithDiscord = async () => {
  const supabase = createClientComponent()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })

  if (error) {
    throw error
  }

  return data
}

export const signInWithGithub = async () => {
  const supabase = createClientComponent()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })

  if (error) {
    throw error
  }

  return data
}

export const signOut = async () => {
  const supabase = createClientComponent()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export const getCurrentUser = async () => {
  const supabase = createClientComponent()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  return user
}
