.PHONY: dev build test clean deploy logs

dev:
	docker compose up

dev-build:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

db-migrate:
	docker compose exec backend npx prisma migrate dev

db-seed:
	docker compose exec backend npx prisma db seed

db-studio:
	cd backend && npx prisma studio

test:
	cd backend && npm test
	cd frontend && npm test

build:
	docker build -t agent-system-backend:latest ./backend
	docker build -t agent-system-frontend:latest ./frontend

deploy:
	docker compose -f docker-compose.prod.yml up -d

deploy-build:
	docker compose -f docker-compose.prod.yml up -d --build

clean:
	docker compose down -v
	rm -rf node_modules backend/node_modules frontend/node_modules
