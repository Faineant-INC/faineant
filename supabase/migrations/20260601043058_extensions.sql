-- Required Postgres extensions for the Faineant schema.
create extension if not exists "btree_gist";   -- equality ops in GiST (booking EXCLUDE)
create extension if not exists "postgis";       -- geo search (geography columns added later)
create extension if not exists "pg_trgm";       -- trigram text search
create extension if not exists "moddatetime" schema extensions; -- updated_at triggers
