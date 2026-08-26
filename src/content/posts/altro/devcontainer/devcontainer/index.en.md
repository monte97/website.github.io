---
title: "DevContainers: Your Portable and Reproducible Development Environment"
seoTitle: "DevContainers: portable, reproducible dev"
date: 2026-08-17T09:00:00.000Z
description: How DevContainers work, what lives in the .devcontainer folder, and how to avoid the root-owned files problem that hits developers on Linux
pillar: automatizzare
category: devcontainer
tags:
  - Docker
  - Linux
  - Containerization
  - DevOps
lang: en
reviewed: human
reproducibility: true
---


## Every hand-configured machine drifts from every other one

**"It works on my machine!"** describes a configuration problem. The code is the same for everyone: what changes is the machine underneath. Each team member sets up their environment slightly differently: mismatched language versions, missing dependencies, misaligned environment variables.

You pay for it in hours spent debugging the setup instead of the product, in slow onboarding, and in surprises at deploy time, when the development and production environments stop resembling each other.

In distributed systems and microservices architectures the surface grows: more languages, more databases, more services to keep aligned on every machine. **DevContainers** move that configuration into a file versioned alongside the code.

### The container becomes the development environment

**DevContainers** (or "Development Containers") are a Visual Studio Code (VS Code) feature that lets you use a **Docker** container as a complete development environment.

Your code is mounted into the container, and every development operation (editing, debugging, running commands, installing dependencies) happens inside that isolated environment.

You describe the ideal environment once, in a configuration file. Anyone who opens the project with VS Code and Docker gets the same environment, whatever their operating system.

![Dev Container](imgs/devcont.png)

#### VS Code runs a server inside the container

Two components sit at the heart of DevContainers:

  - **VS Code**: the IDE, which runs a "remote server" inside the container and lets you interact with files and tools as if they were local.
  - **Docker**: the containerization engine hosting the environment.

When you open the project, the IDE detects the configuration, builds and starts the container, mounts your code, and installs the specified extensions. From then on, terminal commands, debugging, and installs all happen inside the container.

### The `.devcontainer` folder holds everything needed to rebuild the environment

It sits at the root of the project and gathers the configuration files that define the environment.

#### `devcontainer.json` describes the image, the tools, and the extensions

This is the main configuration file, and it specifies how to build and configure the environment.

```json
// .devcontainer/devcontainer.json
{
  "name": "My Python App Dev Environment", // DevContainer display name
  "image": "mcr.microsoft.com/devcontainers/python:0-3.11", // Default Docker image
  // Or: "dockerFile": "Dockerfile", // If using a custom Dockerfile
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {
      "version": "latest"
    },
    "ghcr.io/devcontainers/features/node:1": {
      "version": "latest"
    },
    "ghcr.io/devcontainers/features/common-utils:2": {
      "installZsh": true,
      "installOhMyZsh": true
    }
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-azuretools.vscode-docker",
        "redhat.vscode-yaml",
        "esbenp.prettier-vscode"
      ],
      "settings": {
        "python.defaultInterpreterPath": "/usr/local/bin/python"
      }
    }
  },
  "postCreateCommand": "pip install -r requirements.txt",
  "forwardPorts": [3000, 8000],
  "remoteUser": "vscode"
}
```

