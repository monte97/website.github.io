---
title: "CAPI Part 5: Ubuntu on Proxmox - Image Builder and Deploy"
date: 2025-10-23T14:00:00+01:00
description: Complete guide to deploying Kubernetes clusters on Proxmox using Ubuntu, Image Builder and Cluster API - From image creation to working cluster
menu:
  sidebar:
    name: Ubuntu on Proxmox
    identifier: CAPI-5
    weight: 30
    parent: CAPI
tags: ["Kubernetes", "CAPI", "Cluster API", "Ubuntu", "Proxmox", "Image Builder", "Homelab"]
categories: ["Kubernetes", "Cloud Native", "Infrastructure"]
reviewed: true
---

After exploring Talos Linux in previous articles, it's time to change approach and use Ubuntu as the base operating system for our Kubernetes nodes. In this post we'll see how to create a Kubernetes cluster on Proxmox using Cluster API (CAPI) and the official images generated with image-builder.

## Why Ubuntu instead of Talos?

While Talos provides an excellent immutable and minimal experience, Ubuntu offers:
- Greater flexibility for debugging and troubleshooting
- Familiarity for those coming from traditional Linux environments
- Wider support for tools and software
- Advanced customization possibilities

## Prerequisites

Before starting, make sure you have:
- A working Proxmox cluster
- A DHCP server configured on the network where VMs will be created
- `git`, `make` and other basic tools installed on your local machine
- Sufficient privileges access to the Proxmox cluster

## Image Builder: Creating the Base Image

