import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body = await req.json()
    const { action } = body

    if (action === 'delete-user') {
      const { user_id } = body
      if (!user_id) throw new Error('user_id es requerido')

      const { data: platformUser, error: fetchError } = await supabaseAdmin
        .from('platform_users')
        .select('auth_user_id, email')
        .eq('id', user_id)
        .maybeSingle()

      if (fetchError) throw new Error(fetchError.message)
      if (!platformUser) throw new Error('Usuario no encontrado en platform_users')

      // Step 1: Clean all bridge/reference tables (where user_id belongs to this user)
      const cleanupResults = await Promise.allSettled([
        supabaseAdmin.from('user_tenants').delete().eq('user_id', user_id),
        supabaseAdmin.from('user_countries').delete().eq('user_id', user_id),
        supabaseAdmin.from('user_clients').delete().eq('user_id', user_id),
        supabaseAdmin.from('user_warehouses').delete().eq('user_id', user_id),
        supabaseAdmin.from('user_application_access').delete().eq('user_id', user_id),
        supabaseAdmin.from('user_favorites').delete().eq('user_id', user_id),
      ])

      for (const result of cleanupResults) {
        if (result.status === 'rejected') {
          console.warn('Cleanup warning:', result.reason)
        }
      }

      // Step 2: Null out soft references (records that belong to others but point to this user)
      await Promise.allSettled([
        supabaseAdmin.from('audit_logs').update({ user_id: null }).eq('user_id', user_id),
        supabaseAdmin.from('user_invitations').update({ invited_by: null }).eq('invited_by', user_id),
        supabaseAdmin.from('user_application_access').update({ granted_by: null }).eq('granted_by', user_id),
      ])

      // Step 3: Delete platform_user record
      const { error: deleteError } = await supabaseAdmin
        .from('platform_users')
        .delete()
        .eq('id', user_id)

      if (deleteError) throw new Error(`Error al eliminar platform_user: ${deleteError.message}`)

      // Step 4: Delete auth user (via Admin API)
      if (platformUser.auth_user_id) {
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
          platformUser.auth_user_id
        )
        if (authDeleteError) {
          console.warn('Auth user delete warning:', authDeleteError.message)
        }
      }

      // Step 5: Register audit log for the deletion
      await supabaseAdmin.from('audit_logs').insert({
        tenant_id: null,
        user_id: null,
        action: 'USER_DELETED_FULL',
        entity_type: 'platform_users',
        entity_id: user_id,
        details: { email: platformUser.email, cascade: true },
        severity: 'high',
      })

      return new Response(
        JSON.stringify({ success: true, message: 'Usuario eliminado completamente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'set-password') {
      const { email, password } = body
      if (!email) throw new Error('email es requerido')
      if (!password) throw new Error('password es requerido')
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')

      // Find user by email in auth
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) throw new Error(listError.message)

      const targetUser = users?.find((u) => u.email === email.toLowerCase().trim())
      if (!targetUser) throw new Error(`No se encontró un usuario auth con email: ${email}`)

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.id,
        { password }
      )
      if (updateError) throw new Error(updateError.message)

      // Register audit log
      await supabaseAdmin.from('audit_logs').insert({
        tenant_id: null,
        user_id: null,
        action: 'USER_PASSWORD_RESET',
        entity_type: 'auth.users',
        entity_id: targetUser.id,
        details: { email },
        severity: 'high',
      })

      return new Response(
        JSON.stringify({ success: true, message: 'Contraseña actualizada correctamente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Acción no válida: ${action}`)
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error desconocido' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})