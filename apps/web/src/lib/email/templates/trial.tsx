export function renderTrialEndingEmail(opts: {
  tenantName: string;
  daysRemaining: number;
  upgradeUrl: string;
}): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2>Tu trial en A la Mano termina pronto</h2>
      <p>Quedan <strong>${opts.daysRemaining} días</strong> del trial de <strong>${escapeHtml(opts.tenantName)}</strong>.</p>
      <p>
        <a href="${opts.upgradeUrl}" style="display:inline-block;padding:10px 20px;background:#0C6478;color:#fff;text-decoration:none;border-radius:6px;">
          Activar suscripción
        </a>
      </p>
    </div>
  `;
}

export function renderTrialEndedEmail(opts: {
  tenantName: string;
  upgradeUrl: string;
}): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2>El trial de ${escapeHtml(opts.tenantName)} terminó</h2>
      <p>La comunidad está en modo solo-lectura. Activá la suscripción para reactivar las funciones de admin.</p>
      <p>
        <a href="${opts.upgradeUrl}" style="display:inline-block;padding:10px 20px;background:#0C6478;color:#fff;text-decoration:none;border-radius:6px;">
          Activar suscripción
        </a>
      </p>
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
