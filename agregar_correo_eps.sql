-- ============================================================
-- AURAL · Agregar correo y EPS al formulario de reserva pública
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. La tabla pacientes ya tenía columna "email" desde el inicio.
-- Solo falta agregar "eps".
alter table pacientes add column if not exists eps text;

-- 2. Actualiza la función de crear cita pública para aceptar
-- correo y EPS, y guardarlos/actualizarlos en el paciente.
create or replace function crear_cita_publica(
  p_sede_id uuid,
  p_audiologo_id uuid,
  p_fecha date,
  p_hora_inicio time,
  p_nombre text,
  p_telefono text,
  p_motivo text default null,
  p_email text default null,
  p_eps text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  v_paciente_id uuid;
  v_hora_fin time;
  v_duracion int;
  v_cita_id uuid;
begin
  select id into v_paciente_id from pacientes where telefono = p_telefono;

  if v_paciente_id is null then
    insert into pacientes (nombre, telefono, email, eps)
    values (p_nombre, p_telefono, p_email, p_eps)
    returning id into v_paciente_id;
  else
    -- Si el paciente ya existía, actualiza sus datos con lo más reciente
    update pacientes
    set nombre = p_nombre,
        email = coalesce(p_email, email),
        eps = coalesce(p_eps, eps)
    where id = v_paciente_id;
  end if;

  select duracion_cita_min into v_duracion
  from horarios_fecha
  where audiologo_id = p_audiologo_id and fecha = p_fecha
  limit 1;

  if v_duracion is null then
    select duracion_cita_min into v_duracion
    from horarios_disponibles
    where audiologo_id = p_audiologo_id and dia_semana = extract(dow from p_fecha)
    limit 1;
  end if;

  v_duracion := coalesce(v_duracion, 30);
  v_hora_fin := p_hora_inicio + (v_duracion || ' minutes')::interval;

  insert into citas (paciente_id, audiologo_id, sede_id, fecha, hora_inicio, hora_fin, motivo_consulta, estado)
  values (v_paciente_id, p_audiologo_id, p_sede_id, p_fecha, p_hora_inicio, v_hora_fin, p_motivo, 'pendiente')
  returning id into v_cita_id;

  return v_cita_id;

exception
  when unique_violation then
    raise exception 'Ese horario ya fue tomado por otra persona. Por favor elige otro.';
end;
$BODY$;

grant execute on function crear_cita_publica(uuid, uuid, date, time, text, text, text, text, text) to anon;

-- Nota: si la firma anterior de la función (sin p_email/p_eps) sigue
-- registrada en Postgres con esos 7 argumentos, puede quedar duplicada.
-- Esto no da error, pero si quieres limpiarla:
-- drop function if exists crear_cita_publica(uuid, uuid, date, time, text, text, text);
