---
title: "Kubectl Tips"
date: 2026-01-08
draft: false
menu:
  notes:
    name: Kubectl Tips
    identifier: kubectl-tips
    weight: 10
---

{{< note title="Kubectl Context Rapido" >}}
Cambia rapidamente context e namespace:

```bash
# Alias utili per .bashrc / .zshrc
alias kctx='kubectl config use-context'
alias kns='kubectl config set-context --current --namespace'

# Uso
kctx production
kns monitoring
```
{{< /note >}}

{{< note title="Port Forward Multi-Pod" >}}
Forward verso tutti i pod di un deployment:

```bash
# Forward su singolo pod
kubectl port-forward deploy/my-app 8080:80

# Con label selector
kubectl port-forward $(kubectl get pod -l app=my-app -o name | head -1) 8080:80
```
{{< /note >}}

{{< note title="Debug Container Temporaneo" >}}
Esegui un container di debug nel namespace:

```bash
kubectl run debug --rm -it --image=nicolaka/netshoot -- bash

# O attach a un pod esistente (K8s 1.25+)
kubectl debug my-pod -it --image=busybox --target=my-container
```
{{< /note >}}
