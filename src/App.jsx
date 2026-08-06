import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CitasList from './components/CitasList'
import CitaModal from './components/CitaModal'
import HorariosEditor from './components/HorariosEditor'
import CalendarioHorarios from './components/CalendarioHorarios'
import Waveform from './components/Waveform'

const HOY = new Date().toISOString().slice(0, 10)
const EN_7_DIAS = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

function sumarMinutos(horaStr, minutos) {
  const [h, m] = horaStr.split(':').map(Number)
  const total = h * 60 + m + minutos
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`
}

export default function App() {
  const [session, setSession] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)

  const [sedes, setSedes] = useState([])
  const [audiologos, setAudiologos] = useState([])
  const [citas, setCitas] = useState([])
  const [cargandoCitas, setCargandoCitas] = useState(false)
  const [errorCarga, setErrorCarga] = useState('')

  const [sedeActivaId, setSedeActivaId] = useState(null)
  const [filtros, setFiltros] = useState({
    audiologoId: null,
    estado: null,
    desde: HOY,
    hasta: EN_7_DIAS,
  })

  const [modalAbierto, setModalAbierto] = useState(false)
  const [citaEnEdicion, setCitaEnEdicion] = useState(null)
  const [vista, setVista] = useState('citas') // 'citas' | 'horarios'

  // ---- Sesión ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCargandoSesion(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // ---- Catálogos (sedes, audiólogos) ----
  useEffect(() => {
    if (!session) return
    supabase.from('sedes').select('*').eq('activa', true).order('nombre')
      .then(({ data, error }) => { if (!error) setSedes(data || []) })
    supabase.from('audiologos').select('*').eq('activo', true).order('nombre')
      .then(({ data, error }) => { if (!error) setAudiologos(data || []) })
  }, [session])

  // ---- Citas (según filtros) ----
  const cargarCitas = useCallback(async () => {
    if (!session) return
    setCargandoCitas(true)
    setErrorCarga('')

    let query = supabase
      .from('citas')
      .select('*, pacientes(nombre, telefono), audiologos(nombre, sede_id), sedes(nombre)')
      .gte('fecha', filtros.desde)
      .lte('fecha', filtros.hasta)
      .order('fecha', { ascending: true })

    if (sedeActivaId) query = query.eq('sede_id', sedeActivaId)
    if (filtros.audiologoId) query = query.eq('audiologo_id', filtros.audiologoId)
    if (filtros.estado) query = query.eq('estado', filtros.estado)

    const { data, error } = await query
    if (error) {
      setErrorCarga('No se pudieron cargar las citas: ' + error.message)
    } else {
      setCitas(data || [])
    }
    setCargandoCitas(false)
  }, [session, sedeActivaId, filtros])

  useEffect(() => { cargarCitas() }, [cargarCitas])

  // Conteo de citas de hoy por sede (para la barra lateral)
  const [conteosPorSede, setConteosPorSede] = useState({})
  useEffect(() => {
    if (!session || sedes.length === 0) return
    supabase
      .from('citas')
      .select('sede_id')
      .eq('fecha', HOY)
      .neq('estado', 'cancelada')
      .then(({ data, error }) => {
        if (error) return
        const conteo = {}
        for (const row of data) conteo[row.sede_id] = (conteo[row.sede_id] || 0) + 1
        setConteosPorSede(conteo)
      })
  }, [session, sedes, citas])

  // ---- Crear / editar cita ----
  async function guardarCita(form, citaExistente) {
    // 1. Buscar o crear el paciente por teléfono
    const { data: existente } = await supabase
      .from('pacientes')
      .select('id')
      .eq('telefono', form.paciente_telefono)
      .maybeSingle()

    let pacienteId = existente?.id
    if (!pacienteId) {
      const { data: nuevoPaciente, error: errPaciente } = await supabase
        .from('pacientes')
        .insert({ nombre: form.paciente_nombre, telefono: form.paciente_telefono })
        .select('id')
        .single()
      if (errPaciente) throw new Error('No se pudo registrar el paciente: ' + errPaciente.message)
      pacienteId = nuevoPaciente.id
    }

    const horaInicio = form.hora_inicio.length === 5 ? form.hora_inicio + ':00' : form.hora_inicio
    const payload = {
      paciente_id: pacienteId,
      audiologo_id: form.audiologo_id,
      sede_id: form.sede_id,
      fecha: form.fecha,
      hora_inicio: horaInicio,
      hora_fin: sumarMinutos(horaInicio, form.duracion_min || 30),
      motivo_consulta: form.motivo_consulta || null,
      notas: form.notas || null,
    }

    if (citaExistente) {
      const { error } = await supabase.from('citas').update(payload).eq('id', citaExistente.id)
      if (error) {
        if (error.code === '23505') throw new Error('Ese audiólogo ya tiene una cita a esa hora.')
        throw new Error(error.message)
      }
    } else {
      const { error } = await supabase.from('citas').insert({ ...payload, estado: 'pendiente' })
      if (error) {
        if (error.code === '23505') throw new Error('Ese audiólogo ya tiene una cita a esa hora.')
        throw new Error(error.message)
      }
    }

    setModalAbierto(false)
    setCitaEnEdicion(null)
    await cargarCitas()
  }

  async function cambiarEstado(cita, nuevoEstado) {
    const { error } = await supabase.from('citas').update({ estado: nuevoEstado }).eq('id', cita.id)
    if (!error) await cargarCitas()
  }

  function abrirNuevaCita() {
    setCitaEnEdicion(null)
    setModalAbierto(true)
  }

  function abrirEdicion(cita) {
    setCitaEnEdicion(cita)
    setModalAbierto(true)
  }

  // ---- Render ----
  if (cargandoSesion) return null
  if (!session) return <Login />

  const sedeActiva = sedes.find((s) => s.id === sedeActivaId)

  return (
    <div className="app-shell">
      <Sidebar
        sedes={sedes}
        sedeActivaId={sedeActivaId}
        onSelectSede={setSedeActivaId}
        conteosPorSede={conteosPorSede}
        userEmail={session.user.email}
      />

      <main className="main">
        <div className="page-header">
          <h1>{sedeActiva ? sedeActiva.nombre : 'Todas las sedes'}</h1>
          <p>Gestiona las citas y los horarios de tu equipo de audiólogos.</p>
        </div>
        <div className="waveform-divider"><Waveform width={220} height={22} /></div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            className={vista === 'citas' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setVista('citas')}
          >
            Citas
          </button>
          <button
            className={vista === 'horarios' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setVista('horarios')}
          >
            Horarios
          </button>
          <button
            className={vista === 'calendario' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setVista('calendario')}
          >
            Calendario (días específicos)
          </button>
        </div>

        {vista === 'citas' && (
          <>
            <FiltersBar
              audiologos={sedeActivaId ? audiologos.filter((a) => a.sede_id === sedeActivaId) : audiologos}
              filtros={filtros}
              onChange={setFiltros}
              onNuevaCita={abrirNuevaCita}
            />

            {errorCarga && <p className="error-text">{errorCarga}</p>}
            {cargandoCitas ? (
              <p style={{ color: 'var(--ink-soft)' }}>Cargando citas…</p>
            ) : (
              <CitasList citas={citas} onEditar={abrirEdicion} onCambiarEstado={cambiarEstado} />
            )}
          </>
        )}

        {vista === 'horarios' && (
          <HorariosEditor
            audiologos={sedeActivaId ? audiologos.filter((a) => a.sede_id === sedeActivaId) : audiologos}
          />
        )}

        {vista === 'calendario' && (
          <CalendarioHorarios
            audiologos={sedeActivaId ? audiologos.filter((a) => a.sede_id === sedeActivaId) : audiologos}
          />
        )}
      </main>

      {modalAbierto && (
        <CitaModal
          sedes={sedes}
          audiologos={audiologos}
          citaExistente={citaEnEdicion}
          onGuardar={guardarCita}
          onCerrar={() => { setModalAbierto(false); setCitaEnEdicion(null) }}
        />
      )}
    </div>
  )
}
