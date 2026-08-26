---
title: "CI/CD Pipeline on Proxmox: Provisioning with OpenTofu and Deployment with Ansible via Semaphore"
date: 2026-02-14T11:00:00.000Z
description: Architecture of a CI/CD pipeline that provisions VMs on Proxmox with OpenTofu and automates deployment with Ansible orchestrated by Semaphore
pillar: automatizzare
category: devops
tags:
  - CI/CD
  - OpenTofu
  - Ansible
  - Proxmox
  - Semaphore
  - Infrastructure as Code
  - DevOps
lang: en
reviewed: machine
series: cicd
seriesOrder: 10
---

Updating the staging environment takes: open the Proxmox UI, clone the VM, configure SSH, copy the configuration files, start the containers. Twenty minutes when it goes well, and it usually goes well.

The problem is not the half hour. It is that those steps live in the head of whoever performed them last, and that every environment ends up drifting from the others in ways nobody decided. With two environments and frequent updates, the cost is not time: it is **no longer being able to say with confidence what runs on which machine**.

## What runs, and why hands end up on it

The application is made of several containerized services — backend API, frontend, PostgreSQL, and Keycloak as the identity provider — and each environment, staging and production, sits on a dedicated VM on a Proxmox hypervisor.

The goal is a pipeline that, given a new set of images, provisions the infrastructure when needed and releases the application without anyone touching anything. The full code is in the `demo/` folder alongside this article.

## The Architecture: Three Tools, Three Responsibilities

Orchestration, provisioning, and deployment are split into three independent components. Each component has a single responsibility and well-defined interfaces with the others.

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐     ┌──────────┐
│   Jenkins    │────▶│  OpenTofu    │────▶│  Semaphore + Ansible │────▶│ App VM   │
│  (orchestr.) │     │  (infra)     │     │  (deploy)            │     │ (Docker) │
└──────────────┘     └──────┬───────┘     └──────────┬───────────┘     └──────────┘
       │                    │                        │
       │              Proxmox API              Playbook on VM
       │              VM + static IP           Docker Compose up
       │
       └──── HTTP health check ──────────────────────────────────────▶ Verify
