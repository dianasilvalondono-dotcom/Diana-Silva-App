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
-- Orden para publicar: aplicar este archivo ANTES de desplegar la app con
-- las autorizaciones (si no, la app las guarda solo en el teléfono y las
-- reintenta subir cada vez que se abre). Se puede aplicar más de una vez.
-- No cambia nada de lo que ya existe: columnas nuevas nulables, una tabla
-- nueva y sus reglas.
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
  creado_en timestamptz not null default now(),     -- hora del servidor
  version_app text check (version_app is null or length(version_app) <= 64)
);

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

-- ── Consulta útil (no cambia nada) ──
-- Cuántas cuentas tienen todavía una copia del diario en el servidor (la que
-- subía la migración de antes; la app ya no la sube). Se borra a los 30 días
-- del aviso único, en un paso aparte que hace Diana:
--   select count(distinct user_id) as cuentas, count(*) as entradas from public.journal_entries;
-- Cuántas respondieron, por canal y si usan la IA (solo totales):
--   select canal, tipo, valor, count(distinct user_id) from public.autorizaciones group by 1, 2, 3 order by 1, 2, 3;
