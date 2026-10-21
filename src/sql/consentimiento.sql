-- ═══════════════════════════════════════════════════════════════
-- Autorizaciones de datos: la prueba en Supabase (SIN APLICAR)
--
-- Textos: ronda-hq/06-legal-y-datos/textos-autorizacion-v1.md (secciones a,
-- b, e y f). La app (src/lib/autorizaciones.js) guarda cada respuesta en el
-- teléfono y, con esto aplicado, también aquí:
--   1. una fila por respuesta en public.autorizaciones: solo se agregan,
--      nunca se editan ni se borran desde la app (Decreto 1377, art. 8);
--   2. el estado actual en columnas nuevas de profiles (autorizacion_*),
--      para que otro teléfono de la misma cuenta no vuelva a preguntar.
-- La fecha que vale es la del servidor (now()), nunca la del teléfono.
-- Nunca se guarda contenido, ánimo, texto del diario o de la IA, ni la IP.
--
-- Orden para publicar: aplicar este archivo COMPLETO ANTES de desplegar la
-- app con las autorizaciones. Es obligatorio: los endpoints de IA
-- (/api/agent, guia, generate-program y speak) leen profiles.autorizacion_ia
-- y, sin esa columna, responden 403 a todas. Todo lo de aquí se puede
-- aplicar más de una vez (if not exists, drop … if exists, create or
-- replace y revoke) y nada espera otra decisión.
-- Lo que ya existe cambia en tres cosas: columnas nuevas nulables en
-- profiles, con un trigger que pone sus fechas (sección 2); las dos reglas
-- de profiles quedan explícitas, con WITH CHECK y solo para quien tiene
-- sesión (sección 3, el mismo efecto que hoy); y en la sección 4, nadie con
-- sesión puede volver a escribir en las tablas que la app ya no usa (diario,
-- hábitos, rutas, frases y racha).
-- Las secciones 5 y 6 (los mensajes sobre un plan se borran con la cuenta;
-- la prueba de la autorización de quienes organizan planes) esperan el «sí»
-- de Diana y están aparte, en consentimiento-pendiente.sql. Este archivo no
-- depende de ellas.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabla de autorizaciones (la prueba) ──
-- user_id sin llave foránea a auth.users: si se borra la cuenta, la prueba
-- de que autorizó se conserva sin nada de lo que escribió (política §9: 3
-- años; es la pregunta 9 del abogado). Borrarla después es un paso aparte.
create table if not exists public.autorizaciones (
  id uuid primary key default gen_random_uuid(),   -- la app manda el suyo: reintentar no duplica
  user_id uuid not null default auth.uid(),
  tipo text not null check (tipo in ('edad', 'cuenta', 'ia', 'adentro')),   -- 'adentro' queda para la fase 2
  valor boolean not null,                           -- false = no autorizó o la retiró
  version_texto text not null check (version_texto ~ '^(edad|cuenta|ia|adentro|politica)-v[0-9]+$'),
  canal text not null check (canal in ('registro', 'aviso-unico', 'al-usar', 'perfil')),
  creado_en timestamptz not null default now(),     -- hora del servidor (la que vale como prueba)
  respondido_en timestamptz,                        -- hora del teléfono al responder: solo para ordenar
                                                    -- respuestas de varios teléfonos (una que subió tarde)
  version_app text check (version_app is null or length(version_app) <= 64)
);
alter table public.autorizaciones add column if not exists respondido_en timestamptz;

create index if not exists idx_autorizaciones_usuaria on public.autorizaciones (user_id, tipo, creado_en desc);

alter table public.autorizaciones enable row level security;

-- Cada usuaria crea y lee solo sus filas. No hay políticas de UPDATE ni de
-- DELETE: nadie con sesión puede editarlas ni borrarlas (sí el panel de
-- Supabase y el service_role).
drop policy if exists "Usuaria agrega sus autorizaciones" on public.autorizaciones;
create policy "Usuaria agrega sus autorizaciones" on public.autorizaciones
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Usuaria lee sus autorizaciones" on public.autorizaciones;
create policy "Usuaria lee sus autorizaciones" on public.autorizaciones
  for select to authenticated using (auth.uid() = user_id);

revoke update, delete, truncate on public.autorizaciones from anon, authenticated;
revoke insert, select on public.autorizaciones from anon;

-- La fecha y la dueña las pone el servidor: el teléfono no puede mandar una
-- fecha vieja ni una fila a nombre de otra.
create or replace function public.sellar_autorizacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    new.creado_en := now();
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists a_sellar_autorizacion on public.autorizaciones;
create trigger a_sellar_autorizacion
  before insert on public.autorizaciones
  for each row execute function public.sellar_autorizacion();
-- Solo la usa el trigger: nadie la ejecuta por la API.
revoke execute on function public.sellar_autorizacion() from public, anon, authenticated;

