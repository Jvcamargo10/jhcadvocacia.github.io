-- ================================================================
-- JHC ADV AGRO — SQL SCHEMA COMPLETO
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/vmiwrzneiygxasivajlq/sql/new
--
-- INSTRUÇÕES: Selecione TODO o conteúdo e execute de uma vez
-- ================================================================

-- PARTE 1: REMOVER tabelas antigas (ordem importa por causa das FKs)
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.contact_forms CASCADE;
DROP TABLE IF EXISTS public.case_messages CASCADE;
DROP TABLE IF EXISTS public.case_files CASCADE;
DROP TABLE IF EXISTS public.case_updates CASCADE;
DROP TABLE IF EXISTS public.cases CASCADE;
DROP TABLE IF EXISTS public.news CASCADE;
DROP TABLE IF EXISTS public.lawyers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- PARTE 2: CRIAR TABELAS

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  cpf TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  birth_date DATE,
  role TEXT NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de funcionários com nomes de colunas sem conflito
CREATE TABLE public.lawyers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_name TEXT NOT NULL,
  staff_login TEXT NOT NULL UNIQUE,
  staff_password TEXT NOT NULL,
  first_access BOOLEAN NOT NULL DEFAULT TRUE,
  staff_email TEXT,
  oab_number TEXT,
  staff_role TEXT NOT NULL DEFAULT 'lawyer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lawyer_id UUID REFERENCES public.lawyers(id),
  lawyer_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  case_number TEXT,
  case_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  court TEXT,
  opposing_party TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.case_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  author_id UUID,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_visible_to_client BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.case_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by UUID,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.case_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_name TEXT,
  sender_role TEXT,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID,
  author_name TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  category TEXT,
  file_url TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.contact_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  contact_area TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID,
  actor_name TEXT,
  actor_role TEXT,
  action_type TEXT NOT NULL,
  action_detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PARTE 3: RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.lawyers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.cases FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.case_updates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.case_files FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.case_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.news FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.contact_forms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.activity_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- PARTE 4: TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email, 'client')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PARTE 5: DADOS DOS FUNCIONÁRIOS
-- ADMIN GENÉRICO: login=admin | senha=admin123 (sem troca obrigatória)
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, staff_role, is_active)
VALUES ('Administrador Teste','admin','admin123',FALSE,'admin@jhcadvagro.com','admin',TRUE);

-- João Henrique: login=jhc | senha=jhc (troca obrigatória no primeiro acesso)
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, oab_number, staff_role, is_active)
VALUES ('Joao Henrique Caparroz Gomes','jhc','jhc',TRUE,'joao_caparroz@hotmail.com','SP 218.270','admin',TRUE);

-- Rafaela: login=rafaelajhc | senha=rafaelajhc
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, oab_number, staff_role, is_active)
VALUES ('Rafaela Salles Gomes','rafaelajhc','rafaelajhc',TRUE,'jhc.adv.agro@hotmail.com','SP 378.340','lawyer',TRUE);

-- Yasmin: login=yasminjhc | senha=yasminjhc
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, staff_role, is_active)
VALUES ('Yasmin de Souza Couto','yasminjhc','yasminjhc',TRUE,'jhc.adv.agro@hotmail.com','lawyer',TRUE);

-- Werick: login=werickjhc | senha=werickjhc
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, staff_role, is_active)
VALUES ('Werick Vilela Teles','werickjhc','werickjhc',TRUE,'jhc.adv.agro@hotmail.com','lawyer',TRUE);

-- Danielli: login=daniellijhc | senha=daniellijhc
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, staff_role, is_active)
VALUES ('Danielli dos Reis','daniellijhc','daniellijhc',TRUE,'jhc.adv.agro@hotmail.com','lawyer',TRUE);

-- Luara: login=luarajhc | senha=luarajhc
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, staff_role, is_active)
VALUES ('Luara Gigante','luarajhc','luarajhc',TRUE,'jhc.adv.agro@hotmail.com','lawyer',TRUE);

-- Ana: login=anajhc | senha=anajhc
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, staff_role, is_active)
VALUES ('Ana Caparroz','anajhc','anajhc',TRUE,'jhc.adv.agro@hotmail.com','secretary',TRUE);

-- VERIFICAÇÃO
SELECT staff_login AS login, staff_name AS nome, staff_role AS cargo, first_access AS "primeiro_acesso"
FROM public.lawyers ORDER BY staff_role, staff_name;
-- ═══════════════════════════════════════════════════════════
-- PARTE 6: STORAGE BUCKETS (execute no dashboard Supabase)
-- Storage → New Bucket → "news-files" (público)
-- Storage → New Bucket → "case-files" (público) se não existir
-- ═══════════════════════════════════════════════════════════

-- Adicionar colunas que podem estar faltando (execute se a tabela já existir):
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS file_url TEXT;
