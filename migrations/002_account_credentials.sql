create table if not exists account_credentials (
  email text primary key,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);
