---
title: "Controller Kubernetes: Come Funziona il Cuore di K8s"
seoTitle: "Controller Kubernetes: come funzionano"
date: 2026-02-12T08:00:00.000Z
description: Guida al funzionamento dei controller Kubernetes, dal reconciliation loop alla costruzione di un controller custom con controller-runtime
pillar: automatizzare
category: kubernetes
tags:
  - Kubernetes
  - Controller
  - Operator
  - Go
  - CRD
  - DevOps
lang: it
reviewed: human
series: kubernetes-fondamenti
seriesOrder: 20
reproducibility: true
summary:
  - label: "Contesto"
    value: "Ogni `kubectl apply` passa per un controller che confronta `.spec` e `.status`"
    note: "Il pattern governa Deployment, Service, Ingress e ogni risorsa applicata"
  - label: "Strumento"
    value: "Informer con cache locale e work queue con deduplicazione"
    note: "Retry con backoff esponenziale, dai 5ms fino a circa 16 minuti"
  - label: "Scelta"
    value: "Controller level-triggered: ricevono una chiave, non l'evento"
    note: "Dopo un riavvio rileggono lo stato corrente e convergono comunque"
  - label: "Risultato"
    value: "EchoConfig controller con self-healing provato su `kind`"
    note: "Deployment eliminato e ricreato, repliche aggiornate via patch della CR"
openItems:
  - "Il controller d'esempio è scritto a mano per isolare i concetti: per progetti reali l'articolo indica Kubebuilder o Operator SDK"
  - "La verifica mostrata è manuale su `kind`: il testing automatizzato dei controller non entra nell'articolo"
openNote: "Cosa l'esempio minimale lascia fuori."
mode: explanation
---

## Il Meccanismo Dietro kubectl apply

Quando si esegue `kubectl apply -f deployment.yaml`, i Pod appaiono nel cluster. Si aumentano le repliche da 3 a 5 e, pochi secondi dopo, due nuovi Pod sono in esecuzione. Si elimina un Pod per errore e Kubernetes lo ricrea autonomamente. Il meccanismo responsabile di questo comportamento è il **controller pattern**.

Il controller pattern è il meccanismo fondamentale su cui poggia l'intera piattaforma. Ogni risorsa applicata - Deployment, Service, Ingress - è gestita da un controller dedicato che osserva, confronta e agisce in un ciclo continuo. Nonostante questo, viene spesso trattato come una black box.

Questo articolo esplora la teoria dietro i controller Kubernetes, dalla loro architettura interna fino alla costruzione di un controller custom con `controller-runtime`. La [serie su Cluster API](/blog/progettare/kubernetes/01-capi-part1-intro/) introduce concetti come *reconciliation loop* e *controller pattern* - qui vengono analizzati nel dettaglio.

👉 Il codice completo dell'esempio è nel repository: [monte97/k8s-controller-demo](https://github.com/monte97/k8s-controller-demo)

---

## Stato Desiderato vs Stato Attuale

Il modello dichiarativo è il cuore di Kubernetes. Invece di dire al sistema *come* fare qualcosa (imperativo), dichiariamo *cosa* vogliamo ottenere e lasciamo che sia il sistema a convergere verso lo stato desiderato.

### Spec e Status: Il Linguaggio del Controller

Ogni risorsa Kubernetes è strutturata intorno a due campi fondamentali:

* **`.spec`** - lo **stato desiderato**: rappresenta l'intenzione dell'operatore. "Voglio 3 repliche di questo container."
* **`.status`** - lo **stato osservato**: rappresenta la realtà corrente del cluster. "Attualmente ci sono 2 repliche pronte."

Il lavoro del controller è esattamente questo: **confrontare `.spec` con `.status`** e intraprendere azioni per ridurre la distanza tra i due. Questo confronto avviene in un ciclo continuo, non in una singola esecuzione.

Vediamo un esempio concreto con un Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3          # Stato desiderato: vogliamo 3 repliche
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:stable
---
# Dopo la riconciliazione, lo status riporta:
# status:
#   replicas: 3
#   readyReplicas: 3      # Stato osservato: 3 repliche pronte
#   availableReplicas: 3
```

Il Deployment Controller osserva che `spec.replicas` è 3. Se `status.readyReplicas` è 2, crea un nuovo Pod. Se è 4 (magari per un errore), ne elimina uno. Il controller non sa *perché* c'è divergenza, sa solo come deve intervenire per ristabilire l'ordine.

```text
Reconciliation Loop

