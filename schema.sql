-- ================================================================
-- JHC ADV AGRO — SCHEMA SQL COMPLETO E UNIFICADO v8
-- Projeto: https://supabase.com/dashboard/project/vmiwrzneiygxasivajlq
-- SQL Editor: https://supabase.com/dashboard/project/vmiwrzneiygxasivajlq/sql/new
--
-- INSTRUCOES:
--   1. Acesse o link do SQL Editor acima
--   2. Selecione TODO o conteudo deste arquivo (Ctrl+A)
--   3. Cole no editor e clique em "Run"
--   4. Apos executar: va em Storage -> New Bucket
--      Crie "case-files"  (marcar como publico)
--      Crie "news-files"  (marcar como publico)
-- ================================================================


-- ============================================================
-- PARTE 1: LIMPAR ESTRUTURA ANTIGA
-- (ordem importa por causa das foreign keys)
-- ============================================================

DROP TABLE IF EXISTS public.staff_password_resets CASCADE;
DROP TABLE IF EXISTS public.activity_logs         CASCADE;
DROP TABLE IF EXISTS public.contact_forms         CASCADE;
DROP TABLE IF EXISTS public.case_messages         CASCADE;
DROP TABLE IF EXISTS public.case_files            CASCADE;
DROP TABLE IF EXISTS public.case_updates          CASCADE;
DROP TABLE IF EXISTS public.cases                 CASCADE;
DROP TABLE IF EXISTS public.news                  CASCADE;
DROP TABLE IF EXISTS public.lawyers               CASCADE;
DROP TABLE IF EXISTS public.profiles              CASCADE;

DROP TRIGGER  IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();


-- ============================================================
-- PARTE 2: CRIAR TABELAS
-- ============================================================

-- PERFIS DE CLIENTES (ligados ao Supabase Auth)
CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT,
  cpf         TEXT,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  city        TEXT,
  state       TEXT,
  zip_code    TEXT,
  birth_date  DATE,
  role        TEXT        NOT NULL DEFAULT 'client',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FUNCIONARIOS (login interno, sem Supabase Auth)
