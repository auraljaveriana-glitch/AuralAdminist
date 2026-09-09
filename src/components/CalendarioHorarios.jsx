import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const DIAS_SEMANA_LABEL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function nuevoBloque() {
  return { key: crypto.randomUUID(), hora_inicio: '08:00', hora_fin: '12:00', duracion_cita_min: 30 }
}

function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function CalendarioHorarios({ audiologos }) {
  const [audiologoId, setAudiologoId] = useState('')
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth())

  const [fechasConExcepcion, setFechasConExcepcion] = useState(new Set())
  const [fechasBloqueadas, setFechasBloqueadas] = useState(new Set())
  const [fechaSel, setFechaSel] = useState(null)
  const [bloqueada, setBloqueada] = useState(false)
  const [bloques, setBloques] = useState([])
  const [cargandoMes, setCargandoMes] = useState(false)
  const [cargandoDia, setCargandoDia] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (!audiologoId) {
      setFechasConExcepcion(new Set())
      setFechasBloqueadas(new Set())
      return
    }
    cargarExcepcionesDelMes()
    setFechaSel(null)
    setBloques([])
    setBloqueada(false)
  }, [audiologoId, anio, mes])

  async function cargarExcepcionesDelMes() {
    setCargandoMes(true)
    const desde = toISO(anio, mes, 1)
    const ultimoDia = new Date(anio, mes + 1, 0).getDate()
    const hasta = toISO(anio, mes, ultimoDia)

    const [{ data: excepciones }, { data: bloqueos }] = await Promise.all([
      supabase
        .from('horarios_fecha')
        .select('fecha')
        .eq('audiologo_id', audiologoId)
        .gte('fecha', desde)
        .lte('fecha', hasta),
      supabase
        .from('bloqueos')
        .select('fecha')
        .eq('audiologo_id', audiologoId)
        .is('hora_inicio', null)
        .gte('fecha', desde)
        .lte('fecha', hasta),
    ])

    setCargandoMes(false)
    setFechasConExcepcion(new Set((excepciones || []).map((f) => f.fecha)))
    setFechasBloqueadas(new Set((bloqueos || []).map((f) => f.fecha)))
  }

  async function elegirFecha(fechaISO) {
    setFechaSel(fechaISO)
    setMensaje('')
    setCargandoDia(true)

    const [{ data: dataBloques, error: errBloques }, { data: dataBloqueo }] = await Promise.all([
      supabase
        .from('horarios_fecha')
        .select('*')
        .eq('audiologo_id', audiologoId)
        .eq('fecha', fechaISO)
        .order('hora_inicio'),
      supabase
        .from('bloqueos')
        .select('id')
        .eq('audiologo_id', audiologoId)
        .eq('fecha', fechaISO)
        .is('hora_inicio', null)
        .maybeSingle(),
    ])

    setCargandoDia(false)
    if (errBloques) {
      setMensaje('No se pudo cargar ese día.')
      return
    }
    setBloqueada(!!dataBloqueo)
    setBloques(
      (dataBloques || []).map((f) => ({
        key: f.id,
        hora_inicio: f.hora_inicio.slice(0, 5),
        hora_fin: f.hora_fin.slice(0, 5),
        duracion_cita_min: f.duracion_cita_min,
      }))
    )
  }

  function agregarBloque() {
    setBloques((prev) => [...prev, nuevoBloque()])
  }

  function actualizarBloque(key, campo, valor) {
    setBloques((prev) => prev.map((b) => (b.key === key ? { ...b, [campo]: valor } : b)))
  }

  function quitarBloque(key) {
    setBloques((prev) => prev.filter((b) => b.key !== key))
  }

  async function guardarDia() {
    setGuardando(true)
    setMensaje('')

    const { error: errBorrar } = await supabase
      .from('horarios_fecha')
      .delete()
      .eq('audiologo_id', audiologoId)
      .eq('fecha', fechaSel)

    if (errBorrar) {
      setGuardando(false)
      setMensaje('No se pudo guardar: ' + errBorrar.message)
      return
    }

    const filas = bloques
      .filter((b) => b.hora_inicio && b.hora_fin)
      .map((b) => ({
        audiologo_id: audiologoId,
        fecha: fechaSel,
        hora_inicio: b.hora_inicio,
        hora_fin: b.hora_fin,
        duracion_cita_min: Number(b.duracion_cita_min) || 30,
      }))

    if (filas.length > 0) {
      const { error: errInsertar } = await supabase.from('horarios_fecha').insert(filas)
      if (errInsertar) {
        setGuardando(false)
        setMensaje('No se pudo guardar: ' + errInsertar.message)
        return
      }
    }

    setGuardando(false)
    setMensaje(filas.length > 0 ? 'Día guardado ✓' : 'Excepción eliminada — este día vuelve a usar el horario general ✓')
    await cargarExcepcionesDelMes()
  }

  async function quitarExcepcion() {
    setBloques([])
    setGuardando(true)
    await supabase.from('horarios_fecha').delete().eq('audiologo_id', audiologoId).eq('fecha', fechaSel)
    setGuardando(false)
    setMensaje('Excepción eliminada — este día vuelve a usar el horario general ✓')
    await cargarExcepcionesDelMes()
  }

  async function bloquearDiaCompleto() {
    setGuardando(true)
    setMensaje('')
    const { error } = await supabase
      .from('bloqueos')
      .insert({ audiologo_id: audiologoId, fecha: fechaSel, motivo: 'Bloqueado desde el panel' })
    setGuardando(false)
    if (error) {
      setMensaje('No se pudo bloquear el día: ' + error.message)
      return
    }
    setBloqueada(true)
    setMensaje('Día bloqueado — no va a aparecer disponible para agendar ✓')
    await cargarExcepcionesDelMes()
  }

  async function desbloquearDia() {
    setGuardando(true)
    setMensaje('')
    const { error } = await supabase
      .from('bloqueos')
      .delete()
      .eq('audiologo_id', audiologoId)
      .eq('fecha', fechaSel)
      .is('hora_inicio', null)
    setGuardando(false)
    if (error) {
      setMensaje('No se pudo desbloquear: ' + error.message)
      return
    }
    setBloqueada(false)
    setMensaje('Día desbloqueado ✓')
    await cargarExcepcionesDelMes()
  }

  const celdas = useMemo(() => {
    const primerDiaSemana = new Date(anio, mes, 1).getDay()
    const totalDias = new Date(anio, mes + 1, 0).getDate()
    const arr = []
    for (let i = 0; i < primerDiaSemana; i++) arr.push(null)
    for (let d = 1; d <= totalDias; d++) arr.push(d)
    return arr
  }, [anio, mes])

  function cambiarMes(delta) {
    let m = mes + delta
    let a = anio
    if (m < 0) { m = 11; a -= 1 }
    if (m > 11) { m = 0; a += 1 }
    setMes(m)
    setAnio(a)
  }

  const hoyISO = toISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

  return (
    <div>
      <div className="filters-bar" style={{ marginBottom: 20 }}>
        <select value={audiologoId} onChange={(e) => setAudiologoId(e.target.value)}>
          <option value="">Elige un audiólogo…</option>
          {audiologos.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
      </div>

      {!audiologoId && (
        <p style={{ color: 'var(--ink-soft)' }}>
          Elige un audiólogo para ver su calendario y editar días específicos (vacaciones, turnos especiales, etc.).
        </p>
      )}

      {audiologoId && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: 24, alignItems: 'start' }}>
          <div className="panel-calendario" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <button className="icon-btn" onClick={() => cambiarMes(-1)}>‹</button>
              <strong style={{ fontFamily: 'var(--font-display)' }}>{MESES[mes]} {anio}</strong>
              <button className="icon-btn" onClick={() => cambiarMes(1)}>›</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
              {DIAS_SEMANA_LABEL.map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--ink-soft)', fontWeight: 600 }}>{d}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {celdas.map((d, i) => {
                if (d === null) return <div key={`vacio-${i}`} />
                const fechaISO = toISO(anio, mes, d)
                const tieneExcepcion = fechasConExcepcion.has(fechaISO)
                const estaBloqueada = fechasBloqueadas.has(fechaISO)
                const esSeleccionado = fechaSel === fechaISO
                const esHoy = fechaISO === hoyISO
                return (
                  <button
                    key={fechaISO}
                    onClick={() => elegirFecha(fechaISO)}
                    style={{
                      aspectRatio: '1',
                      border: esSeleccionado ? '2px solid var(--brand)' : esHoy ? '1.5px solid var(--ink-soft)' : '1px solid var(--border)',
                      borderRadius: 8,
                      background: esSeleccionado
                        ? 'var(--brand-tint)'
                        : estaBloqueada
                        ? 'var(--danger-tint)'
                        : tieneExcepcion
                        ? 'var(--accent-tint)'
                        : 'var(--surface)',
                      color: estaBloqueada && !esSeleccionado ? '#9A2E37' : 'var(--ink)',
                      fontWeight: esSeleccionado ? 700 : 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      position: 'relative',
                      textDecoration: estaBloqueada ? 'line-through' : 'none',
                    }}
                  >
                    {d}
                    {tieneExcepcion && !estaBloqueada && (
                      <span style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
                    )}
                  </button>
                )
              })}
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginTop: 12, marginBottom: 0 }}>
              🟠 horario especial guardado &nbsp;·&nbsp; 🔴 día bloqueado (cerrado)
            </p>
            {cargandoMes && <p style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>Cargando…</p>}
          </div>

          <div>
            {!fechaSel && <p style={{ color: 'var(--ink-soft)' }}>Haz click en un día del calendario para ver o editar su horario.</p>}

            {fechaSel && (
              <div className="cita-card" style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                    {new Date(fechaSel + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </strong>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!bloqueada && (
                      <button className="icon-btn" onClick={agregarBloque}>+ Bloque</button>
                    )}
                    {!bloqueada && fechasConExcepcion.has(fechaSel) && (
                      <button className="icon-btn danger" onClick={quitarExcepcion} disabled={guardando}>
                        Quitar excepción
                      </button>
                    )}
                  </div>
                </div>

                {cargandoDia && <p style={{ color: 'var(--ink-soft)' }}>Cargando…</p>}

                {!cargandoDia && bloqueada && (
                  <div style={{ background: 'var(--danger-tint)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 16 }}>
                    <p style={{ margin: '0 0 10px', color: '#9A2E37', fontWeight: 600, fontSize: '0.9rem' }}>
                      🔴 Este día está bloqueado — no aparece disponible para agendar.
                    </p>
                    <button className="btn-secondary" onClick={desbloquearDia} disabled={guardando}>
                      {guardando ? <span className="spinner" /> : 'Desbloquear este día'}
                    </button>
                  </div>
                )}

                {!cargandoDia && !bloqueada && bloques.length === 0 && (
                  <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                    Sin horario especial este día — se está usando el horario semanal general. Agrega un bloque para crear una excepción.
                  </p>
                )}

                {!cargandoDia && !bloqueada && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {bloques.map((b) => (
                      <div key={b.key} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="time"
                          value={b.hora_inicio}
                          onChange={(e) => actualizarBloque(b.key, 'hora_inicio', e.target.value)}
                          style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }}
                        />
                        <span style={{ color: 'var(--ink-soft)' }}>a</span>
                        <input
                          type="time"
                          value={b.hora_fin}
                          onChange={(e) => actualizarBloque(b.key, 'hora_fin', e.target.value)}
                          style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }}
                        />
                        <span style={{ color: 'var(--ink-soft)', fontSize: '0.82rem' }}>·</span>
                        <input
                          type="number"
                          min="5"
                          step="5"
                          value={b.duracion_cita_min}
                          onChange={(e) => actualizarBloque(b.key, 'duracion_cita_min', e.target.value)}
                          style={{ width: 60, border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px' }}
                        />
                        <span style={{ color: 'var(--ink-soft)', fontSize: '0.82rem' }}>min/cita</span>
                        <button className="icon-btn danger" onClick={() => quitarBloque(b.key)}>Quitar</button>
                      </div>
                    ))}
                  </div>
                )}

                {!bloqueada && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn-primary" onClick={guardarDia} disabled={guardando || cargandoDia}>
                      {guardando ? <span className="spinner" /> : 'Guardar este día'}
                    </button>
                    <button className="btn-secondary" onClick={bloquearDiaCompleto} disabled={guardando || cargandoDia}>
                      Bloquear día completo
                    </button>
                  </div>
                )}

                {mensaje && (
                  <p style={{ color: mensaje.startsWith('No') ? 'var(--danger)' : 'var(--ok)', fontSize: '0.85rem', marginTop: 10 }}>
                    {mensaje}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
