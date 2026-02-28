---
title: Self-Hosted n8n Deployment in Homelab
date: 2025-07-20T13:00:00.000Z
description: Personal automation with n8n deployment, configuration and integration in a home lab environment
pillar: automatizzare
category: homelab
tags:
  - n8n
  - Automazione
  - Homelab
  - DevOps
  - Self-Hosted
lang: en
reviewed: human
---

## Context and Motivations

n8n is a powerful open-source workflow automation tool that allows connecting a wide range of services through configurable nodes. Unlike SaaS (Software as a Service) alternatives like Zapier or Make, **n8n** can be installed in **self-hosted** mode, ensuring full control over data, privacy, and extensibility.

The goal of this project is to illustrate how to create a fully **automated** n8n instance within a home lab environment. The following technologies will be used:

  * **LXC containers** for environment isolation
  * **OpenTofu** (an open-source fork of Terraform) for infrastructure provisioning
  * **Ansible** for idempotent service configuration

The entire project code is available in the public repository:
👉 [https://github.com/monte97/homelab-n8n](https://github.com/monte97/homelab-n8n)

-----

## Infrastructure Stack

### Architectural choices

The infrastructure was designed in three distinct layers for clear separation of responsibilities and to ensure a completely reproducible environment:

1.  **Provisioning**: The infrastructure hosting the service is managed through [OpenTofu](https://opentofu.org/).
2.  **Configuration**: Operating system setup and prerequisite installation are done with [Ansible](https://www.ansible.com/).
3.  **Deploy**: The **n8n** application is deployed via `docker-compose`, also managed by Ansible.

The adoption of **LXC (Linux Containers)** as containerization technology is a well-considered choice. Motivated by its lightness and greater transparency compared to a traditional virtual machine (VM), LXC operates directly on the host system's kernel, offering superior efficiency.


### Focus: LXC Containers vs. Docker

Linux Containers (LXC) and Docker represent two different approaches to containerization with distinct philosophies. While Docker revolutionized application deployment with the **application container** paradigm, LXC is based on the concept of **system container**: an environment that simulates a complete operating system while sharing the host kernel.

| **Characteristic** | **LXC (System Container)** | **Docker (Application Container)** |
| :---------------------------- | :------------------------------------------------------------- | :------------------------------------------------------------- |
| **Goal** | Run a complete, isolated and autonomous operating system.    | Run a single application or a single process.        |
| **Structure** | Includes an init system (e.g. `systemd`), multiple services, users and processes. | Usually has a single main process and a stateless architecture. |
| **Persistence** | Designed to be persistent and "stateful".                  | Designed to be immutable and "stateless" (persistent data is managed through external volumes). |
| **Philosophy** | Behaves like a lightweight VM.                              | "Cattle, not pets" paradigm.                               |
| **Isolation mechanisms** | Uses `Namespace` and `CGroup`.                                 | Uses `Namespace` and `CGroup`.                                 |


### Logical topology

The **n8n** instance is isolated in an LXC container with a **bridge** mode network. This configuration assigns the container a unique IP address on the local network, making it accessible from the LAN without exposing it directly to the internet, improving security.

All configurations, from container definition to application setup, are **versioned in Git** and applied in an **idempotent** manner via Ansible. This ensures that the entire service can be reliably and completely recreated on any compatible node, with minimal manual intervention.

-----

## Provisioning with OpenTofu

### What is OpenTofu?

OpenTofu is an open-source tool for managing infrastructure through declarative code. Born as a fork of Terraform's open-source version, OpenTofu maintains the same syntax and philosophy, offering continuity and transparency.

Traditionally, provisioning occurs through web interfaces, manual scripts or documented procedures, an approach that can lead to:

  * **Inconsistency**: each deployment may differ slightly from the previous one.
  * **Lack of traceability**: it's difficult to know who did what and when.
  * **Limited scalability**: creating many servers requires proportionally more time.
  * **Complex disaster recovery**: recreating an environment from scratch is often a lengthy and manual process.

OpenTofu solves these problems by allowing you to describe the desired state of the infrastructure in configuration files, as in the following example.

```hcl
# Example: defining WHAT you want, not HOW to create it
resource "lxc_container" "n8n_prod" {
  name     = "n8n-production"
  image    = "ubuntu/22.04"
  memory   = "2048MB"
  cpu      = 2

  network {
    name = "lxc-bridge"
    ip   = "10.0.0.100"
  }
}
```

### Code analysis (`main.tf` file)

The following are the key parts of the `main.tf` file analyzed to understand how OpenTofu translates intentions into concrete infrastructure.

#### Provider configuration

```hcl
terraform {
  required_providers {
    proxmox = {
      source = "telmate/proxmox"
      version = "~> 2.9"
    }
  }
  required_version = ">= 1.0"
}
```

This section defines the project's fundamental requirements. The use of the Proxmox provider (`version = "~> 2.9"`) and a minimum OpenTofu/Terraform version (`>= 1.0`) is specified. This practice ensures **reproducibility** and **stability** in the deployment environment.

#### Secure authentication

```hcl
provider "proxmox" {
  pm_api_url = var.proxmox_api_url
  pm_api_token_id = var.proxmox_api_token_id
  pm_api_token_secret = var.proxmox_api_token_secret
  pm_tls_insecure = var.proxmox_tls_insecure
}
```

The provider uses **variables** instead of hardcoded credentials. This approach, a **best practice** in Infrastructure as Code (IaC), keeps secrets separate from code and supports different environments (dev, staging, prod) with the same base configuration but different credentials.

#### Declarative resource definition

The heart of the configuration is the LXC container definition:

```hcl
resource "proxmox_lxc" "n8n_container" {
  target_node = var.proxmox_node
  hostname = var.vm_name
  description = "n8n Workflow Automation Container"

  # Computational resource configuration
  cores = var.vm_cores
  memory = var.vm_memory
  swap = var.vm_swap
}
```

This section demonstrates OpenTofu's **declarative nature**. Instead of writing a script that says "create a container, then assign memory...", the **final desired state** is defined. OpenTofu orchestrates the necessary API calls to achieve this state.

#### Storage management

```hcl
# Root filesystem
rootfs {
  storage = var.vm_storage
  size = var.vm_disk_size
}

# Dedicated storage for application data
mountpoint {
  key = "0"
  slot = 0
  storage = var.vm_storage
  mp = "/opt/n8n"
  size = var.vm_data_disk_size
}
```

The storage configuration shows an advanced pattern: the separation between **system filesystem** and **application data**. This facilitates selective backups, data migration and independent storage resizing.

#### Deterministic networking

```hcl
network {
  name = "eth0"
  bridge = var.vm_network_bridge
  ip = var.vm_ip_address
  gw = var.vm_gateway
  type = "veth"
}
```

Network configuration eliminates random IP address assignment. Each resource has a **predictable address**, essential for automation, monitoring and integration with other systems.

#### Post-creation provisioning

```hcl
provisioner "remote-exec" {
  inline = [
    "apt-get update",
    "apt-get install -y curl wget gnupg python3",
    "systemctl enable ssh"
  ]
  connection {
    type = "ssh"
    host = split("/", var.vm_ip_address)[0]
    private_key = file(var.ssh_private_key)
  }
}
```

**Provisioners** allow post-creation configurations to be executed. In this case, the system is prepared with base packages and SSH is enabled. This creates a fundamental bridge between infrastructure creation and application configuration.

#### Lifecycle management

```hcl
lifecycle {
  ignore_changes = [
    ostemplate,  # Prevents container recreation for template changes
  ]
}
```

Lifecycle rules prevent **undesired recreations**. For example, if the container template is updated on Proxmox, OpenTofu will not attempt to recreate the existing container, preserving data and configurations.

-----

## Automation with Ansible

### What is Ansible?

Ansible is an "agentless" automation platform for system configuration, deployment and orchestration. Developed by Red Hat, it's one of the most widely used tools in DevOps for managing complex infrastructures.

After provisioning the infrastructure, the next step is configuration, a process that traditionally required:

  * manual login to servers to install software.
  * custom bash scripts, often difficult to manage.
  * manual procedures to follow step by step.
  * lack of idempotency: repeating the same operation could produce different results.

Ansible solves these problems thanks to two fundamental features:

  * **Declarative**: instead of writing scripts that describe how to do something, the final state you want to achieve is declared. Ansible determines the necessary actions to obtain it.
  * **Agentless**: it doesn't require the installation of any additional software on target systems, using standard protocols like SSH (for Linux) and WinRM (for Windows).

Its strength lies in its ability to unify the management of all levels with a single language and consistent methodology.

```yaml
# Example: declaring the DESIRED STATE
- name: Ensure Docker is installed and running
  package:
    name: docker.io
    state: present

- name: Ensure Docker service is enabled
  service:
    name: docker
    state: started
    enabled: yes
```

### Analysis of the configuration playbook

The following are the most significant sections of the Ansible playbook analyzed to understand how to transform an empty container into a production-ready application.

#### Structure and centralized variables

```yaml
vars:
  n8n_data_dir: "/opt/n8n_data"
  n8n_port: 5678
  n8n_domain: "n8n.K8S2.homelab"
  n8n_timezone: "Europe/Rome"
  n8n_docker_image: "docker.n8n.io/n8nio/n8n"
```

**Centralization of variables** is a fundamental best practice. All environment-specific configurations are defined in a single place, making the playbook adaptable to different contexts (development, staging, production) simply by modifying these values.

#### Conditional OS management

```yaml
- name: Install required system packages
  ansible.builtin.package:
    name:
      - ca-certificates
      - curl
      - gnupg
      - python3-pip
    state: present
  when: ansible_os_family == "Debian"
```

Ansible uses **automatic facts** to detect target system characteristics. The condition `when: ansible_os_family == "Debian"` makes the playbook compatible with different Linux distributions, automatically adapting commands.

#### Docker installation

```yaml
- name: Add Docker GPG key
  ansible.builtin.apt_key:
    url: "https://download.docker.com/linux/{{ ansible_distribution | lower }}/gpg"
    state: present

- name: Add Docker APT repository
  ansible.builtin.apt_repository:
    repo: "deb [arch=amd64] https://download.docker.com/linux/{{ ansible_distribution | lower }} {{ ansible_distribution_release }} stable"
    state: present
```

Instead of installing Docker from default repositories, often outdated, the playbook configures official repositories. The use of variables `{{ ansible_distribution }}` and `{{ ansible_distribution_release }}` ensures that the correct repository for the specific operating system version is used.

#### Privilege management

```yaml
- name: Add user to docker group
  ansible.builtin.user:
    name: "{{ ansible_user }}"
    groups: docker
    append: yes

- name: Install compatible Docker Python packages
  ansible.builtin.pip:
    name:
      - docker==6.1.3
      - docker-compose==1.29.2
    state: present
```

Privilege management follows the **principle of least privilege**. The user is added to the `docker` group to avoid using `sudo` for every command. Installing specific versions of Python packages (`docker==6.1.3`) ensures **compatibility and reproducibility**.

#### Idempotent cleanup

```yaml
- name: Remove old n8n containers and data (cleanup)
  ansible.builtin.shell: |
    docker compose down || true
    docker container rm -f n8n || true
    docker volume rm n8n_data || true
  args:
    chdir: "{{ n8n_data_dir }}"
  ignore_errors: yes
```

This section implements a **robust cleanup** before configuration. The use of `|| true` and `ignore_errors: yes` makes the operation **idempotent**: it can be executed multiple times without generating errors, even if the elements to remove don't exist.

#### Dynamic configuration generation

```yaml
- name: Create Docker Compose file for n8n
  ansible.builtin.copy:
    content: |
      version: '3.8'
      services:
        n8n:
          image: {{ n8n_docker_image }}:{{ n8n_docker_tag }}
          environment:
            - N8N_HOST={{ n8n_domain }}
            - WEBHOOK_URL=http://{{ n8n_domain }}:{{ n8n_port }}
            - GENERIC_TIMEZONE={{ n8n_timezone }}
          volumes:
            - n8n_data:/home/node/.n8n
    dest: "{{ n8n_data_dir }}/docker-compose.yml"
  notify: Restart n8n container
```

The playbook **dynamically generates** the Docker Compose file using previously defined variables. This eliminates the need to maintain separate templates and ensures that each deployment is correctly configured for its environment.

#### Handlers for automatic reactions

```yaml
handlers:
  - name: Restart n8n container
    ansible.builtin.command:
      cmd: docker compose restart
      chdir: "{{ n8n_data_dir }}"
    listen: "Restart n8n container"
```

**Handlers** are a system of automatic reactions: when the Docker Compose file creation task is modified (`notify: Restart n8n container`), Ansible automatically restarts the container. This ensures that configuration changes are applied immediately.

#### Idempotent deployment

```yaml
- name: Start n8n container with Docker Compose
  ansible.builtin.command:
    cmd: docker compose up -d
    chdir: "{{ n8n_data_dir }}"
  register: docker_compose_result
  changed_when: "'Creating' in docker_compose_result.stdout or 'Starting' in docker_compose_result.stdout"
```

The final task implements **intelligent deployment**: Ansible considers the task "modified" only if new containers are actually created or started. This distinguishes between executions that change the system state and those that find it already in the desired state.

-----

## n8n: deployment and configuration

The n8n deployment represents the final layer of the stack, where operational simplicity meets the power of automation. Using Docker Compose to orchestrate the application container maintains consistency with the declarative approach of the entire infrastructure.

### Deployment philosophy

n8n configuration follows "production-readiness" and operability principles, focusing on:

  * **Essential configuration** through environment variables.
  * **Data persistence** managed by volumes.
  * **Reliability** with automatic restart.
  * **Operational simplicity**, avoiding over-engineering.

<!-- end list -->

```yaml
version: '3.8'
services:
    n8n:
        image: {{ n8n_docker_image }}:{{ n8n_docker_tag }}
        container_name: n8n
        restart: unless-stopped
        ports:
        - "{{ n8n_port }}:5678"
        environment:
        - N8N_SECURE_COOKIE=false
        - N8N_HOST={{ n8n_domain }}
        - N8N_PORT=5678
        - N8N_PROTOCOL=http
        - WEBHOOK_URL=http://{{ n8n_domain }}:{{ n8n_port }}
        - GENERIC_TIMEZONE={{ n8n_timezone }}
        - TZ={{ n8n_timezone }}
        - N8N_LOG_LEVEL=info
        - N8N_DIAGNOSTICS_ENABLED=false

        volumes:
        - n8n_data:/home/node/.n8n

volumes:
    n8n_data:
        external: false
```

### Configuration choices

  * **Minimal configuration**: the "minimal viable configuration" approach includes only the strictly necessary environment variables, reducing operational complexity.
  * **Named Volumes**: using a Docker volume (`n8n_data`) ensures persistence of critical data (internal SQLite database, workflows, credentials and configurations), simplifying backup and migration.
  * **Restart Policy**: the `unless-stopped` policy ensures automatic restart of the container in case of crash or system reboot, ensuring high availability.
  * **Template variables**: using Ansible variables (`{{ n8n_domain }}`, `{{ n8n_port }}`) allows customizing the configuration for different environments using the same base template.

-----

## 📚 Useful Resources

  * **n8n Official Documentation**: The main resource for exploring advanced n8n features.
      * [n8n docs](https://docs.n8n.io/)
      * [n8n Community Forum](https://community.n8n.io/)
  * **OpenTofu Official Documentation**: To fully understand HCL syntax and provisioning capabilities.
      * [OpenTofu Docs](https://opentofu.org/docs/)
      * [Proxmox Provider for OpenTofu](https://registry.terraform.io/providers/Telmate/proxmox/latest/docs)
  * **Ansible Official Documentation**: A complete guide to mastering configuration management.
      * [Ansible Documentation](https://docs.ansible.com/)
      * [Ansible Best Practices](https://docs.ansible.com/ansible/latest/playbooks_best_practices.html)
  * **Linux Containers (LXC)**: To deepen understanding of system containers and their differences with Docker.
      * [LXC Website](https://linuxcontainers.org/)
      * [LXD Documentation](https://linuxcontainers.org/lxd/docs/)
  * **Docker Documentation**: Essential to understand basic and advanced concepts of application containers and Docker Compose.
      * [Docker Docs](https://docs.docker.com/)
      * [Docker Compose Overview](https://docs.docker.com/compose/)