[Image-builder](https://github.com/kubernetes-sigs/image-builder) is a Kubernetes community project that handles the creation of "Kubernetes-conformant" images consistently across different infrastructures and providers.

### Image-builder Objectives

The project sets several objectives:
- Install all software and tools needed for downstream providers like Cluster API
- Support user customization of images
- Provide a repeatable and reliable build process
- Ensure images are always built through a known and verified set of phases

### Initial Setup

Let's clone the repository and install dependencies:

```bash
git clone https://github.com/kubernetes-sigs/image-builder.git
cd image-builder/images/capi

# Install general dependencies
make deps

# Install Proxmox-specific dependencies
make deps-proxmox
```

**Note**: Check the output of `make deps` commands to fix any errors before proceeding.

### User Configuration and Permissions on Proxmox

To allow image-builder to operate on Proxmox, we need to create a dedicated user with appropriate permissions.

The required permissions are:
- `Datastore.*`
- `SDN.*`
- `Sys.AccessNetwork`
- `Sys.Audit`
- `VM.*`

These must be assigned to the root path `/` and propagated.

Here's the complete procedure to create user, token and dedicated role:

```bash
# Create user and token
pveum user add image-builder@pve
pveum user token add image-builder@pve builder --privsep 0

# Create a dedicated role with the necessary granular permissions
pveum role add PackerBuilder -privs "\
VM.Allocate,\
VM.Audit,\
VM.Clone,\
VM.Config.CDROM,\
VM.Config.CPU,\
VM.Config.Cloudinit,\
VM.Config.Disk,\
VM.Config.HWType,\
VM.Config.Memory,\
VM.Config.Network,\
VM.Config.Options,\
VM.Console,\
VM.Monitor,\
VM.PowerMgmt,\
Datastore.Allocate,\
Datastore.AllocateSpace,\
Datastore.AllocateTemplate,\
Datastore.Audit"

# Apply the role to necessary resources
pveum acl modify /nodes/<NODE-NAME> -user image-builder@pve -role PackerBuilder
pveum acl modify /storage/local -user image-builder@pve -role PackerBuilder
pveum acl modify /storage/local-lvm -user image-builder@pve -role PackerBuilder
```

**Important**: During token creation, a secret will be displayed. Copy and save it in a secure location, as it won't be accessible again later.

### Environment Variables

Configure the following environment variables, replacing placeholder values with those of your environment:

```bash
export PROXMOX_URL="https://<PROXMOX-URI>/api2/json"
export PROXMOX_USERNAME='image-builder@pve!builder'
export PROXMOX_TOKEN="<generated-token>"
export PROXMOX_NODE="<proxmox-node>"
export PROXMOX_ISO_POOL="local"
export PROXMOX_STORAGE_POOL="local-lvm"
export PROXMOX_BRIDGE="vmbr0"
export PACKER_FLAGS="-var disk_format=raw"
```

### Image Build

Now we can proceed with generating the Ubuntu 24.04 image:

```bash
make build-proxmox-ubuntu-2404
```

This process may take several minutes. At the end, you'll have a Proxmox template ready to be used with Cluster API.

## Deploy Kubernetes Cluster with CAPI

### Management Cluster Setup

Cluster API requires an existing Kubernetes cluster to manage workload clusters. Once environment variables are configured, we use kind to create the management cluster:

```bash
# Create management cluster with kind
kind create cluster --name capi-management

# Generate SSH key if you don't already have one
ssh-keygen -t rsa -b 4096 -f ~/.ssh/capi-cluster -N ""

# Configure environment variables for CAPI
export PROXMOX_URL="https://<PROXMOX-URI>:8006"
export PROXMOX_TOKEN='<TOKEN-ID>=<TOKEN-SECRET>'
export PROXMOX_SOURCENODE="<proxmox-node>"

# Initialize Cluster API providers
clusterctl init --infrastructure proxmox --ipam in-cluster
```


### Cluster Generation and Deploy

First, let's set some environment variables to specify certain configuration generation parameters

```bash
export CONTROL_PLANE_ENDPOINT_IP="<AVAILABLE-IP>"
export NODE_IP_RANGES='[<START-IP>-<END-IP>]'
export GATEWAY="<GATEWAY-IP>"
export IP_PREFIX=<IP-PREFIX>
export DNS_SERVERS='[<DNS-SERVER>]'
export TEMPLATE_VMID="<VMID-OF-CREATED-TEMPLATE>"
export BRIDGE="vmbr0"
export ALLOWED_NODES="[<ALLOWED_NODE1>,<ALLOWED_NODE2>]"
export BOOT_VOLUME_DEVICE="scsi0"
export BOOT_VOLUME_SIZE="15"
export NUM_SOCKETS="1"
export NUM_CORES="2"
export MEMORY_MIB="2048"
```

Generate the cluster manifest:

```bash
clusterctl generate cluster capi-cluster \
  --kubernetes-version v1.32.0 \
  --control-plane-machine-count=1 \
  --worker-machine-count=2 \
  > capi-cluster.yaml
```

Before applying the manifest, it's advisable to verify it:

```bash
# Review configuration
cat capi-cluster.yaml

# Apply when ready
kubectl apply -f capi-cluster.yaml
```

### Deploy Monitoring

You can monitor the cluster status with:

```bash
# General cluster status
kubectl get clusters

# Machine details
kubectl get machines

# Complete status
clusterctl describe cluster capi-cluster
```

### Cluster Access

Once the cluster is ready, retrieve the kubeconfig:

```bash
clusterctl get kubeconfig capi-cluster > capi-cluster.kubeconfig

# Verify access
kubectl --kubeconfig=./capi-cluster.kubeconfig get nodes
```

### CNI Installation

The cluster won't be fully functional without a network plugin. Let's install Calico:

```bash
kubectl --kubeconfig=./capi-cluster.kubeconfig apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/calico.yaml
```

After a few minutes, nodes should transition to `Ready` state:

```bash
kubectl --kubeconfig=./capi-cluster.kubeconfig get nodes
```

## Conclusions

We've seen how to create a Kubernetes cluster on Proxmox using Ubuntu and Cluster API. This approach offers:

- **Standardization**: Kubernetes-conformant images
- **Automation**: Completely declarative deploy
- **Repeatability**: Reproducible process to create identical clusters
- **Flexibility**: Ubuntu as base allows greater customization

### Next Steps

With the working cluster, you can:
- Configure persistent storage with Longhorn or Rook
- Implement an ingress controller like Traefik or NGINX
- Configure monitoring with Prometheus and Grafana
- Experiment with GitOps using ArgoCD or Flux

## Useful Resources

- [Cluster API Documentation](https://cluster-api.sigs.k8s.io/)
- [Image Builder Repository](https://github.com/kubernetes-sigs/image-builder)
- [Cluster API Provider Proxmox](https://github.com/ionos-cloud/cluster-api-provider-proxmox)
- [Calico Documentation](https://docs.tigera.io/calico/latest/about/)

---

Photo by <a href="https://unsplash.com/it/@6heinz3r?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Gabriel Heinzer</a> on <a href="https://unsplash.com/it/foto/testo-4Mw7nkQDByk?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a>
