-- ════════════════════════════════════════════════════════════════════════
-- ProjectOS · Supabase — 0002 RLS, Storage y Triggers
-- Aislamiento multi-tenant: cada fila se filtra por la organización del
-- usuario autenticado (auth.uid() → memberships). Super-admin bypassa.
-- ════════════════════════════════════════════════════════════════════════

-- ── Helpers de contexto (SECURITY DEFINER para leer memberships sin recursión) ──
create or replace function public.current_user_orgs()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select organization_id from memberships where user_id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_super_admin from profiles where id = auth.uid()), false)
$$;

create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_super_admin()
      or exists (select 1 from memberships
                 where user_id = auth.uid() and organization_id = p_org)
$$;

-- ── Política genérica para tablas con organization_id ───────────────────
do $$
declare
  t text;
  tenant_tables text[] := array[
    'memberships','teams','team_members','projects','board_columns','milestones',
    'tasks','dependencies','checklist_items','labels','task_labels','comments',
    'attachments','time_blocks','objectives','key_results','documents',
    'activities','notifications'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force  row level security', t);
    execute format('drop policy if exists tenant_rw on %I', t);
    execute format(
      'create policy tenant_rw on %I to authenticated '
      'using (public.is_org_member(organization_id)) '
      'with check (public.is_org_member(organization_id))', t);
  end loop;
end $$;

-- ── organizations (clave por id) ────────────────────────────────────────
alter table organizations enable row level security;
alter table organizations force  row level security;
drop policy if exists org_member on organizations;
create policy org_member on organizations to authenticated
  using (public.is_org_member(id))
  with check (public.is_super_admin());   -- solo super-admin crea/edita orgs vía cliente

-- ── key_result_projects (tabla puente; deriva la org del proyecto) ──────
alter table key_result_projects enable row level security;
alter table key_result_projects force  row level security;
drop policy if exists krp_rw on key_result_projects;
create policy krp_rw on key_result_projects to authenticated
  using (exists (select 1 from projects p
                 where p.id = project_id and public.is_org_member(p.organization_id)))
  with check (exists (select 1 from projects p
                 where p.id = project_id and public.is_org_member(p.organization_id)));

-- ── profiles ────────────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table profiles force  row level security;
-- Visible: super-admin · uno mismo · quien comparte alguna organización.
drop policy if exists profile_read on profiles;
create policy profile_read on profiles for select to authenticated
  using (
    public.is_super_admin()
    or id = auth.uid()
    or exists (
      select 1 from memberships m
      where m.user_id = profiles.id
        and m.organization_id in (select public.current_user_orgs())
    )
  );
-- Solo uno mismo edita su perfil.
drop policy if exists profile_write on profiles;
create policy profile_write on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════
-- STORAGE — bucket de adjuntos, aislado por organización
-- Convención de ruta: <organization_id>/<task_id>/<archivo>
-- ════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists attachments_rw on storage.objects;
create policy attachments_rw on storage.objects to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_org_member( ((storage.foldername(name))[1])::uuid )
  )
  with check (
    bucket_id = 'attachments'
    and public.is_org_member( ((storage.foldername(name))[1])::uuid )
  );

-- ════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ════════════════════════════════════════════════════════════════════════

-- Al registrarse un usuario en Supabase Auth → crear su profile.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at automático.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
  touched text[] := array['profiles','organizations','projects','tasks','documents'];
begin
  foreach t in array touched loop
    execute format('drop trigger if exists trg_touch_%1$s on %1$I', t);
    execute format(
      'create trigger trg_touch_%1$s before update on %1$I '
      'for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;
