export default function FiltersBar({
  audiologos,
  filtros,
  onChange,
  onNuevaCita,
}) {
  return (
    <div className="filters-bar">
      <select
        value={filtros.audiologoId || ''}
        onChange={(e) => onChange({ ...filtros, audiologoId: e.target.value || null })}
      >
        <option value="">Todos los audiólogos</option>
        {audiologos.map((a) => (
          <option key={a.id} value={a.id}>{a.nombre}</option>
        ))}
      </select>

      <select
        value={filtros.estado || ''}
        onChange={(e) => onChange({ ...filtros, estado: e.target.value || null })}
      >
        <option value="">Todos los estados</option>
        <option value="pendiente">Pendiente</option>
        <option value="confirmada">Confirmada</option>
        <option value="completada">Completada</option>
        <option value="cancelada">Cancelada</option>
        <option value="no_asistio">No asistió</option>
      </select>

      <input
        type="date"
        value={filtros.desde}
        onChange={(e) => onChange({ ...filtros, desde: e.target.value })}
      />
      <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>hasta</span>
      <input
        type="date"
        value={filtros.hasta}
        onChange={(e) => onChange({ ...filtros, hasta: e.target.value })}
      />

      <div className="spacer" />

      <button className="btn-primary" onClick={onNuevaCita}>
        + Nueva cita
      </button>
    </div>
  )
}