.spec (Desired)                          .status (Observed)
  replicas: 3                              replicas: 2
       │                                        │
       └──────────▶ Controller ◀────────────────┘
                    Confronta e
                    Agisce
                       │
                       ▼
              Crea 1 Pod mancante
```

---

## Anatomia di un Controller

Un controller Kubernetes non è un semplice script che gira in loop. È un componente architetturale composto da più parti, progettato per scalare e per essere resiliente. Di seguito i tre componenti principali.

Ecco la struttura ad alto livello di un controller, prima di entrare nel dettaglio di ciascun componente:

```go
// Struttura semplificata di un controller Kubernetes
func runController() {
    // 1. Informer: osserva le risorse via LIST+WATCH
    informer := cache.NewInformer(apiServer, resource, handler)

    // 2. Work Queue: riceve le chiavi degli oggetti modificati
    queue := workqueue.NewRateLimitingQueue()

    informer.AddEventHandler(func(obj) {
        key := obj.Namespace + "/" + obj.Name
        queue.Add(key)  // Deduplicazione automatica
    })

    // 3. Worker: estrae chiavi dalla coda e riconcilia
    for key := queue.Get() {
        reconcile(key)  // Idempotente: può essere chiamata N volte
    }
}
```

### Informer e Cache Locale

Il primo problema da risolvere è: come fa il controller a sapere cosa succede nel cluster? La risposta immediata sarebbe "interroga l'API Server continuamente", ma questo approccio non scala. Con centinaia di controller e migliaia di risorse, l'API Server verrebbe sommerso di richieste.

La soluzione è il meccanismo **LIST+WATCH**:

1. **LIST**: All'avvio, l'Informer esegue una singola chiamata LIST per ottenere lo stato completo di tutte le risorse che il controller gestisce.
2. **WATCH**: Dopo la LIST iniziale, apre una connessione HTTP persistente e riceve solo gli eventi incrementali (creazione, modifica, eliminazione).

Tutti i dati ricevuti vengono archiviati in una **cache locale in-memory**. Quando il controller ha bisogno di leggere una risorsa, la legge dalla cache - non dall'API Server. Questo riduce drasticamente il carico sulla componente centrale del cluster.

### Work Queue

Gli eventi ricevuti dall'Informer non vengono processati immediatamente. Vengono inseriti in una **work queue** (coda di lavoro) sotto forma di chiavi `namespace/name`. La work queue offre tre garanzie fondamentali:

* **Deduplicazione**: Se lo stesso oggetto viene modificato 10 volte in rapida successione, nella coda finisce una sola chiave. Il controller processerà lo stato *corrente*, non ogni singola modifica intermedia.
* **Rate limiting**: La coda limita il numero di elementi processati per unità di tempo, proteggendo il sistema da burst di eventi.
* **Retry con backoff esponenziale**: Se una riconciliazione fallisce, la chiave viene reinserita nella coda con un delay crescente (il default parte da 5ms e raddoppia ad ogni fallimento, fino a un massimo di ~16 minuti), evitando loop di errori frenetici.

### Reconciliation Loop

Il cuore del controller è la funzione `Reconcile()`. Un worker estrae una chiave dalla coda, legge lo stato corrente dalla cache, confronta con lo stato desiderato e intraprende le azioni necessarie. Ecco la struttura logica in pseudocodice:

```go
// Pseudocodice del Reconciliation Loop
func (r *Reconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // 1. Leggi lo stato desiderato dalla cache
    desired := cache.Get(req.NamespacedName)
    if desired == nil {
        return ctrl.Result{}, nil // La risorsa è stata eliminata
    }

    // 2. Osserva lo stato attuale del mondo
    actual := observeCurrentState(desired)

    // 3. Confronta e agisci
    if actual != desired.Spec {
        err := reconcileDifference(desired, actual)
        if err != nil {
            return ctrl.Result{}, err // Reinserisci nella coda
        }
    }

    // 4. Aggiorna lo status
    desired.Status = computeNewStatus(actual)
    return ctrl.Result{}, client.Update(ctx, desired)
}
```

Un principio fondamentale: la funzione `Reconcile` deve essere **idempotente**. Chiamarla due volte di seguito con lo stesso input deve produrre lo stesso risultato. Questo perché il controller non ha garanzie su quante volte verrà invocato per la stessa risorsa.

Il diagramma seguente mostra come i tre componenti interagiscono:

```text
API Server
  │
  │  LIST+WATCH
  ▼
