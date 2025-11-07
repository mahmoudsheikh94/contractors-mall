import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminHomePage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  // Get user profile to determine role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Redirect based on role
  if (profile?.role === 'supplier_admin') {
    redirect('/supplier/dashboard')
  } else if (profile?.role === 'admin') {
    redirect('/admin/dashboard')
  } else {
    // Default to login for unknown roles
    redirect('/auth/login')
  }
}