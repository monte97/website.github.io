---
title: "Keycloak Federation: Integrating Users from LDAP, Okta, Google, and Other Identity Providers"
date: 2026-03-06T09:00:00.000Z
description: "How Keycloak integrates external identities using two distinct mechanisms: User Federation for directories like LDAP/AD, and Identity Brokering for providers like Okta, Google, and other Keycloak instances."
pillar: progettare
category: keycloak
tags:
  - Keycloak
  - Federation
  - LDAP
  - Identity Brokering
  - SSO
  - Security
series: keycloak
seriesOrder: 15
lang: en
reviewed: machine
---

In many organizations, user identities are distributed across heterogeneous systems: an Active Directory holding thousands of employees, a social login provider for customers, an external IdP for business partners. Applications need a single authentication entry point, regardless of where users actually live.

Keycloak solves this with two distinct mechanisms: **user federation** and **Identity Brokering**. Both bring external identities into a Keycloak realm, but they work in fundamentally different ways. The choice between them depends on who controls credential storage.

---

## The Problem: Fragmented Identities

In the [introductory article](../01-keycloak-intro) we saw how a centralized identity provider eliminates identity silos. But there is an implicit assumption: that users are created inside Keycloak. In many real-world scenarios, that is not the case.

A typical setup:

```
Active Directory (3,000 employees)  →
Google (social login for customers) →  Keycloak  →  Internal App / Customer Portal / Partner Area
Okta (200 external consultants)     →
```

Three completely different identity sources, three different protocols — but applications need to see a single JWT with a consistent structure. They do not want to know whether a user came from LDAP, Google, or Okta. They want a token signed by Keycloak, with the right claims.

Keycloak achieves this with two complementary strategies, described in the sections below.

---

## Strategy 1: User Federation

### The Concept

User Federation means Keycloak connects to an **external user directory** and uses it as if it were its own. Credentials are not copied: every login is delegated to the external system. Attributes (name, email, groups) are imported into Keycloak's local database by default and synchronized periodically. It is possible to disable import and query the directory on every request, but the standard behavior includes a local cache.

The classic case is LDAP/Active Directory: the organization already has thousands of users in a directory and has no intention of migrating them. With user federation, Keycloak becomes a facade in front of that directory.

### How It Works

```text
User             Keycloak              LDAP / Active Directory
  |                  |                          |
  |-- login -------->|                          |
  |                  |-- bind (verify) -------->|
  |                  |<-- credentials ok -------|
  |                  |-- query attributes ----->|
  |                  |<-- name, email, groups --|
  |                  |                          |
  |                  | [creates local session,  |
  |                  |  issues JWT with claims  |
  |                  |  derived from LDAP]      |
  |                  |                          |
  |<-- JWT ---------|                          |
```

The key point: **the user logs in on Keycloak**, entering credentials on the Keycloak login page. But Keycloak does not validate those credentials against its own database — it forwards them to the external system. If LDAP confirms, Keycloak creates a session and issues a JWT just as it would for any local user.

From the application's perspective, nothing changes. The JWT is identical to one issued for a user created directly in Keycloak. The difference is entirely behind the scenes.

### Characteristics

- **Credentials stay in the external system.** Keycloak does not store the user's password: every login is delegated to the directory.
- **Attributes synchronized.** Name, email, groups, roles: Keycloak imports them from the directory and maps them into its own claims. Synchronization happens at login and via configurable periodic syncs. A department change in AD is reflected in the token after the next synchronization, not immediately.
- **Transparent to the user.** The user sees the Keycloak login page and enters the same credentials they use for corporate email. They do not know — and should not need to know — that LDAP is behind it.
- **Bidirectional (optional).** Keycloak can also write to the directory: if a user registers through Keycloak or changes their password, the change can propagate to LDAP.

### When It Makes Sense

User Federation is the right choice when **you control the external identity system** and want Keycloak to use it as the source of truth for users. The typical scenario:

- The organization has an existing Active Directory or LDAP server with users already in it
- Migrating users into Keycloak is not possible or desirable
- Modern applications (SPAs, microservices) need JWT tokens, but credentials must stay in the corporate directory