```

| Phase | Tool | Input | Output |
|-------|------|-------|--------|
| 1. Polling | Jenkins | Container Registry | New images detected |
| 2. Provisioning | OpenTofu | VM template + `.tfvars` | Active VM, static IP |
| 3. Deploy | Semaphore + Ansible | VM IP + variables | Docker Compose stack |
| 4. Verify | Jenkins | HTTP health check | Pipeline pass/fail |

### Jenkins: Orchestration

Jenkins detects image changes by periodically polling the container registry, manages credentials through its own credential store, and coordinates subsequent steps. It has no knowledge of how OpenTofu works or how Ansible executes deployment: it simply invokes commands and passes variables.

### OpenTofu: Provisioning

OpenTofu provisions the VM on Proxmox by cloning a pre-configured template. State is persisted in PostgreSQL, and workspaces keep staging and production separate. After applying, it returns the IP of the created VM as output.

### Semaphore: Deployment

Semaphore receives the VM IP and environment variables from Jenkins, runs the Ansible playbook, and returns the deployment result. It acts as an HTTP interface to Ansible, removing the need for `ansible-playbook` to be installed on the Jenkins node.

Substitutability is a direct property of this separation. Jenkins does not know how Ansible works; Semaphore does not know where the VM IP comes from. Replacing Jenkins with GitLab CI requires changes only at the orchestration layer.

-----

## Separating Build and Deployment

One deliberate architectural choice: source code and deployment code live in separate repositories.

Source repositories (backend, frontend) compile, build Docker images, and push them to a container registry. The deployment repository contains base Dockerfiles, infrastructure configuration (OpenTofu, Ansible), and image references. Jenkins detects new images and, when present, automatically commits a version bump to the deployment repository.

### Benefits

The decoupling has practical consequences. The development team does not interact with the deployment pipeline. The deployment repository contains no application code. Changing the CI tool (from Jenkins to GitLab, for example) requires no changes to the source repositories.

### Trade-offs

The downside is an extra layer of indirection: tracing a deployment back to its source code version requires traversing the image tag in the registry. In practice, the deployment repository's git log provides a sufficient audit trail.

-----

## The Jenkinsfile: Pipeline Orchestration

The Jenkinsfile defines three sequential stages: infrastructure, deployment, and verification. The `environment` block is the central point for secret management.

### Secret Injection

```groovy
// deployment/cicd/Jenkinsfile
environment {
    // Secrets from Jenkins Credentials - never in code
    TF_VAR_proxmox_endpoint  = credentials('proxmox-url')
    TF_VAR_proxmox_api_token = credentials('proxmox-api-token')
    PG_CONN_STR              = credentials('pg-conn-str')
    SEMAPHORE_TOKEN          = credentials('semaphore-api-token')

    // Environment configuration
    ENVIRONMENT = 'staging'
    TFVARS_FILE = "environments/${ENVIRONMENT}.tfvars"

    // Health check
    HEALTH_CHECK_RETRIES = 10
    HEALTH_CHECK_DELAY   = 15
}
```

The `TF_VAR_*` variables follow an OpenTofu convention: they are automatically read as values for the corresponding Terraform variables. Jenkins credentials stay in the credential store and are injected at runtime, never serialized to the workspace.

### Infrastructure Stage

```groovy
stage('Infrastructure') {
    steps {
        dir('deployment/opentofu') {
            sh 'tofu init -input=false'
            sh "tofu workspace select -or-create ${ENVIRONMENT}"
            sh "tofu plan -input=false -var-file=${TFVARS_FILE} -out=tfplan"
            sh 'tofu apply -input=false tfplan'
        }
        script {
            env.VM_IP = sh(
                script: 'cd deployment/opentofu && tofu output -raw vm_ip',
                returnStdout: true
            ).trim()
        }
    }
}
```

The `vm_ip` output from OpenTofu becomes a Jenkins environment variable, available to subsequent stages. This is the contract between provisioning and deployment: a single IP address.

### Deploy Stage

```groovy
stage('Deploy') {
    steps {
        sh '''
            chmod +x deployment/cicd/semaphore-deploy.sh
            deployment/cicd/semaphore-deploy.sh
        '''
    }
}
```

The `semaphore-deploy.sh` script is a wrapper around the Semaphore REST API. It triggers a task template passing `VM_IP` as an Ansible extra variable, then polls for status until completion or timeout.

### Verify Stage

```groovy
stage('Verify') {
    steps {
        script {
            def retries = env.HEALTH_CHECK_RETRIES.toInteger()
            def delay = env.HEALTH_CHECK_DELAY.toInteger()

            for (int i = 1; i <= retries; i++) {
                def status = sh(
                    script: "curl -sf -o /dev/null -w '%{http_code}' http://${env.VM_IP}/ || true",
                    returnStdout: true
                ).trim()
                if (status == '200') {
                    echo "Health check passed on attempt ${i}/${retries}"
                    return
                }
                sleep(delay)
            }
            error("Health check failed after ${retries} attempts")
        }
    }
}
```

The health check is the pipeline's final gate. If the application does not respond with HTTP 200 within the configured timeout, the pipeline fails. The retry loop handles container startup time.

> **Why two health checks?** The check inside the Ansible playbook (described below) verifies that the stack is healthy from the VM itself, via localhost. Jenkins' check verifies external reachability via the network IP. The first validates the local deployment; the second validates accessibility for end users.

-----

## The VM Template as an Investment

Provisioning a VM from scratch — OS installation, SSH configuration, agent setup, cloud-init — requires significant manual effort. The pipeline eliminates this by using a pre-configured Proxmox template.

The template contains:

* Ubuntu Server 24.04 with `cloud-init` and `qemu-guest-agent`
* Docker and the Docker Compose plugin pre-installed
* Root SSH access with a pre-installed key (in production, consider a dedicated user with `sudo` and disabled root login)
* A cleaned `machine-id` for cloning

Template creation is a one-time operation. Every subsequent deploy starts from an already-configured clone.

### Provisioning with OpenTofu

The `main.tf` file defines the VM as a clone of the template, with cloud-init for network configuration:

```hcl
# deployment/opentofu/main.tf
resource "proxmox_virtual_environment_vm" "app_vm" {
  name      = var.vm_name
  node_name = var.proxmox_node

  # Clone from pre-configured template
  clone {
    vm_id = var.template_id
    full  = true
  }

  cpu {
    cores = var.vm_cores
    type  = "host"
  }

  memory {
    dedicated = var.vm_memory
  }

  # Cloud-init injects static IP and DNS at first boot
  initialization {
    ip_config {
      ipv4 {
        address = var.vm_ip_cidr
        gateway = var.vm_gateway
      }
    }
    dns {
      servers = var.dns_servers
    }
  }

  agent {
    enabled = true
  }

  started = true
}
```

The [`bpg/proxmox`](https://registry.terraform.io/providers/bpg/proxmox/latest/docs) provider handles Proxmox API interaction. Using `agent { enabled = true }` ensures that OpenTofu waits for the VM to fully start (via qemu-guest-agent) before considering the resource created.

> **TLS security note**: the demo configuration uses `insecure = true` in the provider because Proxmox certificates are typically self-signed. In production, configuring a valid certificate or adding the internal CA to the trust store is recommended, to prevent man-in-the-middle attacks on API credentials.

### Per-Environment Separation

Environment-specific values live in separate `.tfvars` files:

```hcl
# deployment/opentofu/environments/staging.tfvars
proxmox_node   = "pve"
template_id    = 9000
vm_name        = "myapp-staging"

