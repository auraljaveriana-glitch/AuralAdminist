import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const DIAS = [
  { valor: 1, label: 'Lunes' },
  { valor: 2, label: 'Martes' },
  { valor: 3, label: 'Miércoles' },
  { valor: 4, label: 'Jueves' },
  { valor: 5, label: 'Viernes' },
  { valor: 6, label: 'Sábado' },
  { valor: 0, label: 'Domingo' },
]

function nuevoBloque() {
  return { key: crypto.randomUUID(), hora_inicio: '08:00', hora_fin: '12:00', duracion_cita_min: 30 }
}

export default function HorariosEditor({ audiologos }) {
  const [audiologoId, setAudiologoId] = useState('')
  const [bloquesPorDia, setBloquesPorDia] = useState({}) // { 1: [bloque, bloque], 2: [...] }
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (!audiologoId) {
      setBloquesPorDia({})
      return
    }
    cargarHorario()
  }, [audiologoId])

  async function cargarHorario() {
    setCargando(true)
    setMensaje('')
    const { data, error } = await supabase
      .from('horarios_disponibles')
      .select('*')
      .eq('audiologo_id', audiologoId)
      .order('hora_inicio')

    setCargando(false)
    if (error) {
      setMensaje('No se pudo cargar el horario.')
      return
    }

    const agrupado = {}
    for (const dia of DIAS) agrupado[dia.valor] = []
    for (const fila of data || []) {
      agrupado[fila.dia_semana].push({
        key: fila.id,
        hora_inicio: fila.hora_inicio.slice(0, 5),
        hora_fin: fila.hora_fin.slice(0, 5),
        duracion_cita_min: fila.duracion_cita_min,
      })
    }
    setBloquesPorDia(agrupado)
  }

  function agregarBloque(dia) {
    setBloquesPorDia((prev) => ({
      ...prev,
      [dia]: [...(prev[dia] || []), nuevoBloque()],
    }))
  }

  function actualizarBloque(dia, key, campo, valor) {
    setBloquesPorDia((prev) => ({
      ...prev,
      [dia]: prev[dia].map((b) => (b.key === key ? { ...b, [campo]: valor } : b)),
    }))
  }

  function quitarBloque(dia, key) {
    setBloquesPorDia((prev) => ({
      ...prev,
      [dia]: prev[dia].filter((b) => b.key !== key),
    }))
  }

  function copiarADias(diaOrigen, diasDestino) {
    setBloquesPorDia((prev) => {
      const bloquesOrigen = (prev[diaOrigen] || []).map((b) => ({ ...b, key: crypto.randomUUID() }))
      const copia = { ...prev }
      for (const d of diasDestino) {
        copia[d] = bloquesOrigen.map((b) => ({ ...b, key: crypto.randomUUID() }))
      }
      return copia
    })
  }

  async function guardar() {
    setGuardando(true)
    setMensaje('')

    // Reemplaza todo el horario de este audiólogo de una sola vez:
    // borra lo que había y vuelve a insertar el estado actual.
    const { error: errBorrar } = await supabase
      .from('horarios_disponibles')
      .delete()
      .eq('audiologo_id', audiologoId)

    if (errBorrar) {
      setGuardando(false)
      setMensaje('No se pudo guardar: ' + errBorrar.message)
      return
    }

    const filas = []
    for (const dia of DIAS) {
      for (const b of bloquesPorDia[dia.valor] || []) {
        if (!b.hora_inicio || !b.hora_fin) continue
        filas.push({
          audiologo_id: audiologoId,
          dia_semana: dia.valor,
          hora_inicio: b.hora_inicio,
          hora_fin: b.hora_fin,
          duracion_cita_min: Number(b.duracion_cita_min) || 30,
        })
      }
    }

    if (filas.length > 0) {
      const { error: errInsertar } = await supabase.from('horarios_disponibles').insert(filas)
      if (errInsertar) {
        setGuardando(false)
        setMensaje('No se pudo guardar: ' + errInsertar.message)
        return
      }
    }

    setGuardando(false)
    setMensaje('Horario guardado ✓')
    await cargarHorario()
  }

  return (
    <div>
      <div className="filters-bar" style={{ marginBottom: 20 }}>
        <select value={audiologoId} onChange={(e) => setAudiologoId(e.target.value)}>
          <option value="">Elige un audiólogo…</option>
          {audiologos.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
        {audiologoId && (
          <button className="btn-primary" onClick={guardar} disabled={guardando || cargando}>
            {guardando ? <span className="spinner" /> : 'Guardar horario'}
          </button>
        )}
      </div>

      {mensaje && (
        <p style={{ color: mensaje.startsWith('No') ? 'var(--danger)' : 'var(--ok)', fontSize: '0.88rem', marginBottom: 16 }}>
          {mensaje}
        </p>
      )}

      {!audiologoId && (
        <p style={{ color: 'var(--ink-soft)' }}>Elige un audiólogo arriba para ver y editar su horario semanal.</p>
      )}

      {audiologoId && cargando && <p style={{ color: 'var(--ink-soft)' }}>Cargando horario…</p>}

      {audiologoId && !cargando && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {DIAS.map((dia) => (
            <div key={dia.valor} className="cita-card" style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <strong style={{ fontFamily: 'var(--font-display)', fontSize: '0.98rem' }}>{dia.label}</strong>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="icon-btn" onClick={() => agregarBloque(dia.valor)}>+ Bloque</button>
                  {(bloquesPorDia[dia.valor] || []).length > 0 && (
                    <button
                      className="icon-btn"
                      onClick={() => copiarADias(dia.valor, DIAS.filter((d) => d.valor >= 1 && d.valor <= 5 && d.valor !== dia.valor).map((d) => d.valor))}
                      title="Copia los bloques de este día a lunes-viernes"
                    >
                      Copiar a L-V
                    </button>
                  )}
                </div>
              </div>

              {(bloquesPorDia[dia.valor] || []).length === 0 && (
                <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', margin: 0 }}>Sin horario este día (no disponible).</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(bloquesPorDia[dia.valor] || []).map((b) => (
                  <div key={b.key} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="time"
                      value={b.hora_inicio}
                      onChange={(e) => actualizarBloque(dia.valor, b.key, 'hora_inicio', e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }}
                    />
                    <span style={{ color: 'var(--ink-soft)' }}>a</span>
                    <input
                      type="time"
                      value={b.hora_fin}
                      onChange={(e) => actualizarBloque(dia.valor, b.key, 'hora_fin', e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }}
                    />
                    <span style={{ color: 'var(--ink-soft)', fontSize: '0.82rem' }}>·</span>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={b.duracion_cita_min}
                      onChange={(e) => actualizarBloque(dia.valor, b.key, 'duracion_cita_min', e.target.value)}
                      style={{ width: 60, border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }}
                    />
                    <span style={{ color: 'var(--ink-soft)', fontSize: '0.82rem' }}>min/cita</span>
                    <button className="icon-btn danger" onClick={() => quitarBloque(dia.valor, b.key)}>Quitar</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