The fundamental point is that **Keycloak is the only login page**. The user never interacts directly with LDAP: they enter credentials on Keycloak, which handles communication with the directory.

---

## Strategy 2: Identity Brokering

### The Concept

Identity Brokering is a completely different mechanism. Instead of connecting to an external database, Keycloak **delegates the entire login process to another identity provider (IdP)**. The user does not enter credentials on Keycloak: they are redirected to the external provider, authenticate there, and return with a token or assertion that Keycloak consumes.

The distinction is clear: with user federation, Keycloak receives credentials and verifies them by delegating to the external system. With Identity Brokering, Keycloak never touches credentials: it receives only the result of authentication performed elsewhere.

### How It Works

```text
User             Keycloak              External Provider
  |                  |                  (Google / Okta / another KC)
  |-- login -------->|                          |
  |                  |                          |
  |<-- redirect to --|                          |
  |   provider ------|                          |
  |                  |                          |
  |-- login directly at provider -------------->|
  |<-- authorization code (via redirect) -------|
  |                  |                          |
  |-- callback ----->|                          |
  |                  |-- exchange code -------->|
  |                  |<-- provider token -------|
  |                  |                          |
  |                  | [validates external      |
  |                  |  token, maps local user, |
  |                  |  creates session,        |
  |                  |  issues own JWT]         |
  |                  |                          |
  |<-- JWT ---------|                          |
```

> The diagram shows the OIDC flow (Authorization Code). With SAML, the mechanism differs: the assertion travels directly via browser POST, without the server-to-server code-token exchange.

The difference is visible from the user experience: **the user sees two login pages** (or potentially just one, if they already have an active session on the external provider, making the redirect transparent). They are first redirected to the external provider, then return to Keycloak.

In this scenario, Keycloak never touches the user's credentials. It receives a token from the external provider (via server-to-server exchange in the OIDC case, or an assertion via browser in the SAML case), validates it, and creates a local representation of the user in its own database. From that point on, it issues its own JWTs, signed with its own key, exactly as it does for any other user.

### Supported Protocols

Identity Brokering works with several standard protocols:

- **OpenID Connect / OAuth 2.0**: the most common. Google, Okta, Auth0, another Keycloak — all expose OIDC endpoints. Keycloak registers as a client with the external provider, and the flow follows the standard Authorization Code flow.
- **SAML 2.0**: still prevalent in enterprise environments. If a partner uses ADFS, Shibboleth, or a SAML IdP, Keycloak acts as a Service Provider (toward the external provider) and as an identity provider (toward its own client applications), consuming SAML assertions and re-issuing tokens in its own format.
- **Social Login**: Google, GitHub, Facebook, Apple, Microsoft — Keycloak has pre-built connectors that simplify integration. Technically these are specific cases of OIDC/OAuth2, but with simplified configuration.

### What Happens to the Local User

When a user logs in for the first time through an external broker, Keycloak executes the **First Broker Login Flow**: a configurable flow that decides what to do with the received identity. The main strategies:

- **Automatic creation**: Keycloak creates a local user with attributes received from the external provider (email, name, etc.)
- **Link to existing user**: if a user with the same email already exists, Keycloak can link the external identity to the local account. The user ends up with a Keycloak account that has multiple "links" to different providers
- **Explicit prompt**: Keycloak can ask the user to confirm the link or complete registration

This means a single Keycloak user can have **multiple federated identities linked**: they log in with Google from their phone, with corporate credentials from their laptop, and Keycloak knows it is the same person. Applications always see the same `sub` in the JWT.

### Concrete Examples

**Social Login (Google):** the simplest case. The user clicks "Sign in with Google" on the Keycloak login page, is redirected to Google, authorizes, and returns. Keycloak receives the OIDC token from Google, creates (or updates) the local user, and issues its own JWT. The application does not know — and does not care — that the user authenticated via Google.

**Enterprise Federation (Okta):** a business partner manages their own users in Okta. Instead of creating duplicate accounts in Keycloak, Okta is configured as an external identity provider. When a partner consultant accesses the portal, they are redirected to Okta, log in with their corporate credentials, and return. For applications, they are a Keycloak user like any other.

