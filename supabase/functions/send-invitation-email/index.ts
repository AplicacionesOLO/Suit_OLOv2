import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GMAIL_USER = Deno.env.get('GMAIL_SMTP_USER')!
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_SMTP_APP_PASSWORD')!

function buildInvitationEmailHtml(opts: {
  recipientName: string
  email: string
  tenantName: string
  roleName: string
  inviterName: string
  loginUrl: string
  expiresAt: string
}): string {
  const { recipientName, email, tenantName, roleName, inviterName, loginUrl, expiresAt } = opts
  const displayName = recipientName || email

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a Suite OLO</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f4f4f5; padding: 32px 16px; }
    .wrapper { max-width: 560px; margin: 0 auto; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e4e4e7; }
    .header { background: linear-gradient(135deg, #111827 0%, #1f2937 100%); padding: 40px 36px 32px; text-align: center; }
    .logo-ring { width: 56px; height: 56px; border-radius: 12px; background: rgba(255,255,255,0.08); border: 1.5px solid rgba(255,255,255,0.15); display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 18px; }
    .logo-text { font-size: 22px; font-weight: 800; letter-spacing: -1px; color: #ffffff; }
    .subtitle { color: rgba(255,255,255,0.55); font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
    .body { padding: 36px 36px 28px; }
    .greeting { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 14px; }
    .message { color: #6b7280; font-size: 14px; line-height: 1.7; }
    .badge-row { display: flex; gap: 10px; margin: 24px 0; flex-wrap: wrap; }
    .badge { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 16px; flex: 1; min-width: 130px; }
    .badge-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
    .badge-value { font-size: 13px; font-weight: 600; color: #374151; }
    .cta-block { text-align: center; margin: 28px 0 22px; }
    .cta-btn { display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; }
    .note { font-size: 12px; color: #9ca3af; margin: 10px 0 0; }
    .divider { border: none; border-top: 1px solid #f3f4f6; margin: 24px 0; }
    .info-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
    .info-icon { font-size: 16px; flex-shrink: 0; }
    .info-text { font-size: 13px; color: #6b7280; line-height: 1.5; }
    .footer { padding: 20px 36px 28px; background: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center; }
    .footer-text { font-size: 12px; color: #9ca3af; line-height: 1.6; }
    .footer-url { color: #6b7280; text-decoration: none; word-break: break-all; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo-ring">
          <span style="font-size:18px;font-weight:800;color:#fff;">O</span>
        </div>
        <div class="logo-text">Suite OLO</div>
        <div class="subtitle">Overseas Logistics Operations</div>
      </div>
      <div class="body">
        <div class="greeting">Hola, ${displayName} 👋</div>
        <p class="message">
          <strong>${inviterName}</strong> te ha enviado una invitación para unirte a la plataforma corporativa <strong>Suite OLO</strong>.
        </p>
        <div class="badge-row">
          <div class="badge">
            <div class="badge-label">Organización</div>
            <div class="badge-value">${tenantName}</div>
          </div>
          <div class="badge">
            <div class="badge-label">Rol asignado</div>
            <div class="badge-value">${roleName}</div>
          </div>
        </div>
        <div class="cta-block">
          <a href="${loginUrl}" class="cta-btn">Activar mi cuenta</a>
          <div class="note">Haz clic en el botón o copia el enlace de abajo en tu navegador</div>
        </div>
        <hr class="divider">
        <div class="info-row">
          <span class="info-icon">📧</span>
          <div class="info-text">Iniciá sesión con tu correo: <strong>${email}</strong></div>
        </div>
        <div class="info-row">
          <span class="info-icon">⏱️</span>
          <div class="info-text">Esta invitación expira el <strong>${expiresAt}</strong>. Después de esa fecha necesitarás solicitar una nueva.</div>
        </div>
        <div class="info-row">
          <span class="info-icon">🔒</span>
          <div class="info-text">Si no esperabas esta invitación, podés ignorar este correo con seguridad.</div>
        </div>
      </div>
      <div class="footer">
        <div class="footer-text">
          Si el botón no funciona, copia y pega este enlace:<br>
          <a href="${loginUrl}" class="footer-url">${loginUrl}</a>
        </div>
        <div class="footer-text" style="margin-top:16px;">
          © ${new Date().getFullYear()} Suite OLO &middot; Overseas Logistics Operations
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get('authorization')
    if (!authHeader) throw new Error('No autorizado')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Validate user from JWT and check admin role
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !user) throw new Error('No autorizado')

    const { data: pu } = await supabase
      .from('platform_users')
      .select('role_id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!pu) throw new Error('Usuario no encontrado')

    const { data: role } = await supabase
      .from('roles')
      .select('level')
      .eq('id', pu.role_id)
      .maybeSingle()
    if (!role || role.level < 80) {
      throw new Error('Solo administradores pueden enviar correos de invitación')
    }

    const body = await req.json()
    const {
      invitation_id,
      to_email,
      to_first_name,
      to_last_name,
      tenant_name,
      role_name,
      invited_by_name,
      expires_at,
      app_url,
    } = body

    if (!invitation_id || !to_email) {
      throw new Error('invitation_id y to_email son requeridos')
    }

    const displayName = [to_first_name, to_last_name].filter(Boolean).join(' ') || to_email
    const expiresFormatted = expires_at
      ? new Date(expires_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
      : '7 días'

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error('SMTP no configurado: faltan GMAIL_SMTP_USER o GMAIL_SMTP_APP_PASSWORD en los secretos')
    }

    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    })

    const html = buildInvitationEmailHtml({
      recipientName: displayName,
      email: to_email,
      tenantName: tenant_name || 'Suite OLO',
      roleName: role_name || 'Colaborador',
      inviterName: invited_by_name || 'El administrador',
      loginUrl: app_url || 'https://suiteolo.com/login',
      expiresAt: expiresFormatted,
    })

    await client.send({
      from: `Suite OLO <${GMAIL_USER}>`,
      to: to_email,
      subject: `Invitación a Suite OLO — ${tenant_name || 'Overseas Logistics Operations'}`,
      html,
      content: `Hola ${displayName}, has sido invitado/a a unirte a Suite OLO (${tenant_name || ''}). Rol: ${role_name || ''}. Accedé en: ${app_url || 'https://suiteolo.com/login'}. Esta invitación expira el ${expiresFormatted}.`,
    })

    await client.close()

    // Log the email sent
    try {
      await supabase.from('audit_logs').insert({
        tenant_id: null,
        user_id: null,
        action: 'INVITATION_EMAIL_SENT',
        entity_type: 'user_invitations',
        entity_id: invitation_id,
        details: { to_email, tenant_name },
        severity: 'low',
      })
    } catch {
      // non-critical
    }

    return new Response(
      JSON.stringify({ success: true, message: `Correo enviado a ${to_email}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[send-invitation-email] Error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error al enviar correo' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
