.PHONY: run stop restart status logs tunnel tunnel-stop clean install build

# YT Save - Makefile (Docker-based)
PORT ?= 8787
COMPOSE := PORT=$(PORT) docker compose
TUNNEL_LOG := /tmp/cf.log

build: ## Build the Docker image
	$(COMPOSE) build

run: ## Build & start the container(s) on port $(PORT)
	@echo "→ Building & starting YT Save (port $(PORT))..."
	$(COMPOSE) up -d --build
	@echo ""
	@echo "  App:    http://localhost:$(PORT)"
	@echo "  Tunnel: make tunnel   (public link)"
	@echo "  Logs:   make logs"

stop: ## Stop containers (keeps bgutil volume/state)
	$(COMPOSE) down

restart: ## Restart containers
	$(COMPOSE) restart

status: ## Show status & health
	@echo "=== Containers ==="; $(COMPOSE) ps; echo ""; echo "=== Health ==="; curl -s http://localhost:$(PORT)/api/health 2>&1 | head -5 || echo "  health check failed (server down)"

logs: ## Tail container logs
	$(COMPOSE) logs -f

tunnel: ## Start public tunnel (Cloudflare) - works outside WiFi
	@echo "→ Starting Cloudflare tunnel for http://localhost:$(PORT) ..."
	@echo "  Keep this terminal open. New URL will be shown below:"
	cloudflared tunnel --url http://localhost:$(PORT)

tunnel-stop: ## Stop tunnel
	pkill -f "cloudflared.*$(PORT)" 2>/dev/null && echo "tunnel stopped" || echo "no tunnel"

install: ## Install deps (host dev only - not needed for Docker)
	npm install
	@echo "For Docker usage you only need Docker installed: run 'make run'."

clean: stop ## Stop and remove everything
	$(COMPOSE) down --rmi local -v
	rm -f $(TUNNEL_LOG)

help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "};{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
