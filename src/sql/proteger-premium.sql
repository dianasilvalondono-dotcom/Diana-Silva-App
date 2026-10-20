-- ═══════════════════════════════════════════════════════════════
-- Ronda+ solo lo asigna el servidor, nunca la usuaria
--
-- Las políticas de profiles dejan que cada usuaria edite su propia fila, y
-- con eso también is_premium, premium_until y premium_source: cualquiera con
-- sesión podía darse Ronda+ desde la API de Supabase, y con Ronda+ gastar la
-- IA. Este trigger deja esas tres columnas fuera del alcance de anon y
-- authenticated. Las sigue escribiendo el panel de Supabase, el service_role
-- y el trigger de miembros fundadoras (auto_grant_premium).
--
-- Orden: los triggers BEFORE corren por nombre. "a_proteger_premium" va antes
-- de "auto_grant_premium" ('_' < 'u'), así la fundadora que asigna ese
-- trigger no se borra.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.proteger_columnas_premium()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_premium := false;
      new.premium_until := null;
      new.premium_source := null;
    else
      new.is_premium := old.is_premium;
      new.premium_until := old.premium_until;
      new.premium_source := old.premium_source;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists a_proteger_premium on public.profiles;
create trigger a_proteger_premium
  before insert or update on public.profiles
  for each row execute function public.proteger_columnas_premium();
