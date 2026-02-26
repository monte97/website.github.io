---
title: "Keycloak Adoption on .NET Backend"
date: 2025-01-07
draft: true
description: "Keycloak adoption as identity provider for a .NET backend, from architecture to full implementation"
menu:
  sidebar:
    name: Keycloak .NET Adoption
    identifier: keycloak-dotnet-adoption
    parent: projects
    weight: 80
technologies: ["Keycloak", ".NET", "C#", "Docker", "PostgreSQL", "OAuth2", "OpenID Connect"]
categories: ["Security", "Identity Management", "Backend"]
role: "Technical Lead & Implementer"
duration: "4 months"
team_size: "5-10 people"
client_type: "SME"
featured: false
related_posts: []
reviewed: true
---

## Overview

Complete Keycloak adoption project as identity provider for a .NET backend application. I managed the entire cycle: requirements analysis, architecture design, implementation, team training, and post-release support.

The application started with a custom authentication system no longer adequate for security and scalability needs. Keycloak enabled centralized identity management, SSO support, and external provider integration.

## Tech Stack

* **Keycloak** — identity and access management
* **.NET / C#** — backend application
* **OAuth2 / OpenID Connect** — authentication protocols
* **Docker** — Keycloak containerization
* **PostgreSQL** — Keycloak database

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Web App   │  │ Mobile App  │  │   Third-party Clients   │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Keycloak                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Realms    │  │    Users    │  │   Identity Providers    │ │
│  │   Clients   │  │   Roles     │  │   (Google, Azure AD)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ JWT Tokens
┌─────────────────────────────────────────────────────────────────┐
│                      .NET Backend                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Authentication Middleware (JWT Bearer)                  │   │
│  │  Authorization Policies (Role-based, Claims-based)       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Activities

The project followed a structured path, from theoretical foundations to the implementation of advanced patterns, culminating in a training workshop for the team.

### Module 1: Foundations and Architecture

In this phase, we established the groundwork for Keycloak adoption.
* **Protocol Analysis**: Studied **OAuth 2.0** and **OpenID Connect (OIDC)** to define the most suitable authentication and authorization flow (Authorization Code Flow).
* **Architectural Design**: Designed the **Realm** structure to isolate environments (dev, staging, prod), configured **Clients** for different applications (.NET backend, web app, mobile), and defined **Roles** for granular access control.
* **Production-Ready Setup**: Deployed Keycloak in a containerized environment (Docker) with an external **PostgreSQL** database, configured behind a reverse proxy for TLS termination.

### Module 2: .NET Backend Integration

The core of the project was the integration with the .NET application.
* **Authentication Middleware**: Implemented a **JWT Bearer** authentication middleware. This included validating the token's signature against Keycloak's JWKS endpoint and verifying `iss` (issuer) and `aud` (audience) claims.
* **Authorization Policies**: Created role-based and claims-based authorization policies using `[Authorize(Roles = "admin")]` and custom policies, mapping token roles and attributes to the user's identity in .NET.
* **Internal Library**: Encapsulated the integration logic into an internal .NET library to facilitate its reuse across other company microservices.

### Module 3: Federated and M2M Authentication

We extended the architecture to support complex authentication scenarios.
* **Identity Brokering**: Configured Keycloak as an **Identity Broker** to enable Single Sign-On (SSO) with external providers like **Google** and **Azure AD**, managing the first login flow and attribute mapping.
* **User Federation**: Integrated with an existing **LDAP** directory to synchronize corporate users, allowing them to authenticate with their corporate credentials without migration.
* **Machine-to-Machine (M2M) Authentication**: Implemented the **Client Credentials Grant** flow to allow backend services to authenticate with each other securely, without human intervention.

### Module 4: Migration and Training

The final phase covered the transition from the old system and knowledge sharing.
* **User Migration**: Developed scripts to migrate users from the legacy system to Keycloak, managing password hash compatibility for a seamless transition.
* **Training Workshop**: A comprehensive training session for the development team covering OIDC concepts, Keycloak administration, and security best practices, based on hands-on demos for each implemented flow.

## Results

* **Standardization and Security**: Replaced a custom system with a standard, secure, and modern solution based on OIDC and OAuth 2.0.
* **Complete Single Sign-On (SSO)**: Enabled SSO for internal users, external partners (via Azure AD), and customers (via Google), centralizing identity management.
* **Scalable and Maintainable Architecture**: Adopting a central IAM simplified the architecture, reduced code duplication, and prepared the system for future evolutions.
* **Autonomous Team**: The development team is now able to independently manage the Keycloak configuration, integrate new applications, and troubleshoot common issues.

## Related Articles

*No related articles available*
