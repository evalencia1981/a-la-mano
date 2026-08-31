/**
 * Render simple a HTML string. No usamos react-email para no atar el template
 * a un renderer — strings de HTML son suficientes para Resend y MJML opcional.
 */
export function renderInvitationEmail(opts: {
  tenantName: string;
  inviterEmail: string;
  acceptUrl: string;
}): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2>Te invitaron a ${escapeHtml(opts.tenantName)}</h2>
      <p>${escapeHtml(opts.inviterEmail)} te invitó a unirte al directorio privado de servicios de tu comunidad.</p>
      <p>
        <a href="${opts.acceptUrl}" style="display:inline-block;padding:10px 20px;background:#0C6478;color:#fff;text-decoration:none;border-radius:6px;">
          Aceptar invitación
        </a>
      </p>
      <p style="color:#4A6A7B;font-size:12px;">Si no esperabas este mail, podés ignorarlo.</p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