Informer
├── Cache (locale)
│     │
│     │ Leggi stato
│     ▼
└── Work Queue (chiavi namespace/name)
      │
      │ Dequeue
      ▼
    Reconcile()
    1. Leggi risorsa dalla cache
    2. Confronta spec vs status
    3. Crea/Aggiorna/Elimina ──▶ API Server
    4. Aggiorna status
```

---

## Controller nella Pratica

La teoria diventa concreta quando osserviamo i controller built-in di Kubernetes. Ogni risorsa che usiamo quotidianamente è gestita da un controller dedicato che implementa esattamente il pattern descritto sopra.

### Deployment Controller

Quando modifichiamo `spec.replicas` in un Deployment, il Deployment Controller non crea direttamente i Pod. Crea (o aggiorna) un **ReplicaSet**, che a sua volta è responsabile dei Pod. Questo approccio a due livelli è ciò che permette i rolling update: il Deployment Controller gestisce la transizione tra un vecchio ReplicaSet (con la versione precedente) e un nuovo ReplicaSet (con la nuova versione), bilanciando gradualmente le repliche.

### ReplicaSet Controller

Il ReplicaSet Controller ha un compito più semplice ma altrettanto critico: garantire che il numero di Pod con determinate label corrisponda a `spec.replicas`. Se un Pod muore o viene eliminato, il controller ne crea uno nuovo. Se ce ne sono troppi, ne elimina l'eccesso. Il matching avviene tramite **label selector** - il controller non "possiede" i Pod in senso stretto, li identifica tramite le label.

### Il Pattern si Ripete

Questo schema - osserva, confronta, agisci - si ripete in ogni angolo di Kubernetes. L'[Ingress Controller](/blog/progettare/kubernetes/01-article-ingress-k8s/) osserva le risorse Ingress e riconfigura il reverse proxy. I [controller di Cluster API](/blog/progettare/kubernetes/02-capi-part2-internals/) osservano le Custom Resource che descrivono cluster e macchine, e riconciliano l'infrastruttura sottostante. Il pattern è lo stesso, cambiano solo le risorse osservate e le azioni intraprese.

---

## Estendere Kubernetes: Custom Resource Definitions

Uno dei punti di forza di Kubernetes è la sua estensibilità. Non siamo limitati alle risorse built-in: possiamo definire le nostre risorse e i nostri controller.

### Cos'è una CRD

Una **Custom Resource Definition** (CRD) è un modo per insegnare a Kubernetes un nuovo tipo di risorsa. Una volta applicata la CRD, l'API Server accetta e memorizza le nostre risorse custom esattamente come fa con Deployment o Service. Possiamo usare `kubectl get`, `kubectl describe`, `kubectl apply` - tutto funziona nativamente.

### Il Pattern Operator

Un **Operator** è la combinazione di una CRD con un controller custom che la gestisce. Il termine, coniato da CoreOS, cattura l'idea di "codificare la conoscenza operativa" in un software. Invece di avere un operatore umano che esegue procedure manuali, l'Operator automatizza il ciclo di vita di un'applicazione complessa.

Esempi noti di Operator:
* **Prometheus Operator** - gestisce istanze Prometheus dichiarativamente
* **cert-manager** - gestisce il ciclo di vita dei certificati TLS
* **Cluster API** - gestisce il ciclo di vita di interi cluster Kubernetes

Nella prossima sezione costruiremo un Operator minimale per comprendere il meccanismo dall'interno. La CRD e il controller che seguono non derivano da un esempio ufficiale: sono costruiti da zero per isolare i concetti fondamentali senza la complessità di un progetto scaffoldato con [Kubebuilder](https://book.kubebuilder.io/). Per progetti reali, Kubebuilder o [Operator SDK](https://sdk.operatorframework.io/) forniscono struttura, testing e code generation.

Ecco la CRD che useremo - un `EchoConfig` che descrive un semplice servizio echo:

```yaml
# crd-echoconfig.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: echoconfigs.demo.example.com
spec:
  group: demo.example.com
  names:
    kind: EchoConfig
    listKind: EchoConfigList
    plural: echoconfigs
    singular: echoconfig
  scope: Namespaced
  versions:
  - name: v1alpha1
    served: true
    storage: true
    subresources:
      status: {}
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            required: ["message", "replicas"]
            properties:
              message:
                type: string
              replicas:
                type: integer
                minimum: 1
                maximum: 10