# Reduced resources compared to production
vm_cores          = 4
vm_memory         = 8192
vm_disk_size      = 32

# Networking
vm_ip_cidr = "192.168.1.201/24"
vm_gateway = "192.168.1.1"
dns_servers = ["8.8.8.8", "8.8.4.4"]

vm_tags = ["managed-by-opentofu", "staging"]
```

These files are committed to the repository — they contain only non-sensitive values. Secrets (Proxmox endpoint, API token, PostgreSQL connection string) are injected by Jenkins as `TF_VAR_*` environment variables.

### PostgreSQL State Backend

```hcl
# deployment/opentofu/main.tf
backend "pg" {}
```

OpenTofu state is persisted in PostgreSQL rather than a local file. The connection string comes from the `PG_CONN_STR` environment variable. OpenTofu workspaces (`staging`, `production`) separate state per environment within the same database.

-----

## Deployment with Ansible via Semaphore

The Ansible playbook transforms an empty VM (with Docker pre-installed) into a running application stack.

### Playbook Structure

```yaml
# deployment/ansible/deploy.yml
- name: Deploy application with Docker Compose
  hosts: all
  become: true
  gather_facts: false

  tasks:
    - name: Create application directory
      ansible.builtin.file:
        path: "{{ app_dir }}"
        state: directory
        mode: "0755"

    - name: Generate docker-compose.yml from template
      ansible.builtin.template:
        src: docker-compose.yml.j2
        dest: "{{ app_dir }}/docker-compose.yml"
        mode: "0644"

    - name: Generate .env file
      ansible.builtin.copy:
        dest: "{{ app_dir }}/.env"
        mode: "0600"
        content: |
          POSTGRES_USER={{ postgres_user }}
          POSTGRES_PASSWORD={{ postgres_password }}
          POSTGRES_DB={{ postgres_db }}

    # For private registries, add a docker login task before the pull:
    # - name: Log in to container registry
    #   ansible.builtin.command:
    #     cmd: docker login {{ registry_url }} -u {{ registry_user }} -p {{ registry_password }}

    - name: Pull Docker images
      ansible.builtin.command:
        cmd: docker compose pull
        chdir: "{{ app_dir }}"

    - name: Start Docker Compose stack
      ansible.builtin.command:
        cmd: docker compose up -d --force-recreate
        chdir: "{{ app_dir }}"

    - name: Wait for stack to be healthy
      ansible.builtin.uri:
        url: "{{ health_check_url }}"
        method: GET
        status_code: 200
      register: health_result
      until: health_result.status == 200
      retries: "{{ health_check_retries }}"
      delay: "{{ health_check_delay }}"
```

The playbook is linear: create the directory, generate configuration from templates, pull and start containers, verify state. The `--force-recreate` flag ensures containers are recreated with the new configuration even if the image has not changed.

### The Docker Compose Template

The `docker-compose.yml.j2` file is a Jinja2 template that Ansible resolves using variables from `group_vars/all.yml`:

```yaml
# deployment/ansible/templates/docker-compose.yml.j2 (excerpt)
services:
  app:
    image: {{ app_image }}
    restart: unless-stopped
    environment:
      DATABASE_HOST: db
      DATABASE_PORT: "{{ db_port }}"
      DATABASE_USER: "{{ postgres_user }}"
      DATABASE_PASSWORD: "{{ postgres_password }}"
    depends_on:
      db:
        condition: service_healthy

  db:
    image: {{ db_image }}
    restart: unless-stopped
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U {{ postgres_user }} -d {{ postgres_db }}"]
      interval: 5s
      retries: 10

  gateway:
    image: {{ gateway_image }}
    ports:
      - "{{ gateway_port }}:80"
    depends_on:
      - app
```

The complete template, with networks, volumes, and all environment variables, is in the `demo/deployment/ansible/templates/` folder.

A single template generates configurations for all environments. Default variables are in `group_vars/all.yml`, overridable by Semaphore's Extra Variables. The database exposes a healthcheck that blocks application startup until PostgreSQL is ready.

### Centralized Variables

```yaml
# deployment/ansible/group_vars/all.yml
app_dir: /opt/app

