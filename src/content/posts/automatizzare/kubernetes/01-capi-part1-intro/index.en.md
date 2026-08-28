---
title: "A Kubernetes cluster as a Kubernetes resource"
seoTitle: "Cluster API: what it is, when it pays off"
date: 2025-10-21T09:00:00.000Z
description: "The script that adds a node works until it fails halfway. Cluster API makes the cluster a declarative resource, handled with the tools you already use."
pillar: automatizzare
category: kubernetes
mode: explanation
tags:
  - Kubernetes
  - Cluster API
  - Proxmox
  - Talos
  - IaC
lang: en
reviewed: false
series: homelab-capi
seriesOrder: 10
summary:
  - label: "Problem"
    value: "Cluster provisioning and upgrades left to imperative scripts and manual procedures"
    note: "A script that fails halfway leaves behind state nobody knows about"
  - label: "Choice"
    value: "Cluster API: the cluster becomes a declarative resource, reconciled by a controller"
    note: "You declare the state you want, not the sequence of steps to reach it"
  - label: "Tool"
    value: "Management cluster on Kind, Proxmox VE infrastructure, workload cluster on Talos"
  - label: "Scope"
    value: "This article frames the model: components and flow come in the later parts"
openItems:
  - "The declarative model moves complexity rather than removing it: the controller has to be updated, observed, and understood when it stalls"
  - "The management cluster becomes a critical dependency: if it is unavailable, no workload cluster can be modified"
  - "Proxmox is this series' choice because it offers full control at low cost: on a cloud provider the CAPI providers change, the concepts do not"
  - "Below a certain scale — two or three clusters that rarely change — the cost of learning and maintaining CAPI can exceed what it saves"
figures:
  - kind: flow
    at: the-test-bench-kind-proxmox-and-talos
    label: "The three pieces of the test bench"
    caption: "On a cloud provider only the middle piece would change: that is the point of a standard interface"
    nodes:
      - kind: "Management"
        name: "Kind"
        desc: "Hosts the controllers and the resources describing the fleet. At the start it should be disposable: recreating it must not be an event."
        edge: "calls the Proxmox API"
      - kind: "Infrastructure"
        name: "Proxmox VE"
        desc: "Full control over the virtualised environment and a REST API the CAPI provider can actually act on. Not a simulator: the same mechanics at a smaller scale."
        edge: "creates the machines"
      - kind: "Workload"
        name: "Talos Linux"
        desc: "An immutable operating system built for Kubernetes and without a shell: by construction it removes the class of configuration-drift problems the imperative approach produced."
        key: true
---

The script that adds a worker node to the cluster works. You run it, it churns for two minutes, the node shows up in `kubectl get nodes`.

Then one time it fails halfway. The VM was created on Proxmox, `kubeadm` is installed, the `join` never ran because the token had expired. Now there is a machine that is not a node, that no inventory knows about, and that you will discover three months from now looking at the bill or at the hypervisor's resources.

**That is the cost of the imperative approach, and it is not the effort of writing the script.** It is that a script describes *how to do it*, and when it stops halfway it leaves behind state nobody declared and nobody knows how to rebuild.

## The problem is not creating a cluster, it is the sixth time

You put the first cluster together by hand and that is fine. The difficulty arrives when clusters become more than one and have to stay aligned over time:

- **Custom scripts** born for one case and adapted to the others, until nobody knows which version is the good one
- **Manual procedures** documented — hopefully — on a page that is two upgrades out of date
- **Static configurations** hard to version, and therefore hard to compare when two clusters behave differently
- **Coordinated control plane upgrades**, which is the moment all of the above gets paid at once

The common denominator is that every manual step introduces a point of failure, and every point of failure produces undeclared state.

## If the cluster is a resource, the habits you already have apply

[Cluster API](https://cluster-api.sigs.k8s.io/) flips the direction: instead of describing the steps, **you declare the cluster you want** and a controller takes care of getting there — and of staying there.

The idea itself is the one Kubernetes already applies to containers. What changes is the subject: here the reconciled object is not a Pod, it is an entire cluster, with its machines and the infrastructure underneath.

The practical consequence is what makes adoption reasonable: **you do not have to learn a new way of working.** A cluster is created with `kubectl apply`, inspected with `kubectl describe`, versioned in Git and applied through the same GitOps flow you already use for deployments. Same tools, same frame of mind, different object.

And the undeclared state from the opening disappears by construction: if creation is interrupted, the resource stays there stating what is missing, and the controller retries. There is no point where the process exits leaving behind an orphan machine and no trace.

## Management and workload: who runs what

CAPI separates two roles, and everything else follows from that distinction.

The **management cluster** hosts the controllers and the resources describing the other clusters. No applications run on it: it is the control room.

The **workload clusters** are the real ones, where the workloads live. They do not know they are managed: they are the result of reconciliation happening elsewhere.

The upside is that the entire fleet is described in one place, versionable. The cost has to be stated up front: **the management cluster becomes a critical dependency.** If it is unavailable, workloads keep running — it is not a proxy on the traffic path — but nobody can create, update or scale them until it comes back.

## The test bench: Kind, Proxmox and Talos

This series' path uses three pieces:

**[Proxmox VE](https://www.proxmox.com/en/proxmox-virtual-environment/overview)** as the infrastructure, for three reasons that matter more than it being free: full control over the virtualised environment, a [REST API](https://pve.proxmox.com/wiki/Proxmox_VE_API) the CAPI provider can actually act on, and operational realism comparable to an enterprise environment. A homelab on Proxmox is not a simulator: it is the same mechanics at a smaller scale.

**Kind** for the management cluster, because at the start it should be disposable. **[Talos Linux](https://www.talos.dev/)** for the workloads, because it is an immutable operating system built for Kubernetes and without a shell: by construction it removes the class of configuration-drift problems the imperative approach produced.

On a cloud provider the infrastructure provider would change and everything else would stay identical. That is the point of having a standard interface.

## What it is worth outside the infrastructure team

The difference is not the time it takes to create a cluster: that is minutes either way. It is that **the knowledge of how your clusters are built stops living in the head of whoever wrote the scripts and moves into a file that can be read, reviewed and applied** — with the consequence that rebuilding an environment after a failure becomes a repeatable operation instead of a project.

## Where to start

Before installing anything: count the clusters you run and ask yourself how many people could recreate one from scratch today. If the answer is "one", you already have this article's problem.

If the answer is "two clusters and they change once a year", CAPI is probably more machinery than you need — and it is worth knowing that beforehand, not after standing up a management cluster.

The next part goes into the components: [the CRDs and the provisioning flow](/en/blog/automatizzare/kubernetes/02-capi-part2-internals/), meaning what actually happens between the `kubectl apply` and a working cluster.