```

---

## Costruiamo un Controller: Da Zero alla Reconciliation

Questa sezione mostra la costruzione di un controller che osserva risorse `EchoConfig` e, per ognuna, crea e gestisce un Deployment Kubernetes.

### Il Progetto: EchoConfig Controller

Il nostro controller avrà un comportamento semplice ma significativo:

1. **Watch**: osserva le risorse `EchoConfig` nel cluster
2. **Reconcile**: per ogni `EchoConfig`, crea un Deployment con un container echo-server configurato con il `message` e il numero di `replicas` specificati
3. **Self-healing**: se qualcuno elimina o modifica il Deployment gestito, il controller lo ricrea o ripristina

Ecco un esempio della Custom Resource che il nostro controller gestirà:

```yaml
# echo-sample.yaml
apiVersion: demo.example.com/v1alpha1
kind: EchoConfig
metadata:
  name: hello-echo
  namespace: default
spec:
  message: "Ciao dal controller custom!"
  replicas: 2
```

### Setup con controller-runtime

La libreria [controller-runtime](https://github.com/kubernetes-sigs/controller-runtime) è il framework standard per costruire controller Kubernetes in Go. È lo stesso framework usato da Kubebuilder e Operator SDK.

Il punto di ingresso è il `main.go`, dove creiamo un **Manager** e registriamo il nostro controller:

```go
// main.go
package main

import (
    "os"

    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/log/zap"
)