# Container images - overridden by Semaphore with the build tag
app_image: "nginx:latest"
db_image: "postgres:17"
gateway_image: "nginx:latest"

# Ports
app_port: 8080
db_port: 5432
gateway_port: 80

# Database - password overridden by Semaphore Credentials
postgres_user: "app"
postgres_password: "CHANGE_ME_in_semaphore"
postgres_db: "appdb"

# Health check
health_check_url: "http://localhost:{{ gateway_port }}/"
health_check_retries: 12
health_check_delay: 5
```

Default values are generic placeholders. In a real deployment, Semaphore overrides `app_image` with the tag of the just-completed build and `postgres_password` with the value from its own credential store.

-----

## Secret Management

Committed configuration files (`*.tfvars`, `group_vars/all.yml`) contain only non-sensitive values: VM names, IPs, ports, resources.

Secrets follow two separate paths:

* **Infrastructure credentials** (Proxmox token, OpenTofu connection string) — Jenkins Credentials, injected as `TF_VAR_*` and `PG_CONN_STR` environment variables
* **Application credentials** (DB password, Keycloak admin) — Semaphore Environment, passed as Ansible extra-vars

No secrets pass through the repository. Jenkins and Semaphore inject them at runtime in their respective contexts.

-----

## Local Development with Makefile

The Makefile provides convenience targets for the most common operations, allowing individual pipeline components to be tested without going through Jenkins:

```bash
# Preview infrastructure changes
make infra-plan ENVIRONMENT=staging

# Apply changes
make infra-apply ENVIRONMENT=staging

# Direct deployment via Ansible (without Semaphore)
make deploy-local VM_IP=192.168.1.201

# Health check
make verify VM_IP=192.168.1.201
```

The `deploy-local` target runs the Ansible playbook directly from the local machine, useful for debugging and development without going through Semaphore. The `demo/` folder also includes a `docker-compose.yml` with hardcoded values for testing the stack locally without Ansible.

-----

## What Could Be Improved

The current pipeline uses polling (every 15 minutes) to detect new images. A webhook from the container registry would reduce the latency between publish and deploy to a few seconds.

The VM template is created manually. A tool like [Packer](https://www.packer.io/) could generate it reproducibly, eliminating the only remaining manual step in the process.

The health check only verifies HTTP reachability. In a more mature context, verification could include functional smoke tests or checks on the deployed version.

-----

## Why the three layers stay separate

One property holds the whole architecture together: **each tool has one responsibility and one interface, and none of them knows what the others do.** Jenkins orchestrates, OpenTofu provisions, Ansible configures, Docker Compose runs.

The way to measure it is to ask what replacing one of them costs. Moving from Jenkins to GitLab CI touches the orchestration layer and nothing else: provisioning and deployment never notice. If that replacement also required rewriting the others, the layers would be separate on paper only.

The price of that separation has to be stated: four tools to know, keep updated and wire together, against one script that would do all of it. Below a certain scale — a single environment that rarely changes — that price does not pay for itself.

**Above that scale, the bill reads like this:** no more manual deploys, no more environment drift, no more *"it worked on staging."* A `git push`, and everything else happens on its own — with the consequence that rebuilding an environment from scratch stops being a project and becomes a wait.

## Where to start

Not with Jenkins. With the lowest layer: move into OpenTofu the creation of **one** VM you currently click together in the UI. It is the step that pays for itself, and it tells you whether the rest of this architecture is something you actually need.

-----

## Useful Resources

* **OpenTofu Documentation**: HCL syntax and available providers.
    * [OpenTofu Docs](https://opentofu.org/docs/)
    * [Proxmox Provider (bpg/proxmox)](https://registry.terraform.io/providers/bpg/proxmox/latest/docs)
* **Ansible Documentation**: Complete guide for playbooks and best practices.
    * [Ansible Docs](https://docs.ansible.com/)
    * [Ansible Template Module](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html)
* **Semaphore**: Web UI for Ansible with REST API.
    * [Semaphore UI](https://semaphoreui.com/)
    * [Semaphore API Docs](https://semaphoreui.com/api-docs/)
* **Jenkins Pipeline**: Declarative syntax for CI/CD pipelines.
    * [Jenkins Pipeline Docs](https://www.jenkins.io/doc/book/pipeline/)
* **Proxmox VE**: Open-source hypervisor with REST API.
    * [Proxmox VE Docs](https://pve.proxmox.com/wiki/Main_Page)
    * [Cloud-Init Support](https://pve.proxmox.com/wiki/Cloud-Init_Support)
