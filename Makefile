.PHONY: help dev build preview clean

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Dev server with hot reload
	npx astro dev

build: ## Build for production (includes Pagefind indexing)
	npm run build

preview: ## Preview production build locally
	npx astro preview

clean: ## Remove build output
	rm -rf dist .astro
