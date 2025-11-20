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
  constraint agent_phone_key unique (phone),
  constraint agent_company_fkey foreign KEY (company) references company ("userID") on update CASCADE on delete set null,
  constraint agent_userID_fkey foreign KEY ("userID") references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_agent_company on public.agent using btree (company) TABLESPACE pg_default;

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
  constraint company_userID_fkey foreign KEY ("userID") references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create table public.contact_properties (
  id uuid not null default gen_random_uuid (),
  contact_id uuid not null,
  property_id uuid not null,
  role text not null,
  created_at timestamp with time zone not null default now(),
  constraint contact_properties_pkey primary key (id),
  constraint contact_properties_contact_id_property_id_role_key unique (contact_id, property_id, role),
  constraint contact_properties_contact_id_fkey foreign KEY (contact_id) references contacts (id) on delete CASCADE,
  constraint contact_properties_property_id_fkey foreign KEY (property_id) references properties (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists contact_properties_contact_id_idx on public.contact_properties using btree (contact_id) TABLESPACE pg_default;

create index IF not exists contact_properties_property_id_idx on public.contact_properties using btree (property_id) TABLESPACE pg_default;

create table public.contacts (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  first_name text not null,
  last_name text not null,
  email text null,
  phone text null,
  profile_picture_url text null,
  company text null,
  job_title text null,
  address_street text null,
  address_city text null,
  address_state text null,
  address_zip text null,
  address_country text null default 'US'::text,
  status text not null default 'lead'::text,
  source text null,
  tags text[] null default '{}'::text[],
  budget_min numeric(12, 2) null,
  budget_max numeric(12, 2) null,
  notes text null,
  custom_fields jsonb null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  category text null,
  constraint contacts_pkey primary key (id),
  constraint contacts_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint contacts_category_check check (
    (
      (category is null)
      or (
        category = any (
          array[
            'potential_buyer'::text,
            'potential_seller'::text,
            'signed_buyer'::text,
            'signed_seller'::text,
            'potential_lender'::text,
            'potential_tenant'::text
          ]
        )
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists contacts_user_id_idx on public.contacts using btree (user_id) TABLESPACE pg_default;

create index IF not exists contacts_email_idx on public.contacts using btree (email) TABLESPACE pg_default;

create index IF not exists contacts_phone_idx on public.contacts using btree (phone) TABLESPACE pg_default;

create index IF not exists contacts_status_idx on public.contacts using btree (status) TABLESPACE pg_default;

create index IF not exists contacts_created_at_idx on public.contacts using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists contacts_updated_at_idx on public.contacts using btree (updated_at desc) TABLESPACE pg_default;

create index IF not exists contacts_search_idx on public.contacts using gin (
  to_tsvector(
    'english'::regconfig,
    (
      (
        (
          (
            (
              (Error: Failed to run sql query: ERROR: 42P01: relation "users" does not exist
                ((first_name || ' '::text) || last_name) || ' '::text
              ) || COALESCE(email, ''::text)
            ) || ' '::text
          ) || COALESCE(phone, ''::text)
        ) || ' '::text
      ) || COALESCE(company, ''::text)
    )
  )
) TABLESPACE pg_default;

create index IF not exists contacts_category_idx on public.contacts using btree (category) TABLESPACE pg_default;

create trigger contacts_updated_at_trigger BEFORE
update on contacts for EACH row
execute FUNCTION update_contacts_updated_at ();

create table public.documents (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  filename text not null,
  file_url text not null,
  file_size integer null,
  file_type text null,
  entity_type text null,
  entity_id uuid null,
  category text null,
  tags text[] null default '{}'::text[],
  description text null,
  uploaded_by uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  ocr_text text null,
  ocr_status text null default 'pending'::text,
  ocr_processed_at timestamp with time zone null,
  ai_metadata jsonb null default '{}'::jsonb,
  ai_confidence numeric(3, 2) null,
  ai_processed_at timestamp with time zone null,
  has_signature boolean null default false,
  signature_status text null,
  importance_score integer null,
  extracted_names text[] null,
  extracted_dates date[] null,
  related_contact_ids uuid[] null,
  related_property_ids uuid[] null,
  mime_type text null,
  document_date date null,
  due_date date null,
  constraint documents_pkey primary key (id),
  constraint documents_uploaded_by_fkey foreign KEY (uploaded_by) references auth.users (id),
  constraint documents_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists documents_standalone_idx on public.documents using btree (user_id, created_at desc) TABLESPACE pg_default
where
  (entity_type is null);

create index IF not exists documents_document_date_idx on public.documents using btree (document_date desc) TABLESPACE pg_default;

create index IF not exists documents_due_date_idx on public.documents using btree (due_date) TABLESPACE pg_default
where
  (due_date is not null);

create index IF not exists documents_related_contact_ids_idx on public.documents using gin (related_contact_ids) TABLESPACE pg_default;

create index IF not exists documents_related_property_ids_idx on public.documents using gin (related_property_ids) TABLESPACE pg_default;

create index IF not exists documents_ocr_status_idx on public.documents using btree (ocr_status) TABLESPACE pg_default
where
  (ocr_status <> 'completed'::text);

create index IF not exists documents_importance_score_idx on public.documents using btree (importance_score desc) TABLESPACE pg_default;

create index IF not exists documents_user_id_idx on public.documents using btree (user_id) TABLESPACE pg_default;

create index IF not exists documents_entity_type_idx on public.documents using btree (entity_type) TABLESPACE pg_default;

create index IF not exists documents_entity_id_idx on public.documents using btree (entity_id) TABLESPACE pg_default;

create index IF not exists documents_entity_composite_idx on public.documents using btree (entity_type, entity_id) TABLESPACE pg_default;

create index IF not exists documents_category_idx on public.documents using btree (category) TABLESPACE pg_default;

create index IF not exists documents_created_at_idx on public.documents using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists documents_search_idx on public.documents using gin (
  to_tsvector(
    'english'::regconfig,
    (
      (
        (
          (filename || ' '::text) || COALESCE(description, ''::text)
        ) || ' '::text
      ) || COALESCE(category, ''::text)
    )
  )
) TABLESPACE pg_default;

create index IF not exists documents_ocr_text_idx on public.documents using gin (
  to_tsvector(
    'english'::regconfig,
    COALESCE(ocr_text, ''::text)
  )
) TABLESPACE pg_default;

create index IF not exists documents_ai_metadata_idx on public.documents using gin (ai_metadata) TABLESPACE pg_default;

create trigger document_auto_queue_trigger
after INSERT on documents for EACH row
execute FUNCTION auto_queue_document_for_ocr ();

create trigger documents_updated_at_trigger BEFORE
update on documents for EACH row
execute FUNCTION update_documents_updated_at ();

create trigger sync_file_type_trigger BEFORE INSERT
or
update on documents for EACH row
execute FUNCTION sync_file_type_columns ();

create table public.ocr_queue (
  id uuid not null default gen_random_uuid (),
  document_id uuid not null,
  user_id uuid not null,
  status text not null default 'queued'::text,
  priority integer null default 5,
  attempts integer null default 0,
  max_attempts integer null default 3,
  vps_instance_id text null,
  started_at timestamp with time zone null,
  completed_at timestamp with time zone null,
  error_message text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  file_url text null,
  file_type text null,
  constraint ocr_queue_pkey primary key (id),
  constraint ocr_queue_document_id_key unique (document_id),
  constraint ocr_queue_document_id_fkey foreign KEY (document_id) references documents (id) on delete CASCADE,
  constraint ocr_queue_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint ocr_queue_priority_check check (
    (
      (priority >= 1)
      and (priority <= 10)
    )
  ),
  constraint ocr_queue_status_check check (
    (
      status = any (
        array[
          'queued'::text,
          'processing'::text,
          'completed'::text,
          'failed'::text,
          'retrying'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists ocr_queue_status_priority_idx on public.ocr_queue using btree (status, priority desc, created_at) TABLESPACE pg_default
where
  (
    status = any (array['queued'::text, 'retrying'::text])
  );

create index IF not exists ocr_queue_user_id_idx on public.ocr_queue using btree (user_id) TABLESPACE pg_default;

create table public.properties (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  title text not null,
  description text null,
  address text not null,
  city text null,
  state text null,
  zip_code text null,
  country text null default 'US'::text,
  latitude numeric(10, 8) null,
  longitude numeric(11, 8) null,
  price numeric(12, 2) null,
  bedrooms integer null,
  bathrooms numeric(3, 1) null,
  square_feet integer null,
  lot_size integer null,
  year_built integer null,
  property_type text not null default 'residential'::text,
  status text not null default 'available'::text,
  images text[] null default '{}'::text[],
  virtual_tour_url text null,
  listing_date date null,
  tags text[] null default '{}'::text[],
  custom_fields jsonb null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint properties_pkey primary key (id),
  constraint properties_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists properties_user_id_idx on public.properties using btree (user_id) TABLESPACE pg_default;

create index IF not exists properties_status_idx on public.properties using btree (status) TABLESPACE pg_default;

create index IF not exists properties_property_type_idx on public.properties using btree (property_type) TABLESPACE pg_default;

create index IF not exists properties_price_idx on public.properties using btree (price) TABLESPACE pg_default;

create index IF not exists properties_created_at_idx on public.properties using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists properties_listing_date_idx on public.properties using btree (listing_date desc) TABLESPACE pg_default;

create index IF not exists properties_search_idx on public.properties using gin (
  to_tsvector(
    'english'::regconfig,
    (
      (
        (
          (
            (
              (title || ' '::text) || COALESCE(description, ''::text)
            ) || ' '::text
          ) || COALESCE(address, ''::text)
        ) || ' '::text
      ) || COALESCE(city, ''::text)
    )
  )
) TABLESPACE pg_default;

create trigger properties_updated_at_trigger BEFORE
update on properties for EACH row
execute FUNCTION update_properties_updated_at ();

create table public.subscriptions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  status text not null default 'trial'::text,
  trial_ends_at timestamp with time zone not null,
  subscription_start_date timestamp with time zone null,
  subscription_end_date timestamp with time zone null,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  plan_type text null,
  plan_price_id text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint subscriptions_pkey primary key (id),
  constraint subscriptions_stripe_customer_id_key unique (stripe_customer_id),
  constraint subscriptions_stripe_subscription_id_key unique (stripe_subscription_id),
  constraint unique_user_subscription unique (user_id),
  constraint subscriptions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.deals (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  contact_id uuid not null,
  property_id uuid null,
  title text not null,
  value numeric(12, 2) null,
  stage text not null default 'lead'::text,
  probability integer null,
  expected_close_date date null,
  actual_close_date date null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint deals_pkey primary key (id),
  constraint deals_contact_id_fkey foreign KEY (contact_id) references contacts (id) on delete CASCADE,
  constraint deals_property_id_fkey foreign KEY (property_id) references properties (id) on delete set null,
  constraint deals_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint deals_probability_check check (
    (
      (probability >= 0)
      and (probability <= 100)
    )
  )
) TABLESPACE pg_default;

create index IF not exists deals_user_id_idx on public.deals using btree (user_id) TABLESPACE pg_default;

create index IF not exists deals_contact_id_idx on public.deals using btree (contact_id) TABLESPACE pg_default;

create index IF not exists deals_property_id_idx on public.deals using btree (property_id) TABLESPACE pg_default;

create index IF not exists deals_stage_idx on public.deals using btree (stage, user_id) TABLESPACE pg_default;

create index IF not exists deals_expected_close_date_idx on public.deals using btree (expected_close_date) TABLESPACE pg_default;

create index IF not exists deals_created_at_idx on public.deals using btree (created_at desc) TABLESPACE pg_default;

create trigger update_deals_updated_at BEFORE
update on deals for EACH row
execute FUNCTION update_updated_at_column ();