-- Fix role_id backfill: the Phase-1 migration only remapped rows where role_id was NULL, but
-- existing rows already had role_id set by the original roles-system backfill (which pointed at
-- roles that Phase-1 deactivated, e.g. system_admin -> system_admin, super_admin -> viewer).
-- Re-map based on the legacy `role` text column so pre-existing users land on the canonical roles,
-- and deactivate any remaining legacy Retell roles so only the 6 canonical roles are assignable.
SET search_path TO public, extensions;

UPDATE user_tenants ut
SET role_id = r.id
FROM roles r
WHERE r.name = CASE
  WHEN ut.role IN ('system_admin','super_admin') THEN 'platform_admin'
  WHEN ut.role IN ('tenant_admin','organization_admin') THEN 'company_admin'
  WHEN ut.role IN ('subtenant_admin','agent','manager','call_manager') THEN 'company_editor'
  WHEN ut.role IN ('analyst','user','viewer') THEN 'company_viewer'
  ELSE NULL
END;

UPDATE roles SET is_active = false WHERE name IN ('retell_admin','retell_developer','retell_member');
