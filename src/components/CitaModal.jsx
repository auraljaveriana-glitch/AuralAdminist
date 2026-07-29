import { useState, useEffect } from 'react'

const HOY = new Date().toISOString().slice(0, 10)

const VACIO = {
  sede_id: '',
  audiologo_id: '',
  paciente_nombre: '',
  paciente_telefono: '',
  fecha: HOY,
  hora_inicio: '08:00',
  duracion_min: 30,
  motivo_consulta: '',
  notas: '',
}

export default function CitaModal({ sedes, audiologos, citaExistente, onGuardar, onCerrar }) {
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (citaExistente) {
      setForm({
        sede_id: citaExistente.sede_id,
        audiologo_id: citaExistente.audiologo_id,
        paciente_nombre: citaExistente.pacientes?.nombre || '',
        paciente_telefono: citaExistente.pacientes?.telefono || '',
        fecha: citaExistente.fecha,
        hora_inicio: citaExistente.hora_inicio.slice(0, 5),
        duracion_min: 30,
        motivo_consulta: citaExistente.motivo_consulta || '',
        notas: citaExistente.notas || '',
      })
    } else {
      setForm(VACIO)
    }
  }, [citaExistente])

  const audiologosFiltrados = form.sede_id
    ? audiologos.filter((a) => a.sede_id === form.sede_id)
    : audiologos

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.sede_id || !form.audiologo_id || !form.paciente_nombre || !form.paciente_telefono) {
      setError('Completa sede, audiólogo, nombre y teléfono del paciente.')
      return
    }

    setGuardando(true)
    try {
      await onGuardar(form, citaExistente)
    } catch (err) {
      setError(err.message || 'No se pudo guardar la cita. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{citaExistente ? 'Editar cita' : 'Nueva cita'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Sede</label>
            <select
              value={form.sede_id}
              onChange={(e) => setForm({ ...form, sede_id: e.target.value, audiologo_id: '' })}
              required
            >
              <option value="">Selecciona una sede</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Audiólogo</label>
            <select
              value={form.audiologo_id}
              onChange={(e) => setForm({ ...form, audiologo_id: e.target.value })}
              required
            >
              <option value="">Selecciona un audiólogo</option>
              {audiologosFiltrados.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Nombre del paciente</label>
            <input
              type="text"
              value={form.paciente_nombre}
              onChange={(e) => setForm({ ...form, paciente_nombre: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <label>Teléfono (WhatsApp)</label>
            <input
              type="tel"
              placeholder="573001234567"
              value={form.paciente_telefono}
              onChange={(e) => setForm({ ...form, paciente_telefono: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div className="form-row" style={{ flex: 1 }}>
              <label>Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                required
              />
            </div>
            <div className="form-row" style={{ flex: 1 }}>
              <label>Hora</label>
              <input
                type="time"
                value={form.hora_inicio}
                onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <label>Motivo de consulta</label>
            <input
              type="text"
              placeholder="Ej: Chequeo gratuito, control, adaptación"
              value={form.motivo_consulta}
              onChange={(e) => setForm({ ...form, motivo_consulta: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label>Notas internas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onCerrar}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? <span className="spinner" /> : 'Guardar cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
