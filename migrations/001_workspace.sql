create table if not exists workspace_state (
  id text primary key,
  document text not null,
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
