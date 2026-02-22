---
title: "Da port-forward a Ingress: Come configurare un ambiente Kubernetes locale professionale con NGINX"
date: 2025-10-21T11:00:00+02:00
description: "Guida completa alla configurazione di un Ingress Controller NGINX su un cluster Kubernetes locale (kind) per esporre servizi in modo stabile e professionale."
menu:
  sidebar:
    name: "Ingress su kind"
    identifier: "kind-ingress"
    weight: 10
    parent: "K8S-Core"
tags: ["Kubernetes", "kind", "Ingress", "NGINX", "DevOps", "Sviluppo Locale"]
categories: ["Kubernetes", "Cloud Native", "Infrastruttura"]
reviewed: human
reproducibility: true
---

## Il Problema: Accedere ai Servizi in un Ambiente di Sviluppo Locale

Un pattern comune nello sviluppo locale con Kubernetes è aprire diversi terminali, uno per ogni `kubectl port-forward ...`. Funziona, ma è scomodo e non simula affatto un ambiente reale.

Per comprendere meglio questi concetti, è utile consultare la [documentazione ufficiale di Kubernetes](https://kubernetes.io/docs/home/).

Per approfondire l'uso di `kubectl`, consulta la [documentazione ufficiale di kubectl](https://kubernetes.io/docs/reference/kubectl/).

### Il Caos del `port-forward`

Questo è il "workaround" più comune. Dobbiamo creare manualmente un tunnel dal nostro PC a *ciascun* servizio.

1.  Aprire un **primo terminale** e lasciarlo in esecuzione:
    ```bash
    # Il terminale 1 inoltra la porta 8080 al servizio FOO
    kubectl port-forward service/foo-service 8080:80
    ```
2.  Aprire un **secondo terminale** e lasciarlo in esecuzione:
    ```bash
    # Il terminale 2 inoltra la porta 8081 al servizio BAR
    kubectl port-forward service/bar-service 8081:80
    ```

Per testare, è necessario usare URL diversi su porte diverse:

  * Per FOO: `curl http://localhost:8080`
  * Per BAR: `curl http://localhost:8081`

**I problemi sono evidenti:**

  * Devi tenere aperti **N terminali** per **N servizi**.
  * Devi inventarti e ricordarti una **porta diversa** (`8080`, `8081`, ...) per ogni servizio.
  * Non stai testando un URL reale (come `/foo`) ma solo una porta.
  * È un **tunnel di debug**, non un vero servizio di rete. È fragile e non replica un ambiente di produzione.

```text
+-----------------+      +---------------------------------------------+
|   Developer PC  |      |              Kubernetes Cluster             |
|                 |      |                                             |
| +-----------+   |----->| service/foo ---> pod-foo                    |
| | Terminal 1|   | 8080 |                                             |
| | port-fwd  |   |      |                                             |
| +-----------+   |      |                                             |
|                 |      |                                             |
| +-----------+   |----->| service/bar ---> pod-bar                    |
| | Terminal 2|   | 8081 |                                             |
| | port-fwd  |   |      |                                             |
| +-----------+   |      +---------------------------------------------+
+-----------------+
```

### L'alternativa a Layer 4: `NodePort`

Un'altra opzione è usare un `Service` di tipo `NodePort`. Questo apre una porta statica su *ogni* nodo del cluster. Sebbene più stabile del `port-forward`, funziona a **Layer 4** (TCP/UDP). Questo significa che non capisce il protocollo HTTP e non può:
- Leggere l'host (es. `miodominio.local`)
- Leggere il percorso (es. `/foo`)
- Smistare il traffico in base a queste informazioni.

Con `NodePort`, ogni servizio richiederebbe comunque una sua porta dedicata.

Ecco una rappresentazione del flusso di traffico con un servizio NodePort:

```text
+-----------------+      +---------------------------------------------+
|   Developer PC  |      |              Kubernetes Cluster           |
|                 |      |                                             |
| +-----------+   |----->| service/foo (NodePort 30001) -> pod-foo    |
| | curl      |   | 30001|                                             |
| | http://   |   |      |                                             |
| | localhost:|   |      |                                             |
| | 30001     |   |      |                                             |
| +-----------+   |      |                                             |
|                 |      |                                             |
| +-----------+   |----->| service/bar (NodePort 30002) -> pod-bar    |
| | curl      |   | 30002|                                             |
| | http://   |   |      |                                             |
| | localhost:|   |      |                                             |
| | 30002     |   |      |                                             |
| +-----------+   |      +---------------------------------------------+
+-----------------+
```

Per approfondire il funzionamento dei servizi NodePort, consulta la [documentazione ufficiale di Kubernetes sui servizi](https://kubernetes.io/docs/concepts/services-networking/service/).

---

## La Soluzione: Routing a Layer 7 con un Ingress Controller

Vogliamo un unico punto d'ingresso (`http://miodominio.local`), un'unica porta (la `80`) e un routing pulito basato su percorsi (`/foo` va a FOO, `/bar` va a BAR). Questo è **routing di Layer 7** (HTTP), ed è *esattamente* ciò che fa un Ingress Controller.

### Il Modello Dichiarativo di Kubernetes in Azione

La soluzione si basa su due componenti che sono un esempio perfetto del modello dichiarativo di Kubernetes. Invece di dare comandi su *come* configurare la rete, noi *dichiariamo* lo stato desiderato, e Kubernetes lavora per noi.

*   **Ingress Controller**: È il **componente software** che funge da **reverse proxy** e punto di ingresso per il cluster. Il suo compito è osservare le risorse `Ingress` e riconfigurare dinamicamente il proxy per applicare le regole di routing definite. Questo processo di riconciliazione automatica è reso possibile dal **[pattern dei controller](https://kubernetes.io/docs/concepts/architecture/controller/)**, il cuore pulsante di Kubernetes. Rappresenta il **Data Plane**: il componente che esegue materialmente lo smistamento del traffico.

*   **Oggetto [Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)**: È la **risorsa di configurazione** in formato YAML che definisce un **set di regole** per il routing. Qui dichiariamo le nostre intenzioni: "il traffico per `miodominio.local/foo` deve andare al `foo-service`". Rappresenta il **Control Plane** della nostra configurazione di rete: definisce lo stato desiderato.

L'Ingress Controller osserva l'API di Kubernetes. Non appena applichiamo una risorsa `Ingress`, il controller la rileva e si riconfigura dinamicamente per implementare le regole definite.

Per approfondire come funziona il modello dichiarativo di Kubernetes, consulta la [documentazione ufficiale](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/).

Ecco una rappresentazione del flusso di traffico con un Ingress Controller:

```text
+----------+      +----------------+      +--------------------+      +-----------------+      +---------+
|          |      |                |      | Ingress Controller |      |                 |      |         |
|   User   |----->| localhost:80   |----->| (Service su        |----->|   foo-service   |----->| Pod foo |
|          |      | (PC/Docker)    |      |  NodePort 32000)   |      |                 |      |         |
+----------+      +----------------+      |                    |      +-----------------+      +---------+
                                          | Regole:            |
                                          | /foo -> foo-service|
                                          | /bar -> bar-service|      +-----------------+      +---------+
                                          |                    |      |                 |      |         |
                                          |                    |----->|   bar-service   |----->| Pod bar |
                                          |                    |      |                 |      |         |
                                          +--------------------+      +-----------------+      +---------+
```

### Alternative all'Ingress NGINX

Sebbene NGINX Ingress Controller sia una scelta molto popolare e stabile, esistono altre ottime opzioni che potrebbero essere più adatte a specifici casi d'uso:

*   **[Traefik](https://doc.traefik.io/traefik/providers/kubernetes-ingress/)**: Un ingress controller moderno con molte funzionalità integrate come il supporto per Let's Encrypt, dashboard di monitoraggio integrate e riconoscimento automatico delle configurazioni. Offre un'esperienza utile molto piacevole ed è particolarmente adatto per ambienti dinamici.

*   **[Istio](https://istio.io/)**: Una piattaforma di service mesh che offre funzionalità avanzate di gestione del traffico oltre alle capacità di ingress standard. Istio è particolarmente utile quando hai bisogno di gestione avanzata del traffico, osservabilità e sicurezza tra i servizi, ma ha una curva di apprendimento più ripida.

*   **[HAProxy Ingress](https://haproxy-ingress.github.io/)**: Basato sul noto bilanciatore di carico HAProxy, offre molte opzioni di configurazione avanzate e buone prestazioni.

*   **[Contour](https://projectcontour.io/)**: Un ingress controller basato su Envoy Proxy, sviluppato da VMware. È particolarmente apprezzato per la sua configurazione chiara e la buona integrazione con Kubernetes.

L'importante è che, grazie al modello dichiarativo di Kubernetes, è possibile cambiare ingress controller senza dover modificare le risorse `Ingress` esistenti (se si utilizzano funzionalità standard).

Per approfondire le varie opzioni disponibili, consulta la [pagina ufficiale di Kubernetes sugli ingress controller](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/).

---

## Implementazione su `kind`

Vediamo come implementare questa soluzione passo dopo passo su un cluster `kind` (Kubernetes in Docker).

### 1. Preparare il Cluster `kind`

La configurazione di `kind` è fondamentale per esporre correttamente i servizi. Il file `kind-lb-config.yaml` crea una mappatura di rete tra il nostro PC e il cluster.

```yaml
# kind-lb-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1beta1
networking:
  disableLoadBalancer: true
nodes:
- role: control-plane
  extraPortMappings:
  # Mappa la porta 80 del tuo PC alla porta HTTP statica di NGINX (32000)
  - containerPort: 32000
    hostPort: 80
    protocol: TCP
  # Mappa la porta 443 del tuo PC alla porta HTTPS statica di NGINX (32443)
  - containerPort: 32443
    hostPort: 443
    protocol: TCP
- role: control-plane
- role: control-plane
- role: worker
- role: worker
```
> **Spiegazione**: `extraPortMappings` istruisce Docker a inoltrare il traffico dalla porta `80` del nostro `localhost` alla porta `32000` del container che esegue il nodo del cluster. Vedremo tra poco perché usiamo proprio la porta `32000`.

Crea il cluster:
```bash
kind create cluster --name kind-lb-demo --config kind-lb-config.yaml
```

### 2. Installare l'Ingress Controller NGINX

Ora installiamo l'Ingress Controller. Usiamo un manifest `kind-ingress-deploy.yaml` che è stato appositamente corretto per garantire la stabilità in un ambiente `kind`.

```bash
kubectl apply -f kind-ingress-deploy.yaml
```
Attendi che sia pronto:
```bash
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

> #### 💡 La Teoria: La Stabilità del `NodePort` Statico
> Il file `kind-ingress-deploy.yaml` è stato modificato per usare un `Service` di tipo `NodePort` con porte **fisse**.
> Abbiamo forzato il servizio a usare `type: NodePort` e a esporsi sempre sulle porte `32000` (HTTP) e `32443` (HTTPS).
>     ```yaml
>     # Estratto da kind-ingress-deploy.yaml
>     spec:
>       type: NodePort
>       ports:
>       - nodePort: 32000 # <-- Porta FISSA
>     ```
> Questo crea una catena di rete **prevedibile e stabile**: `localhost:80` → `nodo-kind:32000` → `Pod NGINX`.

### 3. Deployare le Applicazioni Demo

Deployamo due semplici applicazioni `foo` e `bar` che useremo per testare il routing.

```bash
kubectl apply -f demo-apps.yaml
```

> #### 💡 La Teoria: `Deployment` e `Service`
> Il file `demo-apps.yaml` contiene due tipi di oggetti fondamentali:
> *   **[Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)**: Dichiara lo stato desiderato per la nostra applicazione (es. "Voglio 1 replica del container `http-echo`"). Il suo controller si assicura che il numero corretto di **[Pod](https://kubernetes.io/docs/concepts/workloads/pods/)** (le unità di lavoro che eseguono i nostri container) sia sempre attivo.
> *   **[Service](https://kubernetes.io/docs/concepts/services-networking/service/)**: Poiché i Pod sono effimeri (vengono creati e distrutti, cambiando IP), un Service fornisce un **punto di accesso stabile** e un nome DNS interno al cluster (es. `foo-service`) per un gruppo di Pod. È a questo indirizzo stabile che punterà il nostro Ingress.

Per approfondire questi concetti, consulta la documentazione ufficiale di Kubernetes su [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) e [Service](https://kubernetes.io/docs/concepts/services-networking/service/).

### 4. Configurare il DNS e le Regole di Routing

Infine, definiamo le regole di routing per l'Ingress Controller.

**a. DNS Locale**

Modifica il tuo file `/etc/hosts` (o `C:\Windows\System32\drivers\etc\hosts` su Windows) per risolvere `miodominio.local` sul tuo PC.
```
127.0.0.1   miodominio.local
```

**b. Definizione delle Regole di Ingress**

Questo file YAML (`demo-ingress.yaml`) definisce il nostro set di regole di routing.

```yaml
# demo-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: miodominio-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: "miodominio.local"
    http:
      paths:
      - path: /foo
        pathType: Prefix
        backend:
          service: { name: foo-service, port: { number: 80 } }
      - path: /bar
        pathType: Prefix
        backend:
          service: { name: bar-service, port: { number: 80 } }
```
Applica le regole:
```bash
kubectl apply -f demo-ingress.yaml
```

### 5. Sicurezza: Configurazione HTTPS con SSL/TLS

Per testare ambienti più realistici e sicuri, è possibile configurare HTTPS per le regole di ingress. Questo richiede la creazione di certificati SSL/TLS.

Per generare un certificato auto-firmato per il tuo dominio locale (es. `miodominio.local`), puoi usare il seguente comando:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt -subj "/CN=miodominio.local"
```

Successivamente, crea un Secret Kubernetes con il certificato:

```bash
kubectl create secret tls miodominio-tls --key tls.key --cert tls.crt
```

Infine, aggiungi la sezione TLS al tuo ingress:

```yaml
# demo-ingress.yaml con HTTPS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: miodominio-ingress
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - miodominio.local
    secretName: miodominio-tls  # Nome del secret creato in precedenza
  rules:
  - host: "miodominio.local"
    http:
      paths:
      - path: /foo
        pathType: Prefix
        backend:
          service: { name: foo-service, port: { number: 80 } }
      - path: /bar
        pathType: Prefix
        backend:
          service: { name: bar-service, port: { number: 80 } }
```

Ora puoi testare le connessioni HTTPS:

```bash
# Test HTTPS per il servizio FOO
curl https://miodominio.local/foo --insecure
# Risposta: Ciao, sono il servizio FOO

# Test HTTPS per il servizio BAR
curl https://miodominio.local/bar --insecure
# Risposta: Ehilà, qui parla BAR
```

> **Nota**: L'opzione `--insecure` è necessaria quando si usano certificati auto-firmati perché non sono firmati da un'autorità certificatrice riconosciuta.

Per gestire automaticamente i certificati SSL/TLS in produzione, considera l'utilizzo di `cert-manager`, che può ottenere certificati gratuiti da Let's Encrypt.

Per ulteriori informazioni sui TLS secrets in Kubernetes, consulta la [documentazione ufficiale](https://kubernetes.io/docs/concepts/configuration/secret/).

---

## Flusso Operativo e l'Astrazione di Kubernetes

### Test del Setup Iniziale

Ora, dal tuo terminale (niente più porte strane!):

```bash
# Testiamo il primo endpoint
curl http://miodominio.local/foo
# Risposta: Ciao, sono il servizio FOO

# Testiamo il secondo endpoint
curl http://miodominio.local/bar
# Risposta: Ehilà, qui parla BAR
```
Un unico punto d'ingresso che smista il traffico ai servizi corretti.

### Dove girano i Pod? (E perché non ci importa)

Se eseguiamo `kubectl get pods -o wide`, vedremo che Kubernetes (tramite il suo componente **Scheduler**) ha distribuito i Pod sui vari nodi worker. Potrebbero essere sullo stesso nodo o su nodi diversi. 

Questo è il cuore dell'astrazione di Kubernetes: grazie al `Service` che ci fornisce un indirizzo stabile, **non ci interessa dove si trovino fisicamente i Pod**. Questo segue il noto mantra della community Kubernetes **"Cattle, not Pets"** (trattare i server come bestiame, non come animali domestici): i Pod sono considerati risorse effimere e intercambiabili, non server unici e insostituibili.

### Aggiungere un Nuovo Servizio (La Magia Dichiarativa)

Per aggiungere un nuovo servizio "baz", il processo è semplice.

1.  **Deploya la nuova app** (`baz-app.yaml`, simile a `foo` e `bar`).
    ```bash
    kubectl apply -f baz-app.yaml
    ```
2.  **Aggiorna le regole di Ingress (in modo dichiarativo)**:
    Invece di usare un comando imperativo come `kubectl edit`, modifichiamo direttamente il nostro file di configurazione `demo-ingress.yaml`, che rappresenta la nostra "fonte di verità".

    Aggiungi la nuova regola per `/baz` al file:
    ```yaml
    # demo-ingress.yaml (aggiornato)
    # ... (dentro spec.rules.http.paths)
          - path: /foo
            # ...
          - path: /bar
            # ...
          # AGGIUNGI QUESTA NUOVA REGOLA:
          - path: /baz
            pathType: Prefix
            backend:
              service:
                name: baz-service
                port:
                  number: 80
    ```
    Ora, semplicemente **riapplica il file**:
    ```bash
    kubectl apply -f demo-ingress.yaml
    ```
    Kubernetes confronterà il nuovo stato desiderato con quello attuale e applicherà solo le differenze, senza interrompere il traffico esistente. Questo è l'approccio GitOps e Infrastructure as Code.
3.  **Testa immediatamente**:
    ```bash
    curl http://miodominio.local/baz
    # Risposta: Servizio BAZ in linea!
    ```
> **La Magia della "Riconciliazione"**: Non abbiamo riavviato NGINX. L'Ingress Controller ha notato il cambiamento nella risorsa `Ingress` e ha aggiornato la sua configurazione al volo. Questo è il potere del modello dichiarativo di Kubernetes.

---

## Alternativa: Routing basato su Host (Sottodomini)

Finora abbiamo usato il routing basato su *percorso* (`/foo`, `/bar`). Un'alternativa molto comune e pulita è il **routing basato su host**, dove ogni servizio risponde a un suo sottodominio dedicato (es. `foo.miodominio.local`).

La cosa fantastica del modello dichiarativo di Kubernetes è che **non è necessario distruggere e ricreare nulla** per fare questo cambio. Possiamo passare da una strategia di routing all'altra semplicemente modificando e ri-applicando i nostri file di configurazione. Il cluster si occuperà di riconciliare lo stato.

Questo approccio è spesso preferibile perché isola completamente i servizi e permette di avere percorsi (`/api`, `/v2`, etc.) indipendenti per ciascuno di essi.

Vediamo come modificare il nostro setup.

### 1. Aggiornare il DNS Locale (`/etc/hosts`)

Per prima cosa, dobbiamo dire al nostro PC dove trovare i nuovi sottodomini. Aggiorniamo il file `/etc/hosts` aggiungendo i nuovi host, facendoli puntare sempre al nostro `localhost`.

```
127.0.0.1   miodominio.local
127.0.0.1   foo.miodominio.local
127.0.0.1   bar.miodominio.local
```

### 2. Modificare le Regole di Ingress

Ora modifichiamo il nostro file `demo-ingress.yaml` per usare i nuovi host. La modifica è molto semplice: invece di avere una sola regola con più percorsi, creiamo più regole, una per ogni host.

```yaml
# demo-ingress.yaml (versione con sottodomini)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: miodominio-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: "foo.miodominio.local" # <-- Host per il servizio FOO
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: foo-service
            port:
              number: 80
  - host: "bar.miodominio.local" # <-- Host per il servizio BAR
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bar-service
            port:
              number: 80
```

Applica la nuova configurazione:
```bash
kubectl apply -f demo-ingress.yaml
```

### 3. Testare il Nuovo Setup

Ora puoi accedere ai servizi usando i loro sottodomini dedicati:

```bash
# Testiamo il primo servizio
curl http://foo.miodominio.local
# Risposta: Ciao, sono il servizio FOO

# Testiamo il secondo servizio
curl http://bar.miodominio.local
# Risposta: Ehilà, qui parla BAR
```

Con una semplice modifica alla nostra risorsa `Ingress`, abbiamo cambiato completamente la strategia di routing, dimostrando la flessibilità e la potenza di questa risorsa.

---

## Conclusioni

Abbiamo trasformato un caotico flusso di lavoro basato su `port-forward` in un ambiente di sviluppo locale pulito, stabile e professionale che rispecchia un setup di produzione.

Abbiamo visto come:
1.  Il problema principale dello sviluppo locale è l'accesso instabile e scomodo ai servizi.
2.  La soluzione è un **Ingress Controller**, che fornisce routing a Layer 7 sfruttando il modello dichiarativo di Kubernetes.
3.  L'implementazione corretta su `kind` richiede una mappazione di porte stabile tramite un **`Service` di tipo `NodePort` statico**.
4.  Grazie alle astrazioni come `Service` e `Deployment`, possiamo gestire le nostre applicazioni senza preoccuparci della loro posizione fisica nel cluster.

Con questo setup, gli script `port-forward` non sono più necessari.

Per ulteriori approfondimenti su questi concetti, ti consiglio di consultare la [documentazione ufficiale di Kubernetes](https://kubernetes.io/docs/home/).

## Troubleshooting

Durante l'utilizzo di ingress in un ambiente kind, potrebbero presentarsi alcuni problemi comuni. Ecco alcune soluzioni:

*   **Ingress non raggiungibile**: Assicurati che il servizio NGINX Ingress sia correttamente in esecuzione e che le porte 80 e 443 siano libere sul tuo sistema. Verifica con `kubectl get pods -n ingress-nginx` che i pod siano in stato `Running`.

*   **Errore di risoluzione DNS**: Verifica che l'host `miodominio.local` (o il tuo dominio personalizzato) sia correttamente configurato nel file `/etc/hosts`.

*   **Connessione rifiutata**: Controlla che il servizio backend richiesto sia effettivamente disponibile e che la regola di ingress punti al nome del servizio e alla porta corretti.

*   **Porte mappate non funzionanti**: Controlla che la configurazione di `kind` includa correttamente le mappature di porta da `hostPort` a `containerPort` come definito in `kind-lb-config.yaml`.

*   **Certificati SSL**: Se hai bisogno di testare funzionalità HTTPS, puoi generare certificati auto-firmati usando strumenti come `openssl` o utilizzare `cert-manager` per gestire i certificati in modo automatico.

## Riferimenti Esterni

Per approfondire gli argomenti trattati in questa guida, ecco alcune risorse ufficiali e documentazione di riferimento:

*   **[Documentazione ufficiale di Kubernetes - Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)**: La documentazione ufficiale di Kubernetes che spiega in dettaglio cosa sono e come funzionano le risorse Ingress.

*   **[Documentazione ufficiale di Kubernetes - Services](https://kubernetes.io/docs/concepts/services-networking/service/)**: Approfondimento sui servizi Kubernetes, inclusi i tipi NodePort e ClusterIP.

*   **[NGINX Ingress Controller - Documentazione](https://kubernetes.github.io/ingress-nginx/)**: La documentazione ufficiale del controller NGINX per Kubernetes, con tutte le opzioni di configurazione e esempi avanzati.

*   **[kind - Documentazione ufficiale](https://kind.sigs.k8s.io/)**: La documentazione ufficiale di kind (Kubernetes in Docker), con guide di installazione e configurazione avanzata.

*   **[Traefik Ingress Controller](https://doc.traefik.io/traefik/providers/kubernetes-ingress/)**: Documentazione per l'Ingress Controller Traefik, un'alternativa al controller NGINX.

*   **[Istio Service Mesh](https://istio.io/)**: Documentazione ufficiale di Istio, una piattaforma di service mesh completa con funzionalità avanzate di gestione del traffico.

*   **[cert-manager](https://cert-manager.io/)**: Strumento per gestire automaticamente i certificati SSL/TLS in Kubernetes, utile per ottenere certificati da Let's Encrypt.

*   **[Documentazione ufficiale di Kubernetes - Controllers](https://kubernetes.io/docs/concepts/architecture/controller/)**: Spiegazione approfondita del pattern dei controller, fondamentale per comprendere il funzionamento dichiarativo di Kubernetes.

### Pulizia

Quando hai finito, elimina tutto con un singolo comando:

```bash
kind delete cluster --name kind-lb-demo
```
Ricordare di rimuovere `miodominio.local` dal file `hosts`.

---

Foto di <a href="https://unsplash.com/it/@carrier_lost?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Ian Taylor</a> su <a href="https://unsplash.com/it/foto/nave-da-carico-blu-e-rossa-in-mare-durante-il-giorno-jOqJbvo1P9g?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a>
      
