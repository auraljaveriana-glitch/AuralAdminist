import Waveform from './Waveform'

const ETIQUETAS_ESTADO = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  completada: 'Completada',
  no_asistio: 'No asistió',
}

function formatearFechaGrupo(fechaStr) {
  const fecha = new Date(fechaStr + 'T00:00:00')
  return fecha.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatearHora(horaStr) {
  // horaStr viene como "08:30:00"
  const [h, m] = horaStr.split(':')
  const hora = parseInt(h, 10)
  const ampm = hora >= 12 ? 'pm' : 'am'
  const hora12 = hora % 12 === 0 ? 12 : hora % 12
  return `${hora12}:${m} ${ampm}`
}

export default function CitasList({ citas, onEditar, onCambiarEstado }) {
  if (citas.length === 0) {
    return (
      <div className="empty-state">
        <Waveform width={140} height={20} />
        <p>No hay citas en este rango. Ajusta los filtros o crea una nueva cita.</p>
      </div>
    )
  }

  // Agrupar por fecha
  const grupos = citas.reduce((acc, cita) => {
    (acc[cita.fecha] ||= []).push(cita)
    return acc
  }, {})

  const fechasOrdenadas = Object.keys(grupos).sort()

  return (
    <div>
      {fechasOrdenadas.map((fecha) => (
        <div className="day-group" key={fecha}>
          <div className="day-label">{formatearFechaGrupo(fecha)}</div>
          {grupos[fecha]
            .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
            .map((cita) => (
              <div className="cita-card" key={cita.id}>
                <div className="cita-hora">{formatearHora(cita.hora_inicio)}</div>

                <div className="cita-info">
                  <div className="paciente">{cita.pacientes?.nombre || 'Paciente'}</div>
                  <div className="detalle">
                    {cita.audiologos?.nombre} · {cita.sedes?.nombre}
                    {cita.motivo_consulta ? ` · ${cita.motivo_consulta}` : ''}
                  </div>
                  {cita.pacientes?.telefono && (
                    <div className="detalle">📱 {cita.pacientes.telefono}</div>
                  )}
                </div>

                <span className={`status-badge status-${cita.estado}`}>
                  {ETIQUETAS_ESTADO[cita.estado]}
                </span>

                <div className="cita-actions">
                  {cita.estado === 'pendiente' && (
                    <button className="icon-btn" onClick={() => onCambiarEstado(cita, 'confirmada')}>
                      Confirmar
                    </button>
                  )}
                  {(cita.estado === 'pendiente' || cita.estado === 'confirmada') && (
                    <>
                      <button className="icon-btn" onClick={() => onEditar(cita)}>
                        Editar
                      </button>
                      <button className="icon-btn danger" onClick={() => onCambiarEstado(cita, 'cancelada')}>
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  )
}
