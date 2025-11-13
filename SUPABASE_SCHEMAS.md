create table public.agent (
  created_at timestamp with time zone not null default now(),
  name text null,
  city text null,
  country text null,
  email text not null,
  phone text null,
  documents json[] null,
  "profilePicture" text null,
  "userID" uuid not null,
  company uuid null,
  constraint agent_pkey primary key ("userID"),
  constraint agent_email_key unique (email),
  constraint agent_name_key unique (name),
  constraint agent_phone_key unique (phone),
  constraint agent_company_fkey foreign KEY (company) references company ("userID") on update CASCADE on delete set null,
  constraint agent_userID_fkey foreign KEY ("userID") references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create table public.company (
  created_at timestamp with time zone not null default now(),
  name text null,
  city text null,
  country text null,
  documents json[] null,
  "pointOfContact" text null,
  "profilePicture" text null,
  email text not null,
  "userID" uuid not null,
  constraint company_pkey primary key ("userID"),
  constraint company_email_key unique (email),
  constraint company_name_key unique (name),
  constraint company_userID_fkey foreign KEY ("userID") references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;