CREATE TABLE public.lawyers (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_name      TEXT        NOT NULL,
  staff_login     TEXT        NOT NULL UNIQUE,
  staff_password  TEXT        NOT NULL,
  first_access    BOOLEAN     NOT NULL DEFAULT TRUE,
  staff_email     TEXT,
  oab_number      TEXT,
  staff_role      TEXT        NOT NULL DEFAULT 'lawyer',
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PROCESSOS
CREATE TABLE public.cases (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lawyer_id       UUID        REFERENCES public.lawyers(id),
  lawyer_name     TEXT,
  title           TEXT        NOT NULL,
  description     TEXT,
  case_number     TEXT,
  case_type       TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending',
  priority        TEXT        NOT NULL DEFAULT 'normal',
  court           TEXT,
  opposing_party  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ATUALIZACOES DE PROCESSO
CREATE TABLE public.case_updates (
  id                   UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id              UUID        NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  author_id            UUID,
  title                TEXT        NOT NULL,
  description          TEXT        NOT NULL,
  is_visible_to_client BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ARQUIVOS DE PROCESSO
CREATE TABLE public.case_files (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id           UUID        REFERENCES public.cases(id) ON DELETE CASCADE,
  file_name         TEXT        NOT NULL,
  file_url          TEXT,
  file_type         TEXT,
  file_size         BIGINT,
  uploaded_by       UUID,
  uploaded_by_name  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MENSAGENS DE CHAT (por processo)
CREATE TABLE public.case_messages (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id      UUID        NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  sender_id    UUID,
  sender_name  TEXT,
  sender_role  TEXT,
  content      TEXT        NOT NULL,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTICIAS (publicadas por funcionarios/admin, vistas pelos clientes)
-- author_name = nome do funcionario que publicou
-- file_url    = URL do PDF/imagem anexado (Supabase Storage bucket: news-files)
CREATE TABLE public.news (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id     UUID,
  author_name   TEXT,
  title         TEXT        NOT NULL,
  slug          TEXT        NOT NULL UNIQUE,
  excerpt       TEXT,
  content       TEXT        NOT NULL,
  category      TEXT,
  file_url      TEXT,
  published     BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FORMULARIOS DE CONTATO (do site publico)
CREATE TABLE public.contact_forms (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_name    TEXT        NOT NULL,
  contact_email   TEXT        NOT NULL,
  contact_phone   TEXT,
  contact_area    TEXT,
  message         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LOG DE ATIVIDADES
CREATE TABLE public.activity_logs (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id       UUID,
  actor_name     TEXT,
  actor_role     TEXT,
  action_type    TEXT        NOT NULL,
  action_detail  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SOLICITACOES DE RESET DE SENHA (funcionarios)
-- status: pending | resolved | cancelled
CREATE TABLE public.staff_password_resets (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id        UUID        REFERENCES public.lawyers(id) ON DELETE CASCADE,
  staff_login      TEXT        NOT NULL,
  requester_email  TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending',
  resolved_by      UUID,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- PARTE 3: ROW LEVEL SECURITY (RLS)
-- Politica allow_all para anon + authenticated
-- OBRIGATORIO para que admin (chave anon) leia/escreva tabelas
-- ============================================================

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_updates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_files            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_forms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_password_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON public.profiles              FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.lawyers               FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.cases                 FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.case_updates          FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.case_files            FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.case_messages         FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.news                  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.contact_forms         FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.activity_logs         FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.staff_password_resets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- PARTE 4: TRIGGER — cria perfil automaticamente no cadastro
-- Quando cliente se cadastra via portal (Supabase Auth),
-- este trigger cria o registro em profiles automaticamente
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'client'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- PARTE 5: STORAGE BUCKETS (arquivos)
-- Cria os buckets automaticamente como publicos
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('case-files', 'case-files', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('news-files', 'news-files', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- Politicas de acesso aos arquivos (upload e download para todos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_case_files' AND tablename = 'objects'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "allow_all_case_files" ON storage.objects
        FOR ALL TO anon, authenticated
        USING (bucket_id = 'case-files')
        WITH CHECK (bucket_id = 'case-files')
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_news_files' AND tablename = 'objects'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "allow_all_news_files" ON storage.objects
        FOR ALL TO anon, authenticated
        USING (bucket_id = 'news-files')
        WITH CHECK (bucket_id = 'news-files')
    $p$;
  END IF;
END $$;


-- ============================================================
-- PARTE 6: DADOS INICIAIS — FUNCIONARIOS E ADMIN
-- ============================================================

-- Admin de teste (senha nao precisa trocar)
-- Login: admin | Senha: admin123
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, staff_role, is_active)
VALUES ('Administrador Teste', 'admin', 'admin123', FALSE, 'admin@jhcadvagro.com', 'admin', TRUE);

-- Joao Henrique Caparroz — Admin principal
-- Login: jhc | Senha inicial: jhc (troca obrigatoria no 1 acesso)
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, oab_number, staff_role, is_active)
VALUES ('Joao Henrique Caparroz Gomes', 'jhc', 'jhc', TRUE, 'joao_caparroz@hotmail.com', 'SP 218.270', 'admin', TRUE);

-- Rafaela Salles Gomes — Advogada
-- Login: rafaelajhc | Senha inicial: rafaelajhc
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, oab_number, staff_role, is_active)
VALUES ('Rafaela Salles Gomes', 'rafaelajhc', 'rafaelajhc', TRUE, 'jhc.adv.agro@hotmail.com', 'SP 378.340', 'lawyer', TRUE);

-- Yasmin de Souza Couto — Advogada
-- Login: yasminjhc | Senha inicial: yasminjhc
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, staff_role, is_active)
VALUES ('Yasmin de Souza Couto', 'yasminjhc', 'yasminjhc', TRUE, 'jhc.adv.agro@hotmail.com', 'lawyer', TRUE);

-- Werick Vilela Teles — Advogado
-- Login: werickjhc | Senha inicial: werickjhc
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, staff_role, is_active)
VALUES ('Werick Vilela Teles', 'werickjhc', 'werickjhc', TRUE, 'jhc.adv.agro@hotmail.com', 'lawyer', TRUE);

-- Danielli dos Reis — Advogada
-- Login: daniellijhc | Senha inicial: daniellijhc
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, staff_role, is_active)
VALUES ('Danielli dos Reis', 'daniellijhc', 'daniellijhc', TRUE, 'jhc.adv.agro@hotmail.com', 'lawyer', TRUE);

-- Luara Gigante — Advogada
-- Login: luarajhc | Senha inicial: luarajhc
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, staff_role, is_active)
VALUES ('Luara Gigante', 'luarajhc', 'luarajhc', TRUE, 'jhc.adv.agro@hotmail.com', 'lawyer', TRUE);

-- Ana Caparroz — Secretaria
-- Login: anajhc | Senha inicial: anajhc
INSERT INTO public.lawyers (staff_name, staff_login, staff_password, first_access, staff_email, staff_role, is_active)
VALUES ('Ana Caparroz', 'anajhc', 'anajhc', TRUE, 'jhc.adv.agro@hotmail.com', 'secretary', TRUE);


-- ============================================================
-- PARTE 7: VERIFICACAO FINAL
-- Resultado esperado: 8 funcionarios cadastrados
-- ============================================================

SELECT
  staff_login  AS "Login",
  staff_name   AS "Nome",
  staff_role   AS "Cargo",
  first_access AS "Troca senha 1 acesso",
  is_active    AS "Ativo"
FROM public.lawyers
ORDER BY
  CASE staff_role
    WHEN 'admin'     THEN 1
    WHEN 'lawyer'    THEN 2
    WHEN 'secretary' THEN 3
    ELSE 4
  END,
  staff_name;
