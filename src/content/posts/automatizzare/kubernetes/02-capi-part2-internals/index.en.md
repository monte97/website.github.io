---
title: "The cluster is stuck in Provisioning. Who is waiting?"
seoTitle: "Cluster API: the CRDs and provisioning"
date: 2025-10-23T09:00:00.000Z
description: "Four nested CRDs and five phases between kubectl apply and a ready cluster. Knowing where control passes is the only way to find where it stopped."
pillar: automatizzare
category: kubernetes
mode: explanation
tags:
  - Kubernetes
  - Cluster API
  - CRD
  - Proxmox
  - Talos
lang: en
reviewed: false
series: homelab-capi
seriesOrder: 20
summary:
  - label: "Problem"
    value: "A cluster sits in Provisioning and the error is not in one single place"
    note: "Control passes between four controllers: without knowing where, you search at random"
  - label: "Choice"
    value: "Four nested CRDs — Cluster, MachineDeployment, MachineSet, Machine"
    note: "The same relationships as Deployment, ReplicaSet and Pod, applied to machines"
  - label: "Tool"
    value: "Separate providers for infrastructure, bootstrap and control plane"
    note: "Moving from Proxmox to another provider does not touch the Cluster and Machine resources"
  - label: "Result"
    value: "Five phases from manifest to kubeconfig, each with its own resource to inspect"
openItems:
  - "The CRDs shown are `v1beta1`: field names may change in later versions of the API"
  - "The inspection commands assume the Proxmox provider: with another provider the infrastructure resource names change, the method does not"
  - "The general theory of Kubernetes controllers — informers, cache, work queue — is not covered here: it is taken as given"
  - "The flow described is the happy path plus the most frequent stalling points: it is not a complete catalogue of the ways a provisioning can fail"
---

`kubectl get cluster` says `Provisioning`. It has said so for twenty minutes.

The question is not what went wrong: it is **where to look**. Because between the `kubectl apply` and a working cluster there are four different controllers, each with its own resources and its own logs, and without knowing who has control you end up reading the wrong ones.

This article is the map of that path. It is not here to build anything: it is here so that when it stalls, you know which resource to query.

> The general theory of Kubernetes controllers — informers, local cache, work queue, reconciliation — is the subject of [The mechanism behind kubectl apply](/en/blog/automatizzare/kubernetes/02-k8s-controller/). It is taken as given here.

## Who runs what

Two roles, as in [the previous part](/en/blog/automatizzare/kubernetes/01-capi-part1-intro/): the **management cluster** hosts the controllers and the resources describing the fleet, the **workload clusters** run the workloads and do not know they are managed.

![The management cluster hosts the CAPI controllers and the providers, and acts on the infrastructure to bring workload clusters to the declared state](/images/posts/kubernetes/02-capi-part2-internals/management-cluster.svg)

Four kinds of controller live in the management cluster, and the separation is not pedantry: it is what lets you change infrastructure without rewriting the resources.

- **Core controller** — handles `Cluster` and `Machine`, the platform-independent abstractions
- **Infrastructure provider** — talks to Proxmox: creates VMs, disks, network
- **Bootstrap provider** — generates the configuration that turns a machine into a node
- **Control plane provider** — handles control plane initialisation and health

A cluster on Proxmox and one on a public cloud share the same `Cluster` and `Machine` resources. Only who executes them changes.

## The four CRDs, and why there are four

The hierarchy mirrors one you already know: `Deployment → ReplicaSet → Pod`. Here it is `MachineDeployment → MachineSet → Machine`, with `Cluster` above everything.

**`Cluster`** is the declarative entry point. It does not contain the infrastructure configuration: it contains the *references* to whoever handles it.

```yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: production-cluster
spec:
  clusterNetwork:
    services:
      cidrBlocks: ["10.96.0.0/16"]
    pods:
      cidrBlocks: ["10.244.0.0/16"]
  controlPlaneEndpoint:
    host: "192.168.1.100"
    port: 6443
  controlPlaneRef:                # who handles the control plane
    apiVersion: controlplane.cluster.x-k8s.io/v1beta1
    kind: TalosControlPlane
    name: production-control-plane
  infrastructureRef:              # who creates the machines
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: ProxmoxCluster
    name: production-proxmox
```

The two fields that matter are `controlPlaneRef` and `infrastructureRef`. They are the providers' attachment point, and that is where you swap Proxmox for something else while leaving the rest of the file untouched.

**`Machine`** is the abstraction of a single instance destined to become a node. A `Machine` is not a VM: it is the declaration that a VM must exist, with a given Kubernetes version and a given bootstrap configuration.

**`MachineSet`** guarantees that N identical `Machine` objects exist, exactly as a `ReplicaSet` does with Pods.

**`MachineDeployment`** adds update handling on top: changing the workers' Kubernetes version means changing a field and letting the machines be replaced in a controlled way, not upgraded in place.

**This is the reason for the four levels**: they separate *what must exist* from *how many of them there must be* from *how you move from one version to the next*. Conflating the three means going back to scripts.

## From manifest to cluster, in five phases

What actually happens after the `apply`, and who holds control at each moment:

| Phase | Who acts | What it produces |
|---|---|---|
| 1. Resource creation | API server | the objects exist, no infrastructure yet |
| 2. Infrastructure provisioning | Cluster controller → infrastructure provider → Proxmox API | the VMs exist |
| 3. Bootstrap | Machine controller → bootstrap provider | the Talos configuration is generated and delivered |
| 4. Control plane initialisation | control plane provider | the control plane answers |
| 5. Kubeconfig | core controller | the credentials to talk to the new cluster |

The phases are sequential and every handover is a point where the process can stall. **Knowing which phase it stalled in already tells you which controller to query**, and that is why it is worth keeping them distinct instead of thinking of provisioning as a single operation.

## Reading the state when it stalls

Back to the question from the opening. Three levels, in the order worth looking at them.

**Are the controllers alive?** If a provider is not running, everything depending on it sits still with no visible error on the resources.

```bash
kubectl get pods -n capi-system
kubectl get pods -n capx-system                 # infrastructure provider
kubectl get pods -n capi-bootstrap-talos-system
```

**What do the resources say?** `describe` shows the conditions, which is where controllers write down why they are not proceeding.

```bash
kubectl get cluster production-cluster -o wide
kubectl get machines -A -o wide
kubectl describe cluster production-cluster
kubectl get events --sort-by='.lastTimestamp' -A
```

**And if the stall is at the infrastructure level**, you drop down to the provider's resources:

```bash
kubectl get proxmoxclusters,proxmoxmachines -A -o wide
kubectl describe proxmoxmachine <machine-name>
```

If nothing surfaces there either, what remains are the logs of the controller responsible for the phase it stopped in:

```bash
kubectl logs -n capi-system deployment/capi-controller-manager
kubectl logs -n capx-system deployment/capx-controller-manager
```

The order is not arbitrary: you go from general to specific, and each level rules out a class of causes.

## What knowing this is worth

A provisioning that stalls without a map becomes half a day of guesswork, and it is half a day that repeats at every incident because nobody learned anything. **The difference between declarative infrastructure that works and declarative infrastructure a team fears is exactly here: if you know where to look when it stalls, the declarative model is a gain; if you do not, you have only added a layer between yourself and the machines.**

## To try right now

On an existing CAPI cluster, run `kubectl get machines -A -o wide` and `kubectl describe cluster <name>` even when everything is fine. Reading the conditions of a healthy cluster is the fastest way to recognise, next time, one that is not.

The next part goes into [Talos Linux](/en/blog/automatizzare/kubernetes/03-capi-part3-talos/) and why an immutable operating system removes an entire class of node-level problems.
