-- ==========================================
-- SCRIPT DE CONFIGURACIÓN DE BASE DE DATOS SUPABASE
-- Cópialo y ejecútalo en el Editor SQL de tu panel de Supabase
-- ==========================================

-- 1. TABLA DE PLANES (PACKS)
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS en plans (Cualquiera puede leer los planes)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de planes a usuarios autenticados" ON public.plans;
CREATE POLICY "Permitir lectura de planes a usuarios autenticados" 
    ON public.plans FOR SELECT 
    TO authenticated 
    USING (true);

-- 2. TABLA DE TOKENS DE LICENCIA
CREATE TABLE IF NOT EXISTS public.license_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_code TEXT UNIQUE NOT NULL,
    plan_id TEXT REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
    duration_days INTEGER NOT NULL,
    max_activations INTEGER DEFAULT 1 NOT NULL,
    activations_count INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS en license_tokens (Solo el sistema/funciones de base de datos leen directamente)
ALTER TABLE public.license_tokens ENABLE ROW LEVEL SECURITY;

-- 3. TABLA DE SUSCRIPCIONES DE USUARIOS
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Relacionado con auth.users(id) de Supabase
    token_id UUID REFERENCES public.license_tokens(id) ON DELETE SET NULL,
    plan_id TEXT REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS en user_subscriptions (Los usuarios solo leen sus propias suscripciones)
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias suscripciones" ON public.user_subscriptions;
CREATE POLICY "Los usuarios pueden ver sus propias suscripciones" 
    ON public.user_subscriptions FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- 4. TABLA DE PROGRESO DIARIO DE TAREAS
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_id TEXT REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
    day INTEGER NOT NULL,
    task_id TEXT NOT NULL,
    completed BOOLEAN DEFAULT false NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, plan_id, day, task_id)
);

-- Habilitar RLS en user_progress (Control total del usuario sobre su progreso)
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden gestionar su propio progreso" ON public.user_progress;
CREATE POLICY "Usuarios pueden gestionar su propio progreso" 
    ON public.user_progress FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. TABLA DE TELEMETRÍA (BIENESTAR DIARIO)
CREATE TABLE IF NOT EXISTS public.user_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_id TEXT REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
    day INTEGER NOT NULL,
    value INTEGER CHECK (value BETWEEN 1 AND 5) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, plan_id, day)
);

-- Habilitar RLS en user_telemetry (Control total del usuario sobre su bienestar)
ALTER TABLE public.user_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden gestionar su propia telemetría" ON public.user_telemetry;
CREATE POLICY "Usuarios pueden gestionar su propia telemetría" 
    ON public.user_telemetry FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ==========================================
-- FUNCIONES BOTÁNICAS Y DE SEGURIDAD (PL/pgSQL)
-- ==========================================

-- Función de Activación de Token Atómica y Segura
CREATE OR REPLACE FUNCTION public.activate_license_token(
    input_token_code TEXT,
    input_user_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    plan_id TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con permisos de administrador para leer/escribir tokens y suscripciones
AS $$
DECLARE
    found_token RECORD;
    new_expires_at TIMESTAMP WITH TIME ZONE;
    new_sub_id UUID;
BEGIN
    -- 1. Buscar y bloquear para actualización el token
    SELECT * INTO found_token 
    FROM public.license_tokens 
    WHERE token_code = input_token_code AND is_active = true
    FOR UPDATE;

    -- 2. Validaciones básicas
    IF found_token.id IS NULL THEN
        RETURN QUERY SELECT false, 'El código introducido no es válido o ha sido desactivado.'::TEXT, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    IF found_token.activations_count >= found_token.max_activations THEN
        RETURN QUERY SELECT false, 'El código ya ha alcanzado el límite máximo de activaciones.'::TEXT, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    -- 3. Calcular fecha de expiración de la suscripción
    new_expires_at := NOW() + (found_token.duration_days * INTERVAL '1 day');

    -- Desactivar cualquier suscripción activa anterior para el mismo plan de este usuario
    UPDATE public.user_subscriptions AS sub
    SET is_active = false 
    WHERE sub.user_id = input_user_id AND sub.plan_id = found_token.plan_id;

    -- 4. Crear registro de suscripción
    INSERT INTO public.user_subscriptions (user_id, token_id, plan_id, expires_at, is_active)
    VALUES (input_user_id, found_token.id, found_token.plan_id, new_expires_at, true)
    RETURNING id INTO new_sub_id;

    -- 5. Incrementar el contador de uso del token
    UPDATE public.license_tokens
    SET activations_count = activations_count + 1,
        is_active = CASE WHEN activations_count + 1 >= max_activations THEN false ELSE is_active END
    WHERE id = found_token.id;

    -- Retornar éxito
    RETURN QUERY SELECT true, '¡Plan activado correctamente!'::TEXT, found_token.plan_id, new_expires_at;
END;
$$;


-- ==========================================
-- UTILIDAD: FUNCIÓN PARA GENERAR TOKENS EN LOTES
-- ==========================================

-- Función para pregenerar un lote de códigos únicos de licencia para impresión
-- Formato del código generado: ATERPE-XXXX-XXXX (letras y números aleatorios)
CREATE OR REPLACE FUNCTION public.create_batch_license_tokens(
    target_plan_id TEXT,
    token_duration_days INTEGER,
    batch_size INTEGER,
    prefix TEXT DEFAULT 'ATERPE'
)
RETURNS TABLE (
    code TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    i INTEGER;
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Omitimos I, O, 0, 1 para evitar confusión al leerlos
    part1 TEXT;
    part2 TEXT;
    new_code TEXT;
BEGIN
    FOR i IN 1..batch_size LOOP
        LOOP
            -- Generar dos bloques de 4 caracteres aleatorios
            part1 := '';
            part2 := '';
            FOR j IN 1..4 LOOP
                part1 := part1 || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
                part2 := part2 || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
            END LOOP;
            
            new_code := prefix || '-' || part1 || '-' || part2;
            
            -- Asegurar unicidad
            IF NOT EXISTS (SELECT 1 FROM public.license_tokens WHERE token_code = new_code) THEN
                EXIT;
            END IF;
        END LOOP;

        -- Insertar el token generado
        INSERT INTO public.license_tokens (token_code, plan_id, duration_days)
        VALUES (new_code, target_plan_id, token_duration_days);

        code := new_code;
        RETURN NEXT;
    END LOOP;
END;
$$;


-- ==========================================
-- SEMILLAS (DATOS INICIALES OBLIGATORIOS)
-- ==========================================

-- Insertar el plan inicial de Depuración Deluxe de 21 días
INSERT INTO public.plans (id, name, duration_days, description)
VALUES (
    'depuracion-deluxe', 
    'Depuración Deluxe - 21 Días', 
    21, 
    'Protocolo de tres fases (Digestivo, Hepático y Renal) diseñado para regenerar la microbiota, activar la depuración hepatobiliar y optimizar la filtración renal.'
) ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, duration_days = EXCLUDED.duration_days, description = EXCLUDED.description;

-- Generar un lote de 3 tokens de prueba iniciales (imprime los resultados para usarlos)
-- SELECT * FROM public.create_batch_license_tokens('depuracion-deluxe', 30, 3, 'TEST');
