// ═══════════════════════════════════════════════════════
//  CONFIGURACIÓN SUPABASE
//  Pega aquí tus claves después de crear el proyecto
// ═══════════════════════════════════════════════════════
const SUPABASE_URL    = 'https://XXXXXXXXXXXXXXXX.supabase.co';   // ← tu URL
const SUPABASE_ANON   = 'eyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';        // ← tu anon key
const WEBHOOK_N8N     = '';  // ← URL webhook n8n (opcional, para WhatsApp)
const TABLE_NAME      = 'citas';

// ── Cliente Supabase ligero (sin librería externa) ──────
const db = {
  async insert(data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    if (!r.ok) throw await r.json();
    return r;
  },
  async select(filters = '') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?order=created_at.desc${filters}`, {
      headers: headers()
    });
    if (!r.ok) throw await r.json();
    return r.json();
  },
  async update(id, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=eq.${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(data)
    });
    if (!r.ok) throw await r.json();
    return r;
  },
  async delete(id) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=eq.${id}`, {
      method: 'DELETE',
      headers: headers()
    });
    if (!r.ok) throw await r.json();
    return r;
  }
};

function headers() {
  return {
    'Content-Type':  'application/json',
    'apikey':        SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
    'Prefer':        'return=minimal'
  };
}

// ── Webhook n8n ─────────────────────────────────────────
async function notifyWebhook(apt) {
  const url = localStorage.getItem('aural_webhook') || WEBHOOK_N8N;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo:      'nueva_cita',
        id_cita:   apt.id,
        paciente:  apt.nombre,
        documento: apt.documento || 'No indicado',
        telefono:  apt.telefono,
        email:     apt.email,
        sede:      `${apt.sede_nombre} (${apt.sede_ciudad})`,
        fecha:     apt.fecha,
        hora:      apt.hora,
        servicio:  apt.servicio,
        notas:     apt.notas || 'Sin observaciones',
      })
    });
  } catch(e) { console.warn('Webhook n8n:', e); }
}
