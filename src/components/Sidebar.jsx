import { supabase } from '../supabaseClient'

export default function Sidebar({ sedes, sedeActivaId, onSelectSede, conteosPorSede, userEmail }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <aside className="sidebar">
      <div className="brand-mark">
        <img src="/logo-aural.png" alt="Aural" style={{ height: 22 }} />
      </div>

      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 8 }}>
          SEDES
        </div>
        <div className="sede-list">
          <button
            className={`sede-item ${sedeActivaId === null ? 'active' : ''}`}
            onClick={() => onSelectSede(null)}
          >
            <span>Todas las sedes</span>
          </button>
          {sedes.map((sede) => (
            <button
              key={sede.id}
              className={`sede-item ${sedeActivaId === sede.id ? 'active' : ''}`}
              onClick={() => onSelectSede(sede.id)}
            >
              <span>{sede.nombre}</span>
              {conteosPorSede?.[sede.id] > 0 && (
                <span className="count">{conteosPorSede[sede.id]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <div style={{ marginBottom: 4 }}>{userEmail}</div>
        <button className="logout-btn" onClick={handleLogout}>Cerrar sesión</button>
      </div>
    </aside>
  )
}
