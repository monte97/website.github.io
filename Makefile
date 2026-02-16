.PHONY: help build build-prod dev clean new-post new-project new-note update-modules index

help:
	@echo "Comandi disponibili:"
	@echo "  make build           - Compila il sito (minificazione abilitata)"
	@echo "  make build-prod      - Compila il sito per la produzione (con garbage collection)"
	@echo "  make dev             - Avvia il server di sviluppo con live reload"
	@echo "  make clean           - Elimina la cartella 'public'"
	@echo "  make new-post        - Crea un nuovo blog post interattivo"
	@echo "  make new-project     - Crea un nuovo progetto interattivo"
	@echo "  make new-note        - Crea una nuova nota interattiva"
	@echo "  make update-modules  - Aggiorna i moduli Hugo e le dipendenze npm"
	@echo "  make index           - Genera CONTENT_INDEX.md con l'indice dei post"
	@echo "  make help            - Mostra questo aiuto"

build:
	hugo --minify

build-prod:
	hugo --gc --minify

dev:
	hugo server --buildDrafts

clean:
	rm -rf public/

update-modules:
	@echo "Aggiornamento moduli Hugo..."
	hugo mod tidy
	@echo "Preparazione dipendenze npm..."
	hugo mod npm pack
	@echo "Installazione dipendenze npm..."
	npm install
	@echo "Build del sito..."
	hugo --minify

new-post:
	@./scripts/new_post.sh

new-project:
	@./scripts/new_project.sh

new-note:
	@./scripts/new_note.sh

index:
	@./scripts/content_index.sh
