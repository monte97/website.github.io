---
title: "Kubernetes Controllers: How the Heart of K8s Works"
date: 2026-02-12T08:00:00.000Z
description: A guide to how Kubernetes controllers work, from the reconciliation loop to building a custom controller with controller-runtime
pillar: automatizzare
category: kubernetes
tags:
  - Kubernetes
  - Controller
  - Operator
  - Go
  - CRD
  - DevOps
lang: en
reviewed: machine
series: kubernetes-fondamenti
seriesOrder: 20
figures:
  - kind: flow
    at: anatomy-of-a-controller
    label: "The three pieces of a controller"
    caption: "None of the three talks to the API server on every pass: that is what makes the loop sustainable across thousands of objects"
    nodes:
      - kind: "Informer"
        name: "Watches, and remembers"
        desc: "Opens a watch on the API server and keeps a local cache up to date. The controller's reads never touch the network."
        edge: "the object changed"
      - kind: "Work queue"
        name: "Accumulates and deduplicates"
        desc: "The keys of the objects to reconcile go into the queue. Ten changes to the same object become a single reconciliation."
        edge: "one key at a time"
      - kind: "Reconcile"
        name: "Compares and acts"
        desc: "Reads spec, reads status, and takes one step towards the desired state. It has to be idempotent, because it will be called again."
        key: true
        edge: "writes the status"
      - kind: "API server"
        name: "The single source of truth"
        desc: "The write produces a new event, which the informer sees: the loop has no end, it has an equilibrium point."
---

## The Mechanism Behind kubectl apply

When you run `kubectl apply -f deployment.yaml`, Pods appear in the cluster. You scale replicas from 3 to 5 and, a few seconds later, two new Pods are running. You accidentally delete a Pod and Kubernetes recreates it on its own. The mechanism responsible for this behavior is the **controller pattern**.

The controller pattern is the fundamental mechanism on which the entire platform rests. Every resource you apply — Deployment, Service, Ingress — is managed by a dedicated controller that observes, compares, and acts in a continuous loop. Despite this, it is often treated as a black box.

This article explores the theory behind Kubernetes controllers, from their internal architecture to building a custom controller with `controller-runtime`. The [Cluster API series](/en/blog/progettare/kubernetes/01-capi-part1-intro/) introduces concepts like *reconciliation loop* and *controller pattern* — here they are examined in depth.

