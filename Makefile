.PHONY: run stop restart status logs tunnel tunnel-stop clean install

# YT Save - Makefile for run / stop
PORT ?= 8787
LOG  := /tmp/yt.log
PIDFILE := /tmp/yt-downloader.pid
BG_CONTAINER := bgutil
TUNNEL_LOG := /tmp/cf.log

run: ## Start server (optimized) + bgutil POT provider
	@echo "→ Starting bgutil POT provider (port 4416)..."
	@if ! docker ps --format '{{.Names}}' | grep -q "^$(BG_CONTAINER)$$"; then \
		if docker ps -a --format '{{.Names}}' | grep -q "^$(BG_CONTAINER)$$"; then docker rm $(BG_CONTAINER) >/dev/null 2>&1 || true; fi; \
		docker run -d --name $(BG_CONTAINER) -p 4416:4416 brainicism/bgutil-ytdlp-pot-provider >/dev/null && echo "  ✓ bgutil started"; \
	else echo "  ✓ bgutil already running"; fi
	@echo "→ Starting server on port $(PORT)..."
	@if ss -tlnp 2>/dev/null | grep -q ":$(PORT)"; then echo "  ✗ Port $(PORT) already in use (maybe already running). Use 'make stop' first."; exit 1; fi
	@PORT=$(PORT) nohup node server.js > $(LOG) 2>&1 & echo $$! > $(PIDFILE) 2>/dev/null || PORT=$(PORT) nohup node server.js > $(LOG) 2>&1 & echo $$! > /tmp/yt-downloader.pid
	@sleep 2; if ss -tlnp 2>/dev/null | grep -q ":$(PORT)"; then echo "  ✓ Server running"; cat $(LOG) | tail -5; echo ""; echo "  Laptop: http://localhost:$(PORT)"; echo "  iPhone LAN: http://192.168.254.104:$(PORT)"; echo "  Run 'make tunnel' for public link"; else echo "  ✗ Failed to start - check $(LOG)"; cat $(LOG) | tail -30; exit 1; fi
	@ps aux | grep "[n]ode.*server.js" | grep -v grep | awk '{print "  PID:", $$2}'

stop: ## Stop server and tunnel (keeps bgutil)
	@echo "→ Stopping server..."
	@if [ -f $(PIDFILE) ]; then kill $$(cat $(PIDFILE)) 2>/dev/null && echo "  ✓ stopped PID $$(cat $(PIDFILE))" || true; rm -f $(PIDFILE); fi
	@pkill -f "[n]ode.*yt-downloader/server.js" 2>/dev/null && echo "  ✓ server stopped" || echo "  (no server process)"
	@pkill -f "[c]loudflared.*$(PORT)" 2>/dev/null && echo "  ✓ tunnel stopped" || true
	@pkill -f "[l]ocaltunnel.*$(PORT)" 2>/dev/null && echo "  ✓ localtunnel stopped" || true
	@sleep 1; ss -tlnp 2>/dev/null | grep -q ":$(PORT)" && echo "  ✗ Port $(PORT) still busy" || echo "  ✓ Port $(PORT) free"

restart: stop run ## Restart server

status: ## Show status
	@echo "=== Server ==="; ss -tlnp 2>/dev/null | grep $(PORT) || echo "  not running on :$(PORT)"; ps aux | grep "[n]ode.*yt-downloader" | grep -v grep || echo "  no node process"; echo ""; echo "=== Bgutil (POT) ==="; docker ps | grep $(BG_CONTAINER) || echo "  bgutil not running"; curl -s http://127.0.0.1:4416/ping 2>&1 | head -5 || echo "  bgutil ping failed"; echo ""; echo "=== Health ==="; curl -s http://localhost:$(PORT)/api/health 2>&1 | head -5 || echo "  health check failed (server down)"

logs: ## Tail server logs
	tail -f $(LOG)

tunnel: ## Start public tunnel (Cloudflare) - works outside WiFi
	@echo "→ Starting Cloudflare tunnel for http://localhost:$(PORT) ..."
	@echo "  Keep this terminal open. New URL will be shown below:"
	cloudflared tunnel --url http://localhost:$(PORT)

tunnel-stop: ## Stop tunnel
	pkill -f "cloudflared.*$(PORT)" 2>/dev/null && echo "tunnel stopped" || echo "no tunnel"

install: ## Install deps
	npm install
	@echo "Also ensure yt-dlp and bgutil are ready:"
	@yt-dlp --version; pip show bgutil-ytdlp-pot-provider 2>&1 | head -3; docker --version | head -1

clean: stop ## Stop and remove bgutil container
	docker rm -f $(BG_CONTAINER) 2>/dev/null && echo "bgutil removed" || true
	rm -f $(PIDFILE) $(LOG) $(TUNNEL_LOG)

help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "};{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
