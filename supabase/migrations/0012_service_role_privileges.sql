-- Server-side API routes use the service role and still require object-level
-- privileges even though the role bypasses row-level security.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