The complete code for the example is in the repository: [monte97/k8s-controller-demo](https://github.com/monte97/k8s-controller-demo)

---

## Desired State vs Current State

The declarative model is the heart of Kubernetes. Instead of telling the system *how* to do something (imperative), you declare *what* you want to achieve and let the system converge toward the desired state.

### Spec and Status: The Controller's Language

Every Kubernetes resource is structured around two fundamental fields:

* **`.spec`** — the **desired state**: represents the operator's intent. "I want 3 replicas of this container."
* **`.status`** — the **observed state**: represents the current reality of the cluster. "Currently 2 replicas are ready."

The controller's job is exactly this: **compare `.spec` with `.status`** and take actions to reduce the distance between the two. This comparison happens in a continuous loop, not in a single execution.

A concrete example with a Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3          # Desired state: we want 3 replicas
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
# After reconciliation, status reports:
# status:
#   replicas: 3
#   readyReplicas: 3      # Observed state: 3 replicas ready
#   availableReplicas: 3
```

The Deployment Controller observes that `spec.replicas` is 3. If `status.readyReplicas` is 2, it creates a new Pod. If it is 4 (perhaps due to an error), it deletes one. The controller does not know *why* there is a divergence — it only knows how to intervene to restore the desired state.

```text
Reconciliation Loop

.spec (Desired)                          .status (Observed)
  replicas: 3                              replicas: 2
       |                                        |
       +-----------> Controller <---------------+
                    Compares and
                    Acts
                       |
                       v
              Creates 1 missing Pod
```

---

## Anatomy of a Controller

A Kubernetes controller is not a simple script running in a loop. It is an architectural component composed of multiple parts, designed to scale and be resilient. The three main components follow.

Here is the high-level structure of a controller, before diving into each component:

```go
// Simplified structure of a Kubernetes controller
func runController() {
    // 1. Informer: observes resources via LIST+WATCH
    informer := cache.NewInformer(apiServer, resource, handler)

    // 2. Work Queue: receives keys of modified objects
    queue := workqueue.NewRateLimitingQueue()

    informer.AddEventHandler(func(obj) {
        key := obj.Namespace + "/" + obj.Name
        queue.Add(key)  // Automatic deduplication
    })

    // 3. Worker: dequeues keys and reconciles
    for key := queue.Get() {
        reconcile(key)  // Idempotent: can be called N times
    }
}
```

### Informer and Local Cache

The first problem to solve: how does the controller know what is happening in the cluster? The obvious answer would be "query the API Server continuously," but that approach does not scale. With hundreds of controllers and thousands of resources, the API Server would be overwhelmed with requests.

The solution is the **LIST+WATCH** mechanism:

1. **LIST**: At startup, the Informer performs a single LIST call to get the full state of all resources the controller manages.
2. **WATCH**: After the initial LIST, it opens a persistent HTTP connection and receives only incremental events (creation, modification, deletion).

All received data is stored in a **local in-memory cache**. When the controller needs to read a resource, it reads from the cache — not from the API Server. This drastically reduces the load on the cluster's central component.

### Work Queue

Events received from the Informer are not processed immediately. They are inserted into a **work queue** as `namespace/name` keys. The work queue provides three fundamental guarantees:

* **Deduplication**: if the same object is modified 10 times in rapid succession, only one key ends up in the queue. The controller will process the *current* state, not each individual intermediate change.
* **Rate limiting**: the queue limits the number of items processed per unit of time, protecting the system from event bursts.
* **Retry with exponential backoff**: if a reconciliation fails, the key is re-inserted into the queue with increasing delay (the default starts at 5ms and doubles with each failure, up to a maximum of ~16 minutes), preventing frantic error loops.

### Reconciliation Loop

The heart of the controller is the `Reconcile()` function. A worker dequeues a key, reads the current state from the cache, compares it with the desired state, and takes the necessary actions. Here is the logical structure in pseudocode:

```go
// Pseudocode of the Reconciliation Loop
func (r *Reconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // 1. Read desired state from cache
    desired := cache.Get(req.NamespacedName)
    if desired == nil {
        return ctrl.Result{}, nil // Resource has been deleted
    }

    // 2. Observe the current state of the world
    actual := observeCurrentState(desired)

    // 3. Compare and act
    if actual != desired.Spec {
        err := reconcileDifference(desired, actual)
        if err != nil {
            return ctrl.Result{}, err // Re-enqueue
        }
    }

    // 4. Update status
    desired.Status = computeNewStatus(actual)
    return ctrl.Result{}, client.Update(ctx, desired)
}
```

A fundamental principle: the `Reconcile` function must be **idempotent**. Calling it twice in a row with the same input must produce the same result. This is because the controller has no guarantees about how many times it will be invoked for the same resource.

The following diagram shows how the three components interact:

```text
API Server
  |
  |  LIST+WATCH
  v
Informer
+-- Cache (local)
|     |
|     | Read state
|     v
+-- Work Queue (namespace/name keys)
      |
      | Dequeue
      v
    Reconcile()
    1. Read resource from cache
    2. Compare spec vs status
    3. Create/Update/Delete --> API Server
    4. Update status
```

---

## Controllers in Practice

Theory becomes concrete when we observe Kubernetes's built-in controllers. Every resource we use daily is managed by a dedicated controller that implements exactly the pattern described above.

### Deployment Controller

When you modify `spec.replicas` in a Deployment, the Deployment Controller does not create Pods directly. It creates (or updates) a **ReplicaSet**, which in turn is responsible for the Pods. This two-level approach is what enables rolling updates: the Deployment Controller manages the transition between an old ReplicaSet (with the previous version) and a new ReplicaSet (with the new version), gradually shifting replicas.

### ReplicaSet Controller

The ReplicaSet Controller has a simpler but equally critical task: ensure that the number of Pods matching certain labels equals `spec.replicas`. If a Pod dies or is deleted, the controller creates a new one. If there are too many, it deletes the excess. Matching happens via **label selectors** — the controller does not "own" Pods in a strict sense, it identifies them by labels.

### The Pattern Repeats

This schema — observe, compare, act — repeats in every corner of Kubernetes. The [Ingress Controller](/en/blog/progettare/kubernetes/01-article-ingress-k8s/) observes Ingress resources and reconfigures the reverse proxy. [Cluster API controllers](/en/blog/progettare/kubernetes/02-capi-part2-internals/) observe Custom Resources that describe clusters and machines, and reconcile the underlying infrastructure. The pattern is the same; only the observed resources and the actions taken differ.

---

## Extending Kubernetes: Custom Resource Definitions

One of Kubernetes's strengths is its extensibility. We are not limited to built-in resources: we can define our own resources and our own controllers.

### What Is a CRD

A **Custom Resource Definition** (CRD) is a way to teach Kubernetes a new resource type. Once the CRD is applied, the API Server accepts and stores our custom resources exactly as it does for Deployment or Service. We can use `kubectl get`, `kubectl describe`, `kubectl apply` — everything works natively.

### The Operator Pattern

An **Operator** is the combination of a CRD with a custom controller that manages it. The term, coined by CoreOS, captures the idea of "encoding operational knowledge" in software. Instead of having a human operator execute manual procedures, the Operator automates the lifecycle of a complex application.

Well-known Operator examples:
* **Prometheus Operator** — manages Prometheus instances declaratively
* **cert-manager** — manages the TLS certificate lifecycle
* **Cluster API** — manages the lifecycle of entire Kubernetes clusters

In the next section we will build a minimal Operator to understand the mechanism from the inside. The CRD and controller that follow are not derived from an official example: they are built from scratch to isolate the fundamental concepts without the complexity of a project scaffolded with [Kubebuilder](https://book.kubebuilder.io/). For real projects, Kubebuilder or [Operator SDK](https://sdk.operatorframework.io/) provide structure, testing, and code generation.

Here is the CRD we will use — an `EchoConfig` describing a simple echo service:

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

## Building a Controller: From Zero to Reconciliation

This section shows the construction of a controller that watches `EchoConfig` resources and, for each one, creates and manages a Kubernetes Deployment.

### The Project: EchoConfig Controller

Our controller will have simple but meaningful behavior:

1. **Watch**: observe `EchoConfig` resources in the cluster
2. **Reconcile**: for each `EchoConfig`, create a Deployment with an echo-server container configured with the specified `message` and `replicas`
3. **Self-healing**: if someone deletes or modifies the managed Deployment, the controller recreates or restores it

Here is an example of the Custom Resource our controller will manage:

```yaml
# echo-sample.yaml
apiVersion: demo.example.com/v1alpha1
kind: EchoConfig
metadata:
  name: hello-echo
  namespace: default
spec:
  message: "Hello from the custom controller!"
  replicas: 2
```

### Setup with controller-runtime

The [controller-runtime](https://github.com/kubernetes-sigs/controller-runtime) library is the standard framework for building Kubernetes controllers in Go. It is the same framework used by Kubebuilder and Operator SDK.

The entry point is `main.go`, where we create a **Manager** and register our controller:

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

    // The Manager handles shared cache, client, and controller lifecycle
    mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{})
    if err != nil {
        log.Error(err, "unable to create manager")
        os.Exit(1)
    }

    // Register the EchoConfig controller
    if err := (&EchoConfigReconciler{
        Client: mgr.GetClient(),
        Scheme: mgr.GetScheme(),
    }).SetupWithManager(mgr); err != nil {
        log.Error(err, "unable to create controller")
        os.Exit(1)
    }

    // Start the Manager (blocks until shutdown)
    if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
        log.Error(err, "error running manager")
        os.Exit(1)
    }
}
```

### The Reconcile Function

Here is the heart of our controller — the `Reconcile` function that implements the reconciliation logic:

```go
// reconciler.go
// Imports: context, appsv1, corev1, metav1, ctrl, client, ptr, demov1alpha1
func (r *EchoConfigReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := ctrl.LoggerFrom(ctx)

    // 1. Read the EchoConfig resource from cache
    var echoConfig demov1alpha1.EchoConfig
    if err := r.Get(ctx, req.NamespacedName, &echoConfig); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // 2. Prepare the Deployment object with only Name and Namespace
    desired := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      echoConfig.Name + "-deployment",
            Namespace: echoConfig.Namespace,
        },
    }

    // 3. Create or update the Deployment — all fields go in the mutate function
    result, err := ctrl.CreateOrUpdate(ctx, r.Client, desired, func() error {
        // Set the owner reference (needed on both create and update)
        if err := ctrl.SetControllerReference(&echoConfig, desired, r.Scheme); err != nil {
            return err
        }
        // Selector is immutable after creation, but must be set on first create
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

    log.Info("Deployment reconciled", "operation", result)
    return ctrl.Result{}, nil
}
```

Each step is intentional: we read the desired state (the CR), prepare a Deployment object with only `Name` and `Namespace`, and delegate to the **mutate function** of `CreateOrUpdate` the setting of *all* desired fields. This pattern is critical: on the update path, `CreateOrUpdate` overwrites the object with the existing one from the cluster before invoking the mutate function. If fields were set outside the mutate function, they would be lost. The owner reference, set inside the same function, links the Deployment to the CR so Kubernetes knows who "owns" what.

### Registering the Controller

The last piece is telling the framework *what* to watch. The `SetupWithManager` method defines the event sources:

```go
// setup.go
// Imports: ctrl, appsv1, demov1alpha1
func (r *EchoConfigReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&demov1alpha1.EchoConfig{}).  // Primary watch: our CRs
        Owns(&appsv1.Deployment{}).       // Secondary watch: Deployments we create
        Complete(r)
}
```

* **`For()`** — registers the primary watch. Every change to an `EchoConfig` triggers a reconciliation.
* **`Owns()`** — registers a secondary watch. If a Deployment *owned* by our controller is modified or deleted, the framework traces back to the owner (`EchoConfig`) and triggers a reconciliation. This is the mechanism that enables **self-healing**.

### Testing on a kind Cluster

Let us see the controller in action on a local [kind](https://kind.sigs.k8s.io/) cluster:

```bash
# Create a kind cluster
kind create cluster --name controller-demo

# Apply the CRD
kubectl apply -f crd-echoconfig.yaml

# Start the controller (in a separate terminal)
go run .

# Create an EchoConfig resource
kubectl apply -f echo-sample.yaml
```

Verify that the Deployment was created:

```bash
# Check the Deployment generated by the controller
kubectl get deployments

# Expected output:
# NAME                       READY   UP-TO-DATE   AVAILABLE
# hello-echo-deployment      2/2     2            2
```

Test self-healing by deleting the Deployment:

```bash
# Delete the Deployment
kubectl delete deployment hello-echo-deployment

# Wait a few seconds and verify
kubectl get deployments

# Output: the Deployment has been recreated by the controller!
# NAME                       READY   UP-TO-DATE   AVAILABLE
# hello-echo-deployment      2/2     2            2
```

Test an update by patching the CR:

```bash
# Update the message and replicas
kubectl patch echoconfig hello-echo --type merge \
  -p '{"spec":{"message":"Updated message!","replicas":3}}'

# Verify
kubectl get deployments

# Output: the Deployment now has 3 replicas
# NAME                       READY   UP-TO-DATE   AVAILABLE
# hello-echo-deployment      3/3     3            3
```

---

## Further Details

Three architectural concepts deserve additional exploration.

### Level-Triggered vs Edge-Triggered

A fundamental distinction in control systems: Kubernetes controllers are **level-triggered**, not edge-triggered. This means the `Reconcile` function does not receive the event that caused the invocation ("the replicas field was changed from 2 to 3"). It receives only a **key** (`namespace/name`) and must determine *on its own* what the current state is and what to do.

Why this design? Because it is **more resilient**. If the controller restarts and loses all queued events, it does not matter: at the next reconciliation it will read the current state and converge. It cannot "miss" a critical event, because it does not depend on events — it depends on state.

### Owner References and Garbage Collection

When our controller creates a Deployment, it sets an **owner reference** pointing to the parent `EchoConfig` resource. This has two effects:

1. **Garbage collection**: when the `EchoConfig` is deleted, Kubernetes automatically deletes all "owned" objects (the Deployment, and consequently the ReplicaSets and Pods). No cleanup logic needs to be written.
2. **Secondary watch**: thanks to the owner reference, the `controller-runtime` framework can trace back from the modified Deployment to its owner and trigger the correct reconciliation.

This ownership chain is the same that links Deployment → ReplicaSet → Pod in Kubernetes's built-in system.

### Idempotency

If there is one principle to remember when writing controllers, it is this: **the Reconcile function must be idempotent**. It must be callable 100 times in a row without unintended side effects. If the Deployment already exists with the correct configuration, `Reconcile` should do nothing. If it exists but with wrong configuration, it should update it. If it does not exist, it should create it.

This principle stems from the nature of the work queue: there is no guarantee of how many times `Reconcile` will be invoked for a given resource. Deduplication reduces redundant invocations, but does not eliminate them entirely. An idempotent controller is a reliable controller.

---

## Conclusions

This article covered the internal workings of Kubernetes controllers:

1. Kubernetes's **declarative model** is based on continuous comparison between desired state (`.spec`) and observed state (`.status`).
2. The **Informer + Work Queue + Reconcile** architecture guarantees efficiency, resilience, and scalability.
3. **CRDs and the Operator pattern** let you extend Kubernetes with the same logic as built-in controllers.
4. Building a custom controller with **controller-runtime** is approachable and follows well-defined patterns.

Every `kubectl apply` activates exactly this mechanism: a controller compares the declared intent with the cluster reality and works to close the gap.

The complete EchoConfig Controller code is available in the repository:
[monte97/k8s-controller-demo](https://github.com/monte97/k8s-controller-demo)

---

## Resources

* **[Kubernetes Controllers - Official Documentation](https://kubernetes.io/docs/concepts/architecture/controller/)**: The official page describing the role and operation of controllers in Kubernetes architecture.

* **[The Kubebuilder Book](https://book.kubebuilder.io/)**: The comprehensive guide for building Kubernetes Operators using Kubebuilder, the official scaffolding based on controller-runtime.

* **[controller-runtime - GitHub Repository](https://github.com/kubernetes-sigs/controller-runtime)**: The Go framework used in this article. Includes examples, godoc, and migration guides.

* **[Custom Resource Definitions - Official Documentation](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)**: Complete guide to CRDs, from schema definition to validation.

* **[CAPI Part 1: From Chaos to Automation](/en/blog/progettare/kubernetes/01-capi-part1-intro/)**: The first article in the Cluster API series, which extensively uses the controller pattern.

* **[CAPI Part 2: Anatomy of Cluster API](/en/blog/progettare/kubernetes/02-capi-part2-internals/)**: Deep dive into the internal architecture of CAPI and its controllers.

* **[From port-forward to Ingress](/en/blog/progettare/kubernetes/01-article-ingress-k8s/)**: How the Ingress Controller works — another practical example of the pattern described in this article.
