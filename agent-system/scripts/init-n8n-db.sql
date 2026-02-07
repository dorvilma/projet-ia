-- Create n8n database and user for the n8n sidecar container
CREATE USER n8n_user WITH PASSWORD 'n8n_dev_password';
CREATE DATABASE n8n_db OWNER n8n_user;
GRANT ALL PRIVILEGES ON DATABASE n8n_db TO n8n_user;
