---
title: "A service isn't yours until you can rebuild it"
seoTitle: "n8n self-hosted: OpenTofu, Ansible, LXC"
date: 2025-07-20T13:00:00.000Z
description: "Self-hosting n8n means swapping a dependency on a SaaS for a dependency on yourself. Worth it only if the service rebuilds itself from Git in one command."
pillar: automatizzare
category: homelab
mode: how-to
tags:
  - n8n
  - Automation
  - Homelab
  - DevOps
  - Self-Hosted
lang: en
reviewed: false
reproducibility: true
summary:
  - label: "Context"
    value: "Self-hosted n8n in the homelab as an alternative to automation SaaS"
    note: "Zapier and Make as points of comparison"
  - label: "Stack"
    value: "OpenTofu provisions, Ansible configures, Docker Compose runs"
    note: "Three separate layers on the same LXC container"
  - label: "Choice"
    value: "An LXC container instead of a virtual machine"
    note: "Shared host kernel: lighter and more transparent than a VM"
  - label: "Result"
    value: "A service rebuildable from Git on any compatible node"
    note: "Configuration versioned and applied idempotently"
openItems:
  - "The instance stays on the LAN with a bridge network and a dedicated IP: exposing it directly to the internet is not part of this project"
  - "The playbook deletes existing containers and volumes before deploying: with data to preserve, that stage has to be rethought before use"
  - "The Python dependencies for Docker are pinned to exact versions: updating them is a compatibility reassessment, not an automatic step"
  - "Persistence uses the local Docker volume with n8n's internal SQLite database: multi-instance setups or external databases are out of scope"
openNote: "Boundaries to know before reusing this stack as it is."
---

You set that homelab service up eight months ago. It works. And you have no idea what is inside it: which version, which environment variables, which package you installed by hand that evening it would not start.

As long as it runs, that is not a problem. It becomes a problem the day the disk dies, or you want to move it to another node, or simply update it — and you discover that the only documentation was your memory back then.

**Self-hosting a service means swapping a dependency on a vendor for a dependency on yourself.** That is a good deal on one condition: that you are rebuildable. Otherwise you have only changed the name of your single point of failure.

This is the path for [n8n](https://n8n.io/) — workflow automation, the self-hosted alternative to Zapier or Make — done so the service rebuilds itself from Git. The code is at [monte97/homelab-n8n](https://github.com/monte97/homelab-n8n).

## Three layers, three responsibilities

Rebuildability does not come from the tools: it comes from having separated them.

| Layer | Tool | Answers |
|---|---|---|
| Infrastructure | OpenTofu | which machine must exist |
| Configuration | Ansible | what has to sit on it |
| Execution | Docker Compose | how the service runs |

The value of the separation shows when something changes. Moving the service to another node touches only the first layer. Updating n8n touches only the third. Changing the distribution underneath touches only the second. **If the three layers were one script, each of those operations would be a change to all of it.**

## Why an LXC container and not a VM

The underlying choice is where to run the thing, and it is worth understanding because it is the least reversible one.

LXC and Docker are both containers and use the same kernel mechanisms — namespaces and cgroups, the same ones [a Docker container is made of](/blog/automatizzare/docker/docker-internals/). What changes is what you put inside:

| | LXC — *system container* | Docker — *application container* |
|---|---|---|
| Goal | a complete, self-contained operating system | a single process |
| Structure | `systemd`, several services, users | one main process, stateless |
| Persistence | designed to be stateful | immutable, data lives in volumes |
| Philosophy | behaves like a lightweight VM | *cattle, not pets* |

For a homelab service that needs an IP on the LAN, `systemd`, and a long life cycle, the system container is the right abstraction: the convenience of a machine, without the cost of a separate kernel.

And here the flip side has to be stated: **a shared kernel means weaker isolation than a VM.** In a homelab behind the LAN that is a reasonable trade-off. On a node also hosting code you do not trust, it is not.

## Provisioning: what must exist

OpenTofu — the open-source fork of Terraform — describes the container as a resource: template, assigned resources, bridge network with a dedicated IP.

The point that matters is not the syntax, it is **state**. OpenTofu keeps track of what it created, and that makes the difference between re-running and recreating: applying the same file twice does not produce two containers.

## Configuration: what sits on top

Ansible takes the empty container and brings it to ready. Three choices in the playbook are worth isolating, because they are what makes it reusable rather than single-use.

**Variables in one place.** Everything that changes between environments sits at the top, and the rest of the playbook references it:

```yaml
vars:
  n8n_data_dir: "/opt/n8n_data"
  n8n_port: 5678
  n8n_domain: "n8n.K8S2.homelab"
  n8n_timezone: "Europe/Rome"
  n8n_docker_image: "docker.n8n.io/n8nio/n8n"
```

**The playbook adapts to the system rather than assuming it.** Ansible gathers *facts* from the target machine and the playbook uses them to decide:

```yaml
- name: Install required system packages
  ansible.builtin.package:
    name: [ca-certificates, curl, gnupg, python3-pip]
    state: present
  when: ansible_os_family == "Debian"
```

That is the difference between a script that works on your distribution and a playbook that works on a family of distributions.

**The Python dependencies are pinned to exact versions.** This is not pedantry: the Docker libraries for Python have a history of breaking between minor releases, and a provisioning that worked yesterday and does not today is exactly the problem we were eliminating. The cost is that updating them becomes a decision, not an automatic step.

## Execution: how it runs

The final Compose file is deliberately poor:

- **Minimal configuration** — only the strictly necessary environment variables. Every extra option is one more thing to remember when something will not start.
- **Named volume** (`n8n_data`) for persistence: internal SQLite database, workflows, credentials. It is the only thing worth backing up, and it is in one place.
- **`restart: unless-stopped`**, because a node reboot should not require intervention.
- **Ansible templates** instead of literal values: the same file serves different environments.

## The trap inside the playbook

One thing has to be said before anybody runs it: **the playbook deletes existing containers and volumes before deploying.**

For a from-scratch provisioning that is correct — it guarantees the result is always the same, which is the point of idempotency. On an instance holding workflows and credentials you need, it deletes everything.

If you reuse this stack against something that already contains data, that stage has to be rethought first, not afterwards.

## What it is actually worth

The gain is not getting n8n for free: a SaaS paid plan costs less than your hours are worth. **It is that the service stops being an installation and becomes a file** — one that can be read, versioned, applied on another node, and rebuilt after a failure without depending on what you remember.

It is the same difference that exists, at company scale, between a server nobody dares touch and an environment that recreates itself. The scale changes, the reasoning does not.

## Where to start

Take the homelab service you would most hate to lose and try to write down, without looking at it, what runs on it and how it is configured. What you cannot write is the debt.

Then start with a single layer — a versioned Compose file is already half the work. OpenTofu and Ansible make sense once the services become more than one, and before that they are machinery.

## Resources

- [n8n documentation](https://docs.n8n.io/) — configuration and environment variables
- [OpenTofu](https://opentofu.org/docs/) — the open-source fork of Terraform
- [Ansible: playbooks and best practices](https://docs.ansible.com/ansible/latest/playbook_guide/index.html)
- [Proxmox VE: LXC containers](https://pve.proxmox.com/wiki/Linux_Container)
