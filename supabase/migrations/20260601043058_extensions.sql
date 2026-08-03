-- Required Postgres extensions for the Faineant schema.
create extension if not exists "btree_gist" schema extensions; -- equality ops in GiST (booking EXCLUDE)
create extension if not exists "postgis" schema extensions; -- keep extension tables out of exposed public schema
create extension if not exists "pg_trgm" schema extensions; -- trigram text search
create extension if not exists "moddatetime" schema extensions; -- updated_at triggers
