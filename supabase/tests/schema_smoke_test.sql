begin;
select plan(6);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'provider_profiles', 'provider_profiles table exists');
select has_table('public', 'bookings', 'bookings table exists');
select has_table('public', 'payments', 'payments table exists');
select col_is_pk('public', 'profiles', 'id', 'profiles.id is the primary key');
select has_column('public', 'provider_profiles', 'slug', 'provider_profiles has slug');

select * from finish();
rollback;
