-- ════════════════════════════════════════════════════════════════════════
-- Seed (alternativa SQL para el panel de Supabase)
-- Requisito previo: crea el usuario admin en Authentication → Add user
-- (o con seed-admin.mjs). Este script lo vincula como super-admin OWNER.
-- Ejecutar en SQL Editor. Idempotente.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Organización plataforma
insert into organizations (name, slug, plan, seats)
values ('ProjectOS', 'projectos', 'ENTERPRISE', 999)
on conflict (slug) do nothing;

-- 2) Marca al admin como super-admin y crea su membership OWNER.
do $$
declare
  v_email text := coalesce(current_setting('app.admin_email', true), 'admin@projectos.app');
  v_uid   uuid;
  v_org   uuid;
begin
  select id into v_uid from profiles where email = v_email;
  select id into v_org from organizations where slug = 'projectos';

  if v_uid is null then
    raise notice 'Crea primero el usuario % en Authentication → Add user.', v_email;
    return;
  end if;

  update profiles set is_super_admin = true where id = v_uid;

  insert into memberships (user_id, organization_id, role)
  values (v_uid, v_org, 'OWNER')
  on conflict (user_id, organization_id) do update set role = 'OWNER';

  insert into labels (organization_id, name, color) values
    (v_org, 'Bug', '#ef4444'),
    (v_org, 'Feature', '#6366f1'),
    (v_org, 'UX', '#10b981')
  on conflict (organization_id, name) do nothing;

  raise notice 'Admin % vinculado como super-admin OWNER de ProjectOS.', v_email;
end $$;
