-- ═══════════════════════════════════════════
--  RONDA — Curaduría (oct 2026)
--  Planes curados, reservas de cupo, reportes privados y la encuesta
--  "¿Te sentiste segura?". Tablas nuevas: no tocan las existentes.
--  Estado: APLICADO en producción el 12-oct-2026 con visto bueno de Diana
--  (migración curaduria_planes_reservas_reportes).
-- ═══════════════════════════════════════════

-- Registro de organizadoras (Ley 1480, art. 53: nombre, documento,
-- dirección y teléfono). Sin política SELECT: solo la curadora lo ve,
-- desde el panel de Supabase o con la service role.
CREATE TABLE IF NOT EXISTS organizadoras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  documento TEXT NOT NULL,
  direccion TEXT NOT NULL,
  telefono TEXT NOT NULL,
  nivel_verificacion INTEGER NOT NULL DEFAULT 1 CHECK (nivel_verificacion IN (1, 2)),
  certificado_antecedentes_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizadoras ENABLE ROW LEVEL SECURITY;

-- Planes curados (los publica la curadora). Solo columnas públicas.
CREATE TABLE IF NOT EXISTS planes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizadora_id UUID REFERENCES organizadoras(id) ON DELETE SET NULL,
  ciudad TEXT NOT NULL,
  barrio TEXT NOT NULL,
  sala TEXT NOT NULL CHECK (sala IN ('salon', 'mesa', 'taller', 'movimiento', 'ciudad', 'acompanamiento')),
  modalidad TEXT NOT NULL DEFAULT 'presencial' CHECK (modalidad IN ('presencial', 'en-linea')),
  colecciones TEXT[] NOT NULL DEFAULT '{}',
  titulo TEXT NOT NULL,
  cuando TEXT NOT NULL,              -- texto visible: "Jueves, 6:00 p. m."
  fecha TIMESTAMPTZ,                 -- próxima fecha, para ordenar
  anfitriona TEXT NOT NULL,
  acceso TEXT NOT NULL DEFAULT 'mixto' CHECK (acceso IN ('solo-mujeres', 'mixto')),
  verificacion INTEGER NOT NULL DEFAULT 1 CHECK (verificacion IN (1, 2)),
  cedula_porque TEXT NOT NULL,
  cedula_para_quien TEXT NOT NULL,
  cedula_como_llegas TEXT NOT NULL,
  cupos INTEGER,
  publicado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Planes publicados visibles" ON planes FOR SELECT USING (publicado = TRUE);
CREATE INDEX IF NOT EXISTS idx_planes_ciudad ON planes(ciudad, publicado);

-- Reservas de cupo
CREATE TABLE IF NOT EXISTS reservas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES planes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  origen TEXT NOT NULL DEFAULT 'ronda' CHECK (origen IN ('ronda', 'organizadora')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (plan_id, user_id)
);

ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cada usuaria ve sus reservas" ON reservas FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Cada usuaria crea sus reservas" ON reservas FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Cada usuaria cancela sus reservas" ON reservas FOR DELETE USING ((select auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_reservas_user ON reservas(user_id);

-- Reportes privados ("Algo no estuvo bien"): los lee solo la curadora
CREATE TABLE IF NOT EXISTS reportes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES planes(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reportes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cada usuaria crea sus reportes" ON reportes FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Encuesta posterior al plan
CREATE TABLE IF NOT EXISTS encuestas_seguridad (
  plan_id UUID REFERENCES planes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  segura BOOLEAN NOT NULL,
  volveria BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (plan_id, user_id)
);

ALTER TABLE encuestas_seguridad ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cada usuaria responde su encuesta" ON encuestas_seguridad FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════
--  Límite de cupos (rondas-10)
--  Estado: PENDIENTE. NO está aplicado en producción: necesita el visto
--  bueno de Diana y aplicarse como migración nueva. Mientras tanto la app
--  sigue igual (muestra el aforo y no limita); en cuanto se aplique, dice
--  cuántos cupos quedan y no deja apartar si está lleno.
-- ═══════════════════════════════════════════

-- Antes de cada reserva: si el plan tiene cupos y ya están todos tomados,
-- la reserva no entra ('cupos_llenos'). FOR UPDATE pone en fila a las que
-- reservan el mismo plan al mismo tiempo, así no se pasa del aforo.
CREATE OR REPLACE FUNCTION public.reservas_validar_cupo()
RETURNS TRIGGER AS $$
DECLARE
  v_cupos INTEGER;
  v_ocupados INTEGER;
BEGIN
  SELECT cupos INTO v_cupos FROM public.planes WHERE id = NEW.plan_id FOR UPDATE;
  IF v_cupos IS NULL THEN
    RETURN NEW;
  END IF;
  -- Si ya tenía su cupo, que responda el UNIQUE (la app lo toma como apartado).
  IF EXISTS (SELECT 1 FROM public.reservas WHERE plan_id = NEW.plan_id AND user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO v_ocupados FROM public.reservas WHERE plan_id = NEW.plan_id;
  IF v_ocupados >= v_cupos THEN
    RAISE EXCEPTION 'cupos_llenos';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER reservas_limite_cupos
  BEFORE INSERT ON reservas
  FOR EACH ROW EXECUTE FUNCTION public.reservas_validar_cupo();

-- Cupos tomados por plan (solo el número, nunca quién reservó), para los
-- planes publicados de una ciudad y los en línea. La app lo llama con
-- supabase.rpc('cupos_ocupados', { p_ciudad }).
CREATE OR REPLACE FUNCTION public.cupos_ocupados(p_ciudad TEXT)
RETURNS TABLE (plan_id UUID, ocupados INTEGER) AS $$
  SELECT r.plan_id, count(*)::INTEGER
  FROM public.reservas r
  JOIN public.planes p ON p.id = r.plan_id
  WHERE p.publicado AND (p.ciudad = p_ciudad OR p.modalidad = 'en-linea')
  GROUP BY r.plan_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.cupos_ocupados(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cupos_ocupados(TEXT) TO authenticated;
