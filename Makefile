# SC Project — Makefile
# ============================================================================
# Helper commands untuk project SC (backend Go + frontend React).
# Jalankan `make help` untuk melihat daftar semua perintah yang tersedia.
# ============================================================================

# ─── Paths ───────────────────────────────────────────────────────────────────
ROOT_DIR   := $(shell pwd)
BE_DIR     := sc-pos-be
FE_DIR     := shasi
MODELS_DIR := $(FE_DIR)/public/models

# ─── Colors ──────────────────────────────────────────────────────────────────
COLOR_RESET := \033[0m
COLOR_BOLD  := \033[1m
COLOR_GREEN := \033[32m
COLOR_GOLD  := \033[33m
COLOR_BLUE  := \033[34m

.DEFAULT_GOAL := help

# ============================================================================
# 3D MODEL COMMANDS
# ============================================================================
# Perintah-perintah untuk mengelola 3D models (.glb/.gltf) landing page.
#
# Alur kerja (workflow):
#   1. Download model dari Sketchfab (format .glb) → taruh di shasi/public/models/
#   2. Jalankan `make model-transform MODEL=nama-model.glb`
#      → menghasilkan nama-model-transformed.glb (terkompresi 70-90%)
#      → menghasilkan src/components/Model.tsx (React component siap pakai)
#   3. Update Hero3DScene.tsx untuk import component yang di-generate
#   4. Jalankan `make fe-build` untuk verifikasi
#
# Catatan:
#   - Model asli TIDAK diubah, hanya dibuat salinan terkompresi
#   - Flag --transform melakukan: Draco compression + texture resize (1024px)
#     + convert ke WebP + prune empty nodes + dedupe materials
#   - Flag --types menghasilkan TypeScript definitions (autocomplete di editor)
#   - Flag --shadows mengaktifkan cast/receive shadows pada mesh
# ============================================================================

##@ 3D Models

.PHONY: model-transform model-list model-clean model-help

# Transform & generate React component dari file .glb/.gltf
# Usage: make model-transform MODEL=nama-model.glb
# Contoh: make model-transform MODEL=crystal.glb
# Output:
#   - shasi/public/models/nama-model-transformed.glb (model terkompresi)
#   - shasi/src/components/Model.tsx (React component)
model-transform: ## Transform & generate React component dari .glb (Usage: make model-transform MODEL=nama.glb)
	@if [ -z "$(MODEL)" ]; then \
		echo "$(COLOR_GOLD)Error: parameter MODEL wajib diisi$(COLOR_RESET)"; \
		echo "Usage: make model-transform MODEL=nama-model.glb"; \
		echo "Contoh: make model-transform MODEL=crystal.glb"; \
		exit 1; \
	fi
	@if [ ! -f "$(MODELS_DIR)/$(MODEL)" ]; then \
		echo "$(COLOR_GOLD)Error: file $(MODELS_DIR)/$(MODEL) tidak ditemukan$(COLOR_RESET)"; \
		echo "Pastikan model sudah ditaruh di $(MODELS_DIR)/"; \
		exit 1; \
	fi
	@BASE=$$(echo "$(MODEL)" | sed 's/\.[^.]*$$//'); \
	TRANSFORMED="$$BASE-transformed.glb"; \
	echo "$(COLOR_BLUE)→ Step 1/2: Transform $$MODEL (Draco + texture resize + webp) ...$(COLOR_RESET)"; \
	cd $(FE_DIR) && npx gltfjsx public/models/$$BASE.glb --transform --types --shadows; \
	if [ -f "$(FE_DIR)/$$TRANSFORMED" ]; then \
		mv "$(FE_DIR)/$$TRANSFORMED" "$(MODELS_DIR)/$$TRANSFORMED"; \
	fi; \
	echo "$(COLOR_BLUE)→ Step 2/2: Generate React component ($$BASE.tsx) ...$(COLOR_RESET)"; \
	cd $(FE_DIR) && npx gltfjsx public/models/$$TRANSFORMED --types --shadows -o src/components/$$BASE.tsx; \
	echo "$(COLOR_GREEN)✓ Done.$(COLOR_RESET)"; \
	echo "  Model:      $(MODELS_DIR)/$$TRANSFORMED"; \
	echo "  Component:  $(FE_DIR)/src/components/$$BASE.tsx"; \
	echo ""; \
	echo "$(COLOR_GOLD)Next: import $$BASE dari component tsx tsb di Hero3DScene.tsx$(COLOR_RESET)"

# List semua file 3D model yang ada di shasi/public/models/
model-list: ## List semua file 3D model di shasi/public/models/
	@echo "$(COLOR_BOLD)3D Models in $(MODELS_DIR)/:$(COLOR_RESET)"
	@if [ -d "$(MODELS_DIR)" ] && [ "$$(ls -A $(MODELS_DIR) 2>/dev/null)" ]; then \
		ls -lh $(MODELS_DIR)/ | grep -v "^total" | awk '{printf "  %-30s %s\n", $$NF, $$5}'; \
	else \
		echo "  (kosong — taruh file .glb/.gltf di sini)"; \
	fi

# Hapus file hasil transform (nama-model-transformed.glb) dan Model.tsx
# Usage: make model-clean MODEL=nama-model.glb
# Jika MODEL kosong, hapus SEMUA file transformed + Model.tsx
model-clean: ## Hapus file hasil transform (Usage: make model-clean MODEL=nama.glb atau kosongkan untuk hapus semua)
	@if [ -n "$(MODEL)" ]; then \
		echo "→ Removing $(MODELS_DIR)/$(MODEL:.glb=-transformed.glb) ..."; \
		rm -f $(MODELS_DIR)/$(MODEL:.glb=-transformed.glb); \
		rm -f $(MODELS_DIR)/$(MODEL:.gltf=-transformed.glb); \
		echo "$(COLOR_GREEN)✓ Cleaned$(COLOR_RESET)"; \
	else \
		echo "→ Removing all transformed models ..."; \
		find $(MODELS_DIR) -name "*-transformed.glb" -delete 2>/dev/null || true; \
		rm -f $(FE_DIR)/src/components/Model.tsx; \
		echo "$(COLOR_GREEN)✓ Cleaned all transformed files$(COLOR_RESET)"; \
	fi

# ============================================================================
# FRONTEND COMMANDS
# ============================================================================

##@ Frontend (shasi)

.PHONY: fe-install fe-dev fe-build fe-preview fe-lint fe-typecheck

# Install dependencies frontend
fe-install: ## Install dependencies frontend
	cd $(FE_DIR) && npm install

# Jalankan dev server (Vite)
fe-dev: ## Jalankan dev server (Vite)
	cd $(FE_DIR) && npm run dev

# Build production
fe-build: ## Build production
	cd $(FE_DIR) && npm run build

# Preview hasil build
fe-preview: ## Preview hasil build
	cd $(FE_DIR) && npm run preview

# Lint check
fe-lint: ## Lint check
	cd $(FE_DIR) && npm run lint

# TypeScript type check
fe-typecheck: ## TypeScript type check
	cd $(FE_DIR) && npx tsc --noEmit

# ============================================================================
# BACKEND COMMANDS
# ============================================================================

##@ Backend (sc-pos-be)

.PHONY: be-run be-build be-test be-tidy

# Jalankan backend (go run)
be-run: ## Jalankan backend (go run)
	cd $(BE_DIR) && go run main.go

# Build backend binary
be-build: ## Build backend binary
	cd $(BE_DIR) && go build -o server . && echo "✓ Binary: $(BE_DIR)/server"

# Tidy go modules
be-tidy: ## Tidy go modules
	cd $(BE_DIR) && go mod tidy

# Run tests
be-test: ## Run tests
	cd $(BE_DIR) && go test ./...

# ============================================================================
# HELP
# ============================================================================

##@ Utils

.PHONY: help

# Tampilkan daftar semua perintah yang tersedia
help: ## Tampilkan daftar semua perintah yang tersedia
	@echo "$(COLOR_BOLD)SC Project — Makefile Commands$(COLOR_RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make \033[36m<target>\033[0m\n\n"} \
		/^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 } \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)
