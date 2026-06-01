create type user_role as enum ('CLIENT','PROVIDER','ADMIN');
create type service_category as enum (
  'HAIRCUT','FADE','BEARD','BRAIDS','LOCS','COLOR','NAILS','BROWS','LASHES','MAKEUP','FACIAL','WAXING','OTHER'
);
create type booking_status as enum ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW');
create type payment_status as enum ('PENDING','PROCESSING','SUCCEEDED','FAILED','REFUNDED');
create type post_category as enum ('GENERAL','FOR_SALE','TIPS','COLLABORATION','RECOMMENDATION');
create type calendar_provider as enum ('GOOGLE','ICS_FEED');