**Multi-Keycloak (KC brokering toward another KC):** a multi-region or multi-business-unit scenario. Each unit has its own Keycloak with its own users. A central Keycloak acts as a broker: when a user from another region accesses, they are redirected to their region's Keycloak, log in, and return to the central Keycloak with a token that is consumed and re-issued. Applications see a single Keycloak and a single token format.

```
                  Central KC (broker)
                 /         |          \
         KC Italy      KC Germany    KC Spain
         500 users      800 users    300 users
```

Each regional KC manages its own users. The central KC duplicates nothing: it brokers toward the right one based on the email domain, the user's choice, or any routing logic configured.

### When It Makes Sense

Identity Brokering is the right choice when **identity is managed by a third party** and you do not have direct access to credential storage. Typical scenarios:

- Offering social login (Google, GitHub, Apple) to application users
- A partner or enterprise customer manages their own users in a separate IdP (Okta, Azure AD, ADFS)
- Multiple Keycloak instances across different regions or business units requiring a unified access point
- Integration with a legacy system that speaks only SAML

---

## Federation vs Brokering: The Differences

| Aspect | User Federation | Identity Brokering |
|---|---|---|
| **Where credentials live** | In the external system (LDAP/AD) | In the external provider (Okta, Google, another KC) |
| **Who authenticates** | Keycloak validates credentials against the external system | The external provider authenticates directly |
| **Login page** | Only Keycloak | Redirect to the external provider |
| **What the user sees** | A single login page (Keycloak) | Potentially two (Keycloak + provider) |
| **Protocol toward the external** | LDAP bind / query | OIDC, SAML, OAuth2 |
| **Local user in KC** | Imported by default; optional with Import Users = OFF | Created at first login (required for the session) |
| **Does Keycloak touch credentials?** | Yes — receives them and forwards them | No — sees only the resulting token/assertion |
| **Typical use case** | Existing corporate directory | Social login, external partners, multi-IdP |

The practical rule is straightforward:

- **You control the user store** (LDAP, AD, custom database) → **User Federation**
- **Identity is managed by others** (Google, Okta, a partner) → **Identity Brokering**
- **You need both** → combine them in the same realm, without conflicts

---

## Combining Both Strategies

The two strategies are not mutually exclusive. In a realistic enterprise scenario, it is common to find both active in the same Keycloak realm:

```
Corporate LDAP  --[User Federation]-->
Google          --[Identity Broker]--> Realm "production"  -->  Uniform JWT for all apps
Okta (Partner)  --[Identity Broker]-->
```

Employees log in with LDAP credentials on the Keycloak page. Customers click "Sign in with Google" and are redirected. Partner consultants are redirected to Okta. But in the end, the application always receives a Keycloak-signed JWT with the same structure, the same claims, the same format.

This is the real value of federation: **Keycloak becomes the convergence point**. No matter how many identity sources exist — applications see only one.

---

## Conclusion

Keycloak provides two mechanisms for integrating external identities, and the distinction is clear:

- **User Federation**: Keycloak connects to an external store (LDAP/AD) and uses it as its own user database. Credentials flow through Keycloak.
- **Identity Brokering**: Keycloak delegates login to an external provider (Okta, Google, another KC). Credentials never pass through Keycloak.

In practice, the two mechanisms combine freely in the same realm. The result is a single authentication point for all applications, regardless of where users live.

The next article in the series moves from concepts to implementation: we will see how to build the Authorization Code flow with PKCE in a real application.

---

**Useful resources:**
- [Keycloak User Federation](https://www.keycloak.org/docs/latest/server_admin/index.html#_user-storage-federation) — official documentation
- [Keycloak Identity Brokering](https://www.keycloak.org/docs/latest/server_admin/index.html#_identity_broker) — official documentation
- [LDAP Integration](https://www.keycloak.org/docs/latest/server_admin/index.html#_ldap) — LDAP/AD configuration
- [OpenID Connect](https://openid.net/connect/) — the standard behind OIDC brokering