-- ── 2. Estado actual en profiles (columnas nuevas, todas nulables) ──
-- null = todavía no ha respondido. Las fechas *_en las pone el servidor
-- cuando cambia la respuesta.
alter table public.profiles
  add column if not exists autorizacion_version text,         -- 'politica-v1'
  add column if not exists autorizacion_edad boolean,
  add column if not exists autorizacion_cuenta boolean,
  add column if not exists autorizacion_cuenta_en timestamptz,
  add column if not exists autorizacion_ia boolean,            -- «Usar la IA de Ronda» (datos sensibles)
  add column if not exists autorizacion_ia_en timestamptz,
  add column if not exists autorizacion_canal text;            -- dónde respondió la última vez

alter table public.profiles drop constraint if exists profiles_autorizacion_canal_check;
alter table public.profiles add constraint profiles_autorizacion_canal_check
  check (autorizacion_canal is null or autorizacion_canal in ('registro', 'aviso-unico', 'al-usar', 'perfil'));

create or replace function public.sellar_autorizacion_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.autorizacion_cuenta_en := case when new.autorizacion_cuenta is not null then now() end;
      new.autorizacion_ia_en := case when new.autorizacion_ia is not null then now() end;
    else
      new.autorizacion_cuenta_en := case
        when new.autorizacion_cuenta is distinct from old.autorizacion_cuenta then now()
        else old.autorizacion_cuenta_en end;
      new.autorizacion_ia_en := case
        when new.autorizacion_ia is distinct from old.autorizacion_ia then now()
        else old.autorizacion_ia_en end;
    end if;
  end if;
  return new;
end;
$$;

-- "a_sellar…" corre antes que "auto_grant_premium" y después de
-- "a_proteger_premium" (los BEFORE corren por nombre); no tocan las mismas columnas.
drop trigger if exists a_sellar_autorizacion_perfil on public.profiles;
create trigger a_sellar_autorizacion_perfil
  before insert or update on public.profiles
  for each row execute function public.sellar_autorizacion_perfil();
-- Solo la usa el trigger: nadie la ejecuta por la API.
revoke execute on function public.sellar_autorizacion_perfil() from public, anon, authenticated;

-- ── 3. Cada usuaria escribe solo su propia fila de profiles ──
-- Las políticas de schema.sql ya lo hacen (el USING del UPDATE también
-- revisa la fila nueva). Aquí quedan explícitas, con WITH CHECK, y solo
-- para quien tiene sesión. Mismos nombres: reemplazan a las anteriores.
alter table public.profiles enable row level security;

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ── 4. Lo que la app ya no sube: nadie con sesión puede volver a escribirlo ──
-- El diario, los hábitos, sus check-ins, las rutas, las frases favoritas y
-- la racha viven solo en el teléfono. Una versión vieja de la app (una
-- pestaña abierta antes del despliegue o la copia que guarda public/sw.js)
-- todavía podría subirlos con su syncFromLocal: con esto el servidor los
-- rechaza. Se mantienen la lectura y el borrado, para el borrado de los 30
-- días. Las reglas "FOR ALL" de schema.sql quedan, pero sin el permiso de
-- la tabla no alcanzan para escribir.
revoke insert, update on public.journal_entries from anon, authenticated;
revoke insert, update on public.habits from anon, authenticated;
revoke insert, update on public.habit_checks from anon, authenticated;
revoke insert, update on public.active_programs from anon, authenticated;
revoke insert, update on public.fav_quotes from anon, authenticated;
revoke insert, update on public.streaks from anon, authenticated;

-- ── 5 y 6. Esperan el «sí» de Diana: están en consentimiento-pendiente.sql ──

-- ── Consultas útiles (no cambian nada) ──
-- Cuántas cuentas tienen todavía copias en el servidor de lo que ya no se
-- sube (la migración de antes las subía una vez). Se borran a los 30 días
-- de publicar la política, en un paso aparte que hace Diana (borrar las
-- filas de estas seis tablas; obligaciones.md):
--   select 'journal_entries' as tabla, count(distinct user_id) as cuentas, count(*) as filas from public.journal_entries
--   union all select 'active_programs', count(distinct user_id), count(*) from public.active_programs
--   union all select 'habits', count(distinct user_id), count(*) from public.habits
--   union all select 'habit_checks', count(distinct user_id), count(*) from public.habit_checks
--   union all select 'fav_quotes', count(distinct user_id), count(*) from public.fav_quotes
--   union all select 'streaks', count(distinct user_id), count(*) from public.streaks;
-- Cuántas respondieron, por canal y si usan la IA (solo totales):
--   select canal, tipo, valor, count(distinct user_id) from public.autorizaciones group by 1, 2, 3 order by 1, 2, 3;
-- Quiénes tocaron «Rechazar la autorización» y cerraron sesión (su estado de
-- cuenta es «no»; la fila de la prueba queda en autorizaciones): sus
-- cuentas se borran en máximo 15 días hábiles (pregunta 3 de
-- checklist-abogado.md). Da el id y la fecha, sin nada de lo que escribieron:
--   select id, autorizacion_cuenta_en from public.profiles where autorizacion_cuenta = false order by 2;
