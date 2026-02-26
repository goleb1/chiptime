-- Add gender and birth_year to athletes table
alter table athletes
  add column gender text check (gender in ('M', 'F', 'NB')),
  add column birth_year integer check (birth_year between 1900 and 2100);
