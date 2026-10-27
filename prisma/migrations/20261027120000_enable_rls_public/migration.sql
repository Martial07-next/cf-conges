-- Sécurité Supabase ("RLS Disabled in Public") : active la Row Level Security
-- sur toutes les tables du schéma public, SANS aucune policy.
--
-- Effet : l'API publique de Supabase (clés "anon" et "authenticated") ne peut
-- plus lire ni modifier aucune table. L'application n'est pas impactée :
-- - Prisma se connecte avec le rôle propriétaire des tables (postgres), qui
--   n'est pas soumis à la RLS ;
-- - le stockage des justificatifs utilise la clé "service_role", qui contourne
--   la RLS.
-- Idempotent : peut être exécuté plusieurs fois sans risque.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