func main() {
    ctrl.SetLogger(zap.New(zap.UseDevMode(true)))
    log := ctrl.Log.WithName("setup")

    // Il Manager gestisce cache condivisa, client e lifecycle dei controller
    mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{})
    if err != nil {
        log.Error(err, "impossibile creare il manager")
        os.Exit(1)
    }

    // Registra il controller EchoConfig
    if err := (&EchoConfigReconciler{
        Client: mgr.GetClient(),
        Scheme: mgr.GetScheme(),
    }).SetupWithManager(mgr); err != nil {
        log.Error(err, "impossibile creare il controller")
        os.Exit(1)
    }

    // Avvia il Manager (blocca fino a shutdown)
    if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
        log.Error(err, "errore durante l'esecuzione del manager")
        os.Exit(1)
    }
}
```

### La Funzione Reconcile

Ecco il cuore del nostro controller - la funzione `Reconcile` che implementa la logica di riconciliazione:

```go
// reconciler.go
// Import: context, appsv1, corev1, metav1, ctrl, client, ptr, demov1alpha1
func (r *EchoConfigReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := ctrl.LoggerFrom(ctx)

    // 1. Leggi la risorsa EchoConfig dalla cache
    var echoConfig demov1alpha1.EchoConfig
    if err := r.Get(ctx, req.NamespacedName, &echoConfig); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // 2. Prepara l'oggetto Deployment con solo Name e Namespace
    desired := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      echoConfig.Name + "-deployment",
            Namespace: echoConfig.Namespace,
        },
    }

    // 3. Crea o aggiorna il Deployment - tutti i campi vanno nella mutate function
    result, err := ctrl.CreateOrUpdate(ctx, r.Client, desired, func() error {
        // Imposta l'owner reference (serve sia in create che in update)
        if err := ctrl.SetControllerReference(&echoConfig, desired, r.Scheme); err != nil {
            return err
        }
        // Selector è immutabile dopo la creazione, ma va impostato al primo create
        desired.Spec.Selector = &metav1.LabelSelector{
            MatchLabels: map[string]string{"app": echoConfig.Name},
        }
        desired.Spec.Replicas = ptr.To(int32(echoConfig.Spec.Replicas))
        desired.Spec.Template = corev1.PodTemplateSpec{
            ObjectMeta: metav1.ObjectMeta{
                Labels: map[string]string{"app": echoConfig.Name},
            },
            Spec: corev1.PodSpec{
                Containers: []corev1.Container{{
                    Name:  "echo",
                    Image: "hashicorp/http-echo",
                    Args:  []string{"-text=" + echoConfig.Spec.Message},
                }},
            },
        }
        return nil
    })

    if err != nil {
        return ctrl.Result{}, err
    }

    log.Info("Deployment riconciliato", "operazione", result)
    return ctrl.Result{}, nil
}
```

Ogni passaggio è intenzionale: leggiamo lo stato desiderato (la CR), prepariamo un oggetto Deployment con solo `Name` e `Namespace`, e deleghiamo alla **mutate function** di `CreateOrUpdate` l'impostazione di *tutti* i campi desiderati. Questo pattern è fondamentale: sul path di update, `CreateOrUpdate` sovrascrive l'oggetto con quello esistente nel cluster prima di invocare la mutate function. Se i campi fossero impostati fuori dalla mutate function, verrebbero persi. L'owner reference, impostata dentro la stessa funzione, collega il Deployment alla CR in modo che Kubernetes sappia chi "possiede" cosa.

### Registrare il Controller

L'ultimo pezzo è dire al framework *cosa* osservare. Il metodo `SetupWithManager` definisce le sorgenti di eventi:

```go
// setup.go
// Import: ctrl, appsv1, demov1alpha1
func (r *EchoConfigReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&demov1alpha1.EchoConfig{}).  // Watch primario: le nostre CR
        Owns(&appsv1.Deployment{}).       // Watch secondario: i Deployment che creiamo
        Complete(r)
}
```

* **`For()`** - registra il watch primario. Ogni modifica a un `EchoConfig` scatena una riconciliazione.
* **`Owns()`** - registra un watch secondario. Se un Deployment *posseduto* dal nostro controller viene modificato o eliminato, il framework risale all'owner (`EchoConfig`) e scatena una riconciliazione. Questo è il meccanismo che abilita il **self-healing**.

### Test su un Cluster kind

Vediamo il controller in azione su un cluster locale [kind](https://kind.sigs.k8s.io/):

```bash
# Crea un cluster kind
kind create cluster --name controller-demo

# Applica la CRD
kubectl apply -f crd-echoconfig.yaml

# Avvia il controller (in un terminale separato)
go run .

# Crea una risorsa EchoConfig
kubectl apply -f echo-sample.yaml
```

Verifichiamo che il Deployment sia stato creato:

```bash
# Controlla il Deployment generato dal controller
kubectl get deployments

# Output atteso:
# NAME                       READY   UP-TO-DATE   AVAILABLE
# hello-echo-deployment      2/2     2            2
```

Testiamo il self-healing eliminando il Deployment:

```bash
# Elimina il Deployment
kubectl delete deployment hello-echo-deployment

# Attendi qualche secondo e verifica
kubectl get deployments

# Output: il Deployment è stato ricreato dal controller!
# NAME                       READY   UP-TO-DATE   AVAILABLE
# hello-echo-deployment      2/2     2            2
```

Testiamo l'aggiornamento modificando la CR:

```bash
# Aggiorna il messaggio e le repliche
kubectl patch echoconfig hello-echo --type merge \
  -p '{"spec":{"message":"Messaggio aggiornato!","replicas":3}}'

# Verifica
kubectl get deployments

