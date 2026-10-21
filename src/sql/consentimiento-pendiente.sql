-- ═══════════════════════════════════════════════════════════════
-- Autorizaciones de datos: lo que espera el «sí» de Diana (SIN APLICAR)
--
-- Qué hace:
--   5. Los mensajes sobre un plan («Cuéntanos algo sobre este plan», tabla
--      reportes) se borran con la cuenta: la llave de reportes.user_id pasa
--      de ON DELETE SET NULL a ON DELETE CASCADE.
--   6. Agrega a organizadoras tres columnas nulables para anotar la
--      autorización de quien organiza planes: qué versión firmó, cuándo y
--      por qué medio.
-- Cuándo se aplica: solo con el «sí» de Diana en el chat para esta acción
-- (y, para la sección 6, con la respuesta del abogado a la pregunta 10 de
-- checklist-abogado.md). Va después de consentimiento.sql, que se aplica
-- completo y no depende de este archivo. Cada sección se puede aplicar sola
-- y más de una vez.
--
-- Antes de aplicar la sección 5, confirmar el nombre real de la llave de
-- reportes.user_id (debe salir reportes_user_id_fkey):
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.reportes'::regclass and contype = 'f';
-- Si sale otro nombre, cambiarlo abajo en las dos líneas de la llave. El
-- bloque «do» de la sección 5 se detiene sin cambiar nada si encuentra en
-- user_id una llave con otro nombre (así no quedan dos llaves).
-- ═══════════════════════════════════════════════════════════════

-- ── 5. Los mensajes sobre un plan se borran con la cuenta ──
-- reportes.user_id es hoy ON DELETE SET NULL (curaduria.sql, aplicado el
-- 12-oct-2026): al borrar una cuenta, su mensaje se quedaba sin dueña, con
-- lo que contó (puede ser algo de su salud o de su intimidad). La política
-- (secciones 3.2, 8 y 9) promete borrar todo lo que guarda la cuenta.
-- Mientras no esté aplicada, al borrar una cuenta se borran primero sus
-- mensajes a mano (manual-interno-datos.md, «Borrar una cuenta»).
do $$
begin
  if exists (
    select 1 from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.reportes'::regclass and c.contype = 'f'
      and a.attname = 'user_id' and c.conname <> 'reportes_user_id_fkey'
  ) then
    raise exception 'reportes.user_id tiene una llave con otro nombre: corre la consulta del encabezado y usa ese nombre';
  end if;
end;
$$;

alter table public.reportes drop constraint if exists reportes_user_id_fkey;
alter table public.reportes add constraint reportes_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- ── 6. La autorización de quienes organizan planes ──
-- La política (sección 12) dice que a quien organiza planes le pedimos una
-- autorización aparte, por correo o con firma electrónica, antes de
-- publicar su primer plan; a quien ya organizaba, antes de su próximo plan
-- (modelo: ronda-hq/06-legal-y-datos/autorizacion-organizadoras-v1.md).
-- La prueba es ese correo o ese documento firmado (Ley 1581, art. 9); estas
-- columnas son un registro adicional, por eso no hace falta aplicarlas antes
-- de publicar la política. Aquí queda qué versión firmó, cuándo y por qué
-- medio (por ejemplo, 'correo' o 'firma-electronica'). Solo la ve quien
-- revisa los planes (organizadoras no tiene política SELECT, curaduria.sql).
alter table public.organizadoras add column if not exists autorizacion_version text;
alter table public.organizadoras add column if not exists autorizacion_fecha timestamptz;
alter table public.organizadoras add column if not exists autorizacion_medio text;
