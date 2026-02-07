-- Create n8n database and user for the n8n sidecar container
-- Password is set via N8N_DB_PASSWORD env var (default: n8n_dev_password)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'n8n_user') THEN
    CREATE ROLE n8n_user WITH LOGIN PASSWORD 'n8n_dev_password';
  END IF;
END
$$;

SELECT 'CREATE DATABASE n8n_db OWNER n8n_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE n8n_db TO n8n_user;