# Output: il Deployment ora ha 3 repliche
# NAME                       READY   UP-TO-DATE   AVAILABLE
# hello-echo-deployment      3/3     3            3
```

---

## Approfondimenti

Tre concetti architetturali meritano un approfondimento aggiuntivo.

### Level-Triggered vs Edge-Triggered

Una distinzione fondamentale nei sistemi di controllo: i controller Kubernetes sono **level-triggered**, non edge-triggered. Questo significa che la funzione `Reconcile` non riceve l'evento che ha causato l'invocazione ("il campo replicas è stato cambiato da 2 a 3"). Riceve solo una **chiave** (`namespace/name`) e deve determinare *da sola* qual è lo stato corrente e cosa fare.

Perché questa scelta? Perché è **più resiliente**. Se il controller si riavvia e perde tutti gli eventi in coda, non importa: alla prossima riconciliazione leggerà lo stato corrente e convergerà. Non può "perdere" un evento critico, perché non dipende dagli eventi - dipende dallo stato.

### Owner References e Garbage Collection

Quando il nostro controller crea un Deployment, imposta un'**owner reference** che punta alla risorsa `EchoConfig` genitore. Questo ha due effetti:

1. **Garbage collection**: quando l'`EchoConfig` viene eliminata, Kubernetes elimina automaticamente tutti gli oggetti "posseduti" (il Deployment, e di conseguenza i ReplicaSet e i Pod). Non serve scrivere logica di cleanup.
2. **Watch secondario**: grazie all'owner reference, il framework `controller-runtime` è in grado di risalire dal Deployment modificato al suo owner e triggerare la riconciliazione corretta.

Questa catena di ownership è la stessa che lega Deployment → ReplicaSet → Pod nel sistema built-in di Kubernetes.

### Idempotenza

Se c'è un solo principio da ricordare nella scrittura di controller, è questo: **la funzione Reconcile deve essere idempotente**. Deve poter essere chiamata 100 volte di seguito senza effetti collaterali indesiderati. Se il Deployment esiste già con la configurazione corretta, `Reconcile` non deve fare nulla. Se esiste ma con configurazione errata, deve aggiornarlo. Se non esiste, deve crearlo.

Questo principio deriva dalla natura stessa della work queue: non c'è garanzia su quante volte `Reconcile` verrà invocata per una data risorsa. La deduplicazione riduce le invocazioni ridondanti, ma non le elimina del tutto. Un controller idempotente è un controller affidabile.

---

## Conclusioni

L'articolo ha coperto il funzionamento interno dei controller Kubernetes:

1. Il **modello dichiarativo** di Kubernetes si basa sul confronto continuo tra stato desiderato (`.spec`) e stato osservato (`.status`).
2. L'architettura **Informer + Work Queue + Reconcile** garantisce efficienza, resilienza e scalabilità.
3. Le **CRD e il pattern Operator** permettono di estendere Kubernetes con la stessa logica dei controller built-in.
4. La costruzione di un controller custom con **controller-runtime** è accessibile e segue pattern ben definiti.

Ogni `kubectl apply` attiva esattamente questo meccanismo: un controller confronta l'intent dichiarato con la realtà del cluster e lavora per colmare la distanza.

Il codice completo dell'EchoConfig Controller è disponibile nel repository:
👉 [monte97/k8s-controller-demo](https://github.com/monte97/k8s-controller-demo)

---

## Risorse Utili

* **[Controller Kubernetes - Documentazione Ufficiale](https://kubernetes.io/docs/concepts/architecture/controller/)**: La pagina ufficiale che descrive il ruolo e il funzionamento dei controller nell'architettura Kubernetes.

* **[The Kubebuilder Book](https://book.kubebuilder.io/)**: La guida completa per costruire Operator Kubernetes usando Kubebuilder, lo scaffolding ufficiale basato su controller-runtime.

* **[controller-runtime - Repository GitHub](https://github.com/kubernetes-sigs/controller-runtime)**: Il framework Go utilizzato in questo articolo. Include esempi, godoc e guide alla migrazione.

* **[Custom Resource Definitions - Documentazione Ufficiale](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)**: Guida completa alle CRD, dalla definizione dello schema alla validazione.

* **[CAPI Parte 1: Dal Chaos all'Automazione](/blog/progettare/kubernetes/01-capi-part1-intro/)**: Il primo articolo della serie su Cluster API, che utilizza estensivamente il controller pattern.

* **[CAPI Parte 2: Anatomia di Cluster API](/blog/progettare/kubernetes/02-capi-part2-internals/)**: Approfondimento sull'architettura interna di CAPI e i suoi controller.

* **[Da port-forward a Ingress](/blog/progettare/kubernetes/01-article-ingress-k8s/)**: Come funziona l'Ingress Controller, un altro esempio pratico del pattern descritto in questo articolo.
