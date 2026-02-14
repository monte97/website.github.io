# Verifica Tecnica

**Scope:** `content/posts/kubernetes/fondamenti/k8s-controller/index.md`
**Data revisione:** 2026-02-14
**Parole:** 2828

---

## Tabella dei risultati

| # | Claim/Config | Esito | Dettaglio | Riga |
|---|-------------|-------|-----------|------|
| 1 | Il modello dichiarativo di Kubernetes si basa su `.spec` (stato desiderato) e `.status` (stato osservato) | CONFERMATO | Corretto. La documentazione ufficiale Kubernetes descrive esattamente questo pattern. [Fonte: Kubernetes docs - Controllers](https://kubernetes.io/docs/concepts/architecture/controller/) | 31-36 |
| 2 | Il Deployment Controller crea/aggiorna ReplicaSet, non Pod direttamente | CONFERMATO | Corretto. Il Deployment Controller gestisce ReplicaSet, che a loro volta gestiscono i Pod. [Fonte: Kubernetes docs - Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) | 170 |
| 3 | WATCH usa "HTTP streaming via chunked transfer encoding" | BAD PRACTICE | Impreciso. Il meccanismo WATCH usa chunked transfer encoding solo su HTTP/1.1. Su HTTP/2 (usato di default dai cluster moderni) il chunked TE non e' supportato: HTTP/2 usa i propri meccanismi di framing. Dire genericamente "chunked transfer encoding" e' una semplificazione che puo' confondere. Meglio dire "connessione HTTP persistente (chunked TE su HTTP/1.1, framing nativo su HTTP/2)". [Fonte: Wikipedia - Chunked transfer encoding](https://en.wikipedia.org/wiki/Chunked_transfer_encoding), [Fonte: K8s issue #50857](https://github.com/kubernetes/kubernetes/issues/50857) | 95 |
| 4 | Retry con backoff esponenziale: "default parte da 5ms e raddoppia ad ogni fallimento, fino a un massimo di ~16 minuti" | CONFERMATO | Corretto. Il `DefaultControllerRateLimiter` di client-go usa `ItemExponentialFailureRateLimiter` con base delay 5ms e max delay 1000s (~16.67 minuti). [Fonte: Daniel Mangum - Rate Limiting in controller-runtime](https://danielmangum.com/posts/controller-runtime-client-go-rate-limiting/), [Fonte: client-go source](https://github.com/kubernetes/client-go/blob/master/util/workqueue/default_rate_limiters.go) | 105 |
| 5 | Work Queue - deduplicazione: "nella coda finisce una sola chiave" | CONFERMATO | Corretto. La work queue di client-go deduplica le chiavi: se una chiave e' gia' in coda, non viene aggiunta una seconda volta. [Fonte: client-go workqueue](https://github.com/kubernetes/client-go/blob/master/util/workqueue/default_rate_limiters.go) | 103 |
| 6 | I controller Kubernetes sono "level-triggered", non edge-triggered | CONFERMATO | Corretto. Questo e' un principio di design fondamentale ben documentato. La funzione Reconcile riceve solo la chiave (namespace/name), non l'evento specifico. [Fonte: Kubebuilder Book](https://book-v1.book.kubebuilder.io/basics/what_is_a_controller.html), [Fonte: HackerNoon - Level Triggering](https://hackernoon.com/level-triggering-and-reconciliation-in-kubernetes-1f17fe30333d) | 452-454 |
| 7 | Il termine Operator e' stato "coniato da CoreOS" | CONFERMATO | Corretto. CoreOS ha introdotto il concetto di Operator nel 2016. [Fonte: TechCrunch - CoreOS introduces Operators](https://techcrunch.com/2016/11/03/coreos-introduces-operators-to-streamline-kubernetes-container-management/), [Fonte: Kubernetes docs - Operator pattern](https://kubernetes.io/docs/concepts/extend-kubernetes/operator/) | 192 |
| 8 | CRD YAML: `apiextensions.k8s.io/v1`, struttura schema | CONFERMATO | La sintassi YAML della CRD e' corretta. `apiextensions.k8s.io/v1` e' la versione stabile e attuale. Il nome `echoconfigs.demo.example.com` segue correttamente la convenzione `<plural>.<group>`. Lo schema openAPIV3Schema e' sintatticamente valido. | 203-234 |
| 9 | CRD manca campo `required` per le proprieta' `spec` | BAD PRACTICE | La CRD non dichiara quali campi di `spec` sono obbligatori. Best practice: aggiungere `required: ["message", "replicas"]` sotto `spec.properties` per validazione server-side. Senza `required`, un utente puo' creare un EchoConfig senza `message` o `replicas`, causando errori a runtime. [Fonte: Kubebuilder Book - CRD Validation](https://book.kubebuilder.io/reference/markers/crd-validation) | 225-233 |
| 10 | CRD manca subresource `status` | BAD PRACTICE | La CRD non abilita il subresource `/status`. Best practice consolidata: abilitare `subresources: { status: {} }` nella versione della CRD per separare gli update di spec e status, evitare conflitti e migliorare la sicurezza RBAC. [Fonte: Kubebuilder Book - Status Subresource](https://book-v1.book.kubebuilder.io/basics/status_subresource.html) | 217-234 |
| 11 | `controller-runtime`: `ctrl.Options{}` vuoto nel Manager | BAD PRACTICE | Passare `ctrl.Options{}` vuoto funziona ma non abilita leader election. In produzione, un controller senza leader election puo' causare conflitti se eseguito in piu' repliche. L'articolo non menziona questa limitazione. Poiche' si tratta di un esempio didattico, e' accettabile ma andrebbe segnalato al lettore. [Fonte: Kubebuilder Book - FAQ](https://book.kubebuilder.io/faq) | 286 |
| 12 | Pseudocodice Reconcile: `client.Update(ctx, desired)` nello return | CONFERMATO (con nota) | Il pattern e' concettualmente corretto come pseudocodice. Tuttavia, nella pratica, l'update dello status dovrebbe usare `r.Status().Update()` se il subresource status e' abilitato. L'articolo lo etichetta correttamente come "pseudocodice", quindi non e' un errore. | 133 |
| 13 | `ctrl.CreateOrUpdate` - spiegazione del comportamento | CONFERMATO | La spiegazione e' corretta: `CreateOrUpdate` fa GET dell'oggetto, lo sovrascrive con quello esistente nel cluster prima di invocare la mutate function, poi crea o aggiorna. La documentazione ufficiale conferma questo comportamento: "Values other than Name and Namespace that existed on obj may be overwritten". [Fonte: pkg.go.dev - controllerutil](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller/controllerutil) | 333-367 |
| 14 | `ctrl.CreateOrUpdate` - known issue: update anche senza cambiamenti | OUTDATED | `CreateOrUpdate` ha un problema noto (issue #3191, aprile 2025): esegue sempre una chiamata UPDATE all'API server anche quando non ci sono modifiche effettive. Questo genera traffico non necessario e puo' triggerare webhook. L'alternativa `CreateOrPatch` o un controllo manuale di diff pre-update sono preferibili per controller production-grade. [Fonte: GitHub Issue #3191](https://github.com/kubernetes-sigs/controller-runtime/issues/3191) | 333 |
| 15 | `ptr.To(int32(echoConfig.Spec.Replicas))` | CONFERMATO | Uso corretto della funzione `ptr.To` dal package `k8s.io/utils/ptr`, che sostituisce il deprecato `k8s.io/utils/pointer`. [Fonte: pkg.go.dev - k8s.io/utils/ptr](https://pkg.go.dev/k8s.io/utils/ptr) | 342 |
| 16 | Immagine `hashicorp/http-echo` con flag `-text=` | CONFERMATO | L'immagine `hashicorp/http-echo` esiste, e' mantenuta (ultima release v1.0.0, ottobre 2023), e il flag `-text` e' corretto. [Fonte: GitHub - hashicorp/http-echo](https://github.com/hashicorp/http-echo) | 350-351 |
| 17 | `SetupWithManager` con `For()` e `Owns()` | CONFERMATO | Pattern corretto e idiomatico. `For()` registra il watch primario, `Owns()` registra il watch secondario con risoluzione automatica dell'owner. [Fonte: pkg.go.dev - controller-runtime](https://pkg.go.dev/sigs.k8s.io/controller-runtime), [Fonte: Kubebuilder Book](https://book.kubebuilder.io/) | 376-380 |
| 18 | Owner reference: "Kubernetes elimina automaticamente tutti gli oggetti posseduti" | CONFERMATO (con nota) | Corretto nel caso standard (`kubectl delete` usa background cascading deletion di default). L'articolo semplifica leggermente: il comportamento dipende dalla propagation policy, ma il default e' effettivamente cascade delete. [Fonte: Kubernetes docs - Garbage Collection](https://kubernetes.io/docs/concepts/architecture/garbage-collection/) | 458-460 |
| 19 | Catena ownership Deployment -> ReplicaSet -> Pod | CONFERMATO | Corretto. Questa e' la catena di ownership standard nel sistema built-in di Kubernetes. [Fonte: Kubernetes docs - ReplicaSet](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/) | 463 |
| 20 | ReplicaSet Controller: matching tramite label selector | CONFERMATO | Corretto. Il ReplicaSet identifica i Pod da gestire tramite il campo `.spec.selector`, non tramite "possesso" diretto. [Fonte: Kubernetes docs - ReplicaSet](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/) | 174 |
| 21 | `zap.New(zap.UseDevMode(true))` per il logger | CONFERMATO | Sintassi corretta per controller-runtime. `UseDevMode` configura il logger in modalita' development. Non risulta deprecato nelle versioni attuali. [Fonte: pkg.go.dev - controller-runtime/pkg/log/zap](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/log/zap) | 282 |
| 22 | Deployment YAML: `image: nginx:stable` | CONFERMATO | Il tag `nginx:stable` e' un tag valido e mantenuto dall'immagine ufficiale nginx su Docker Hub. | 57 |
| 23 | Code Go: import mancanti nei blocchi reconciler.go e setup.go | BAD PRACTICE | I blocchi di codice Go di `reconciler.go` e `setup.go` non mostrano gli import necessari (`context`, `appsv1`, `corev1`, `metav1`, `client`, `demov1alpha1`, `ptr`). Il blocco `main.go` mostra correttamente gli import. Per un articolo didattico, il lettore potrebbe avere difficolta' a far compilare il codice senza conoscere i package. Suggerimento: aggiungere almeno un commento con la lista degli import o un link al repository completo. | 313-365, 374-380 |
| 24 | `Selector` e' immutabile ma viene impostato nella mutate function | BAD PRACTICE | Il commento nel codice dice "Selector e' immutabile dopo la creazione, ma va impostato al primo create". Tuttavia, impostarlo ad ogni riconciliazione (anche in update) non causa errori solo se il valore non cambia. Se cambiasse, l'API server rifiuterebbe l'update. Il pattern e' funzionale ma fragile: una best practice piu' robusta sarebbe impostare il selector condizionalmente solo alla creazione. | 339-341 |
| 25 | `kubectl patch echoconfig` senza specificare l'API group | BAD PRACTICE | Il comando `kubectl patch echoconfig hello-echo` funziona solo se non ci sono conflitti di naming con altre risorse. Best practice: specificare il gruppo completo `echoconfigs.demo.example.com` o assicurarsi che la short name sia unica. Per un esempio didattico e' accettabile, ma in un cluster reale con molti CRD potrebbe essere ambiguo. | 433 |

---

## Punteggio correttezza: 8/10

L'articolo e' tecnicamente solido nella descrizione dell'architettura dei controller Kubernetes. I claim principali sono corretti e ben referenziati. Le deduzioni derivano da imprecisioni minori (HTTP streaming), dalla mancanza di best practice nella CRD (required fields, status subresource), e dalla mancata menzione di limitazioni note di `CreateOrUpdate`.

---

## Priorita' correzioni

### P0 (bloccanti)

Nessuna. Non ci sono errori fattuali che potrebbero portare il lettore a implementare qualcosa di fondamentalmente sbagliato.

### P1 (importanti)

1. **Riga 95 - WATCH HTTP streaming** (issue #3): Correggere la descrizione del meccanismo WATCH. Sostituire "HTTP streaming via chunked transfer encoding" con una formulazione piu' precisa come "connessione HTTP persistente (chunked transfer encoding su HTTP/1.1, framing nativo su HTTP/2)".

2. **Righe 225-234 - CRD senza `required` fields** (issue #9): Aggiungere `required: ["message", "replicas"]` nella CRD per evitare che risorse malformate vengano accettate dall'API server. Questo e' particolarmente importante in un articolo didattico dove il lettore seguira' l'esempio alla lettera.

3. **Righe 217-234 - CRD senza subresource status** (issue #10): Aggiungere `subresources: { status: {} }` nella CRD. Anche se il controller d'esempio non aggiorna lo status, includerlo insegna la best practice corretta e prepara il lettore per controller reali.

4. **Righe 313-365 - Import mancanti** (issue #23): Aggiungere almeno un commento che elenchi gli import necessari o fornire un link a un repository completo. Senza questi, il codice non compila e il lettore deve indovinare i package.

### P2 (nice to have)

1. **Riga 286 - `ctrl.Options{}` vuoto** (issue #11): Aggiungere un commento nel codice o nel testo che menzioni l'assenza di leader election e le sue implicazioni per ambienti multi-replica.

2. **Riga 333 - `CreateOrUpdate` known issue** (issue #14): Menzionare brevemente che `CreateOrUpdate` esegue sempre un UPDATE anche senza cambiamenti effettivi (issue #3191), e che per controller production-grade si preferiscono approcci basati su patch o diff manuale.

3. **Riga 339 - Selector immutabile nella mutate function** (issue #24): Aggiungere un commento o una nota che spieghi perche' impostare il selector ad ogni riconciliazione funziona solo se il valore non cambia.

4. **Riga 433 - `kubectl patch` senza API group** (issue #25): Considerare l'uso della forma completa `echoconfigs.demo.example.com` per evitare ambiguita'.

---

## Fonti principali utilizzate

* [Kubernetes docs - Controllers](https://kubernetes.io/docs/concepts/architecture/controller/)
* [Kubernetes docs - Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
* [Kubernetes docs - Garbage Collection](https://kubernetes.io/docs/concepts/architecture/garbage-collection/)
* [Kubernetes docs - Custom Resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)
* [controller-runtime pkg.go.dev](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/controller/controllerutil)
* [The Kubebuilder Book](https://book.kubebuilder.io/)
* [Daniel Mangum - Rate Limiting in controller-runtime and client-go](https://danielmangum.com/posts/controller-runtime-client-go-rate-limiting/)
* [GitHub - hashicorp/http-echo](https://github.com/hashicorp/http-echo)
* [client-go workqueue source](https://github.com/kubernetes/client-go/blob/master/util/workqueue/default_rate_limiters.go)
* [controller-runtime Issue #3191](https://github.com/kubernetes-sigs/controller-runtime/issues/3191)