For a complete guide on all available properties, check the [official documentation](https://code.visualstudio.com/docs/devcontainers/create-dev-container).

#### The `Dockerfile` is for when `features` fall short

For more granular control, you can use a custom `Dockerfile`.

```dockerfile
# .devcontainer/Dockerfile
ARG VARIANT="3.11"
FROM mcr.microsoft.com/devcontainers/python:${VARIANT}

# Install additional system dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends git curl make build-essential \
    && rm -rf /var/lib/apt/lists/*

# Configure the working directory
WORKDIR /workspace

# Set a default entrypoint (if needed)
ENTRYPOINT ["/usr/local/bin/python"]
```

The cost is a slower build and an image to maintain. In exchange you can install system-level packages and customize the base image.

#### `docker-compose.yml` when the project has multiple services

When you need a web app, a database, and a message broker together, Compose defines them.

```yaml
# .devcontainer/docker-compose.yml
version: '3.8'
services:
  # Main service, your app, which will be the development environment
  app:
    build:
      context: ../my-app
      dockerfile: Dockerfile
    volumes:
      - ..:/workspaces:cached
    command: sleep infinity
    ports:
      - "8000:8000"

  # Example database service
  database:
    image: postgres:15
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"

  # Example Kafka service
  kafka:
    image: confluentinc/cp-kafka:7.6.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    depends_on:
      - zookeeper
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
```

VS Code uses the `docker-compose.yml` to start all the services, and the `devcontainer.json` points at that file to say which service hosts the development environment.

### On Linux, files written by the container come out owned by root

This is the part developers on Linux hit almost every time, usually without immediately understanding what happened.

#### The scenario: you just generated the file and you cannot touch it

You open the project in the DevContainer. From the integrated terminal you run a command that writes to disk: `npm install`, a scaffolding command, a migration, a build. Everything works.

Then you close VS Code and open the same files from outside, with another editor or another terminal. `node_modules/`, the build folder, the migration file you just generated: `Permission denied`. `git status` sees them, `git add` fails, the editor refuses to save.

Removing them takes `sudo rm -rf`. On a development machine, needing `sudo` to delete the output of an ordinary command signals that something in the configuration stayed implicit.

#### The cause: the bind mount passes the numeric UID through unchanged

In the most common flow, the one where you open a local folder, the DevContainer mounts it as a bind mount. On Linux that mount translates nothing. The Microsoft documentation says so explicitly: "any mounted files/folders will have the exact same permissions as outside the container - including the owner user ID (UID) and group ID (GID)".

The kernel compares numbers. A user with UID 1000 on the host and a user with UID 1000 in the container are the same identity as far as the filesystem is concerned, because the name never crosses the boundary.

When no user is declared in the container, the processes run as root, UID 0. Every file they write shows up on the host owned by `root:root`. Your user keeps the right to read it, and that's where it ends.

#### On macOS and Windows the same command leaves no root-owned files

On macOS and Windows the files go through Docker Desktop's file sharing layer, and what you observe changes. The Microsoft documentation reports the result: on macOS mounted files appear owned by the container user, on Windows they appear owned by root but stay readable and writable anyway. It describes the outcome without documenting the mechanism behind it, so the outcome is what counts here.

The practical bill lands on team composition. In a mixed team the same `devcontainer.json` works for everyone except whoever develops on Linux. CI never notices, because it builds from scratch and doesn't mount your working directory. One person finds it, on their own machine, usually after the file has been in the repository for days.

#### The fix: declare a non-root user in `devcontainer.json`

Two properties govern identity inside the container. `containerUser` changes the user for every process; `remoteUser` changes it for VS Code and its subprocesses, terminal included, leaving the rest as it was.

Declaring either one also switches on the mechanism that closes the problem. The Dev Container specification defines UID sync as "an optional task for Linux (only) and that executes if the `updateRemoteUserUID` property is set to true and a `containerUser` or `remoteUser` is specified".

`updateRemoteUserUID` defaults to `true`. The specification classifies the sync as an optional task that an implementation may skip; VS Code performs it, so in practice naming the user is what it takes.

```json
{
  "image": "mcr.microsoft.com/devcontainers/python:0-3.11",
  // vscode is already non-root in the image. Naming it here switches on
  // updateRemoteUserUID on Linux, aligning its UID to yours before the container is created.
  "remoteUser": "vscode"
}
```

The `mcr.microsoft.com/devcontainers/*` images ship with the `vscode` user already created, so you don't have to create it. Naming it is still the step that matters: the specification ties the sync to a `containerUser` or `remoteUser` being *specified*, and letting the image default stand is not the same thing.

Some cases still need the alignment done by hand. If you build the image yourself and want the UID to match at build time, the Microsoft documentation points to `groupmod` and `usermod`:

```dockerfile
ARG USER_UID=1000
ARG USER_GID=$USER_UID
# The image user has a fixed UID decided upstream, which may well differ from yours.
RUN groupmod --gid $USER_GID vscode \
    && usermod --uid $USER_UID --gid $USER_GID vscode \
    && chown -R $USER_UID:$USER_GID /home/vscode
```

With Docker Compose you declare the user on the service, with `user: vscode` in `docker-compose.yml`. The documentation describes automatic UID sync for image-based and Dockerfile-based setups and says nothing about the Compose case. What is missing is the documentation, which leaves the actual behaviour open: declaring the identity costs one line and removes the doubt.

#### The recurring `chown` works, and it has a price

The shortcut has been around forever: after every command that generates files, a `sudo chown -R $USER:$USER .` from the host.

It works. The tradeoff is that each run patches the symptom and leaves the cause exactly where it was. The line moves into an alias, then into a Makefile target, then into the onboarding page as a normal step, and by then it's a project rule nobody questions.

The bill arrives with the next person who joins. They find root-owned files in the checkout, no trace of why in the `devcontainer.json`, and they lose an afternoon before someone explains that this is just how it's done here. Three lines of configuration would have cost less.

#### Reproducible development and reproducible builds are two different things

A reproducible development environment does not bring a reproducible build along with it. They are distinct problems, and they get handled in different places: the first in `devcontainer.json`, the second in lockfiles, image digests, and the pipeline.

### What changes in day-to-day work

The biggest impact of DevContainers lands on **Developer Experience (DX)**, meaning how the work feels day after day:

  - **Onboarding in minutes**: a new joiner opens the project and works, skipping the setup day that usually precedes the first line of code.
  - **The end of "works on my machine"**: everyone runs the same configuration, and discrepancies stop being a category of bug.
  - **Isolation between projects**: different stacks coexist on the same machine without version conflicts, because each project carries its own environment.
  - **Consistency with production**: the closer the container is to the production runtime, the fewer problems surface for the first time at deploy.
  - **Sharing for debugging**: you hand an environment to a colleague the way you hand over a file, which shortens the time to reproduce a problem.
  - **Cheap experimentation**: trying a new language version means changing a line and rebuilding, without touching the local machine.

### The bill, and how to keep it low

DevContainers carry real costs, and it's worth knowing them before adopting them.

#### What DevContainers charge you

  - **Docker required**: you need Docker installed and running on the local machine. For details, see [**Docker Desktop Installation**](https://www.docker.com/products/docker-desktop/).
  - **Initial overhead**: the first time you open the project it builds the image, which on heavy stacks means a few minutes of waiting.
  - **Resource consumption**: a `docker-compose.yml` with many services takes CPU and RAM that the laptop wanted for other things.
  - **Debugging on two levels**: when something breaks in the container, the problem may sit in the code or in the environment configuration, and telling them apart takes some Docker fluency.

#### The practices that reduce friction

  - **Official base images**: starting from the already-optimized DevContainer images saves reinventing the configuration. The catalog lives at [**DevContainers Features**](https://containers.dev/features).
  - **Docker layer cache**: ordering instructions from the most stable to the most volatile shortens later rebuilds.
  - **`features` before the `Dockerfile`**: `features` cover the common tools, and the `Dockerfile` stays for what is specific to the project.
  - **Minimal dependencies**: every installed package is build time and surface to keep updated.
  - **Mapped ports**: check that every port you need is exposed, before the first colleague runs into it.
  - **Dotfiles**: syncing dotfiles makes the container terminal familiar from the first start.
  - **Resource monitoring**: keeping an eye on Docker Desktop or Docker Engine usage stops the container from eating the machine quietly.

### Conclusions

DevContainers turn the development environment into an artifact versioned alongside the code. Setup stops being tribal knowledge and becomes a file you can read, review in a pull request, and fix once for everybody.

The benefit shows up most on projects with many external dependencies, where rebuilding the environment by hand costs more than reading the code. The price is Docker always running and a few minutes of initial build, and in most cases it's worth paying.
