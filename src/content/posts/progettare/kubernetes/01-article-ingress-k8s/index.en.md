---
title: "From port-forward to Ingress: How to configure a professional local Kubernetes environment with NGINX"
date: 2025-10-21T09:00:00.000Z
description: Complete guide to configuring an NGINX Ingress Controller on a local Kubernetes cluster (kind) to expose services in a stable and professional manner.
pillar: progettare
category: kubernetes
tags:
  - Kubernetes
  - kind
  - Ingress
  - NGINX
  - DevOps
  - Local Development
lang: en
reviewed: human
series: kubernetes-fondamenti
seriesOrder: 20
---

## The Problem: Accessing Services in a Local Development Environment

Let's face it: we all started this way. You have your brand new app on Kubernetes, and to test it you open 12 different terminals, one for each `kubectl port-forward ...`. It works, but it's awkward and doesn't simulate a real environment at all.

To better understand these concepts, it's useful to consult the [official Kubernetes documentation](https://kubernetes.io/docs/home/).

To dive deeper into the use of `kubectl`, consult the [official kubectl documentation](https://kubernetes.io/docs/reference/kubectl/).

### The Chaos of `port-forward`

This is the most common "workaround". We have to manually create a tunnel from our PC to *each* service.

1.  Open a **first terminal** and leave it running:
    ```bash
    # Terminal 1 forwards port 8080 to service FOO
    kubectl port-forward service/foo-service 8080:80
    ```
2.  Open a **second terminal** and leave it running:
    ```bash
    # Terminal 2 forwards port 8081 to service BAR
    kubectl port-forward service/bar-service 8081:80
    ```

Now, to test, you would have to use different URLs on different ports:

  * For FOO: `curl http://localhost:8080`
  * For BAR: `curl http://localhost:8081`

**The problems are obvious:**

  * You have to keep open **N terminals** for **N services**.
  * You have to make up and remember a **different port** (`8080`, `8081`, ...) for each service.
  * You're not testing a real URL (like `/foo`) but just a port.
  * It's a **debug tunnel**, not a real network service. It's fragile and doesn't replicate a production environment.

```text
+-----------------+      +---------------------------------------------+
|   Developer PC  |      |              Kubernetes Cluster             |
|                 |      |                                             |
| +-----------+   |----->| service/foo ---> pod-foo                    |
| | Terminal 1|   | 8080 |                                             |
| | port-fwd  |   |      |                                             |
| +-----------+   |      |                                             |
|                 |      |                                             |
| +-----------+   |----->| service/bar ---> pod-bar                    |
| | Terminal 2|   | 8081 |                                             |
| | port-fwd  |   |      |                                             |
| +-----------+   |      +---------------------------------------------+
+-----------------+
```

### The Layer 4 Alternative: `NodePort`

Another option is to use a `Service` of type `NodePort`. This opens a static port on *each* cluster node. Although more stable than `port-forward`, it works at **Layer 4** (TCP/UDP). This means it doesn't understand the HTTP protocol and cannot:
- Read the host (e.g. `mydomain.local`)
- Read the path (e.g. `/foo`)
- Dispatch traffic based on this information.

With `NodePort`, each service would still require its own dedicated port.

Here's a representation of the traffic flow with a NodePort service:

```text
+-----------------+      +---------------------------------------------+
|   Developer PC  |      |              Kubernetes Cluster           |
|                 |      |                                             |
| +-----------+   |----->| service/foo (NodePort 30001) -> pod-foo    |
| | curl      |   | 30001|                                             |
| | http://   |   |      |                                             |
| | localhost:|   |      |                                             |
| | 30001     |   |      |                                             |
| +-----------+   |      |                                             |
|                 |      |                                             |
| +-----------+   |----->| service/bar (NodePort 30002) -> pod-bar    |
| | curl      |   | 30002|                                             |
| | http://   |   |      |                                             |
| | localhost:|   |      |                                             |
| | 30002     |   |      |                                             |
| +-----------+   |      +---------------------------------------------+
+-----------------+
```

To dive deeper into how NodePort services work, consult the [official Kubernetes documentation on services](https://kubernetes.io/docs/concepts/services-networking/service/).

---

## The Solution: Layer 7 Routing with an Ingress Controller

We want a single entry point (`http://mydomain.local`), a single port (port `80`) and clean routing based on paths (`/foo` goes to FOO, `/bar` goes to BAR). This is **Layer 7 routing** (HTTP), and it's *exactly* what an Ingress Controller does.

### Kubernetes's Declarative Model in Action

The solution is based on two components that are a perfect example of Kubernetes's declarative model. Instead of giving commands about *how* to configure the network, we *declare* the desired state, and Kubernetes works for us.

*   **Ingress Controller**: This is the **software component** that acts as a **reverse proxy** and entry point for the cluster. Its job is to observe `Ingress` resources and dynamically reconfigure the proxy to apply the defined routing rules. This automatic reconciliation process is made possible by the **[controller pattern](https://kubernetes.io/docs/concepts/architecture/controller/)**, the heart of Kubernetes. It represents the **Data Plane**: the component that actually performs traffic routing.

*   **[Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/) object**: This is the **configuration resource** in YAML format that defines a **set of rules** for routing. Here we declare our intentions: "traffic for `mydomain.local/foo` must go to `foo-service`". It represents the **Control Plane** of our network configuration: it defines the desired state.

The Ingress Controller watches the Kubernetes API. As soon as we apply an `Ingress` resource, the controller detects it and reconfigures itself dynamically to implement the defined rules.

To understand how Kubernetes's declarative model works, consult the [official documentation](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/).

Here's a representation of the traffic flow with an Ingress Controller:

```text
+----------+      +----------------+      +--------------------+      +-----------------+      +---------+
|          |      |                |      | Ingress Controller |      |                 |      |         |
|   User   |----->| localhost:80   |----->| (Service on        |----->|   foo-service   |----->| Pod foo |
|          |      | (PC/Docker)    |      |  NodePort 32000)   |      |                 |      |         |
+----------+      +----------------+      |                    |      +-----------------+      +---------+
                                          | Regole:            |
                                          | /foo -> foo-service|
                                          | /bar -> bar-service|      +-----------------+      +---------+
                                          |                    |      |                 |      |         |
                                          |                    |----->|   bar-service   |----->| Pod bar |
                                          |                    |      |                 |      |         |
                                          +--------------------+      +-----------------+      +---------+
```

### Alternatives to NGINX Ingress

While NGINX Ingress Controller is a very popular and stable choice, there are other good options that might be more suitable for specific use cases:

*   **[Traefik](https://doc.traefik.io/traefik/providers/kubernetes-ingress/)**: A modern ingress controller with many built-in features like Let's Encrypt support, integrated monitoring dashboards and automatic configuration recognition. It offers a very pleasant user experience and is particularly suitable for dynamic environments.

*   **[Istio](https://istio.io/)**: A service mesh platform that offers advanced traffic management features beyond standard ingress capabilities. Istio is particularly useful when you need advanced traffic management, observability and security between services, but has a steeper learning curve.

*   **[HAProxy Ingress](https://haproxy-ingress.github.io/)**: Based on the well-known HAProxy load balancer, it offers many advanced configuration options and good performance.

*   **[Contour](https://projectcontour.io/)**: An ingress controller based on Envoy Proxy, developed by VMware. It's particularly appreciated for its clear configuration and good Kubernetes integration.

The important thing is that, thanks to Kubernetes's declarative model, it's possible to change ingress controllers without having to modify the existing `Ingress` resources (if standard features are used).

To dive deeper into the various available options, consult the [official Kubernetes page on ingress controllers](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/).

---

## Implementation on `kind`

Let's see how to implement this solution step by step on a `kind` cluster (Kubernetes in Docker).

### 1. Prepare the `kind` Cluster

The `kind` configuration is fundamental to properly expose services. The `kind-lb-config.yaml` file creates a network mapping between our PC and the cluster.

```yaml
# kind-lb-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1beta1
networking:
  disableLoadBalancer: true
nodes:
- role: control-plane
  extraPortMappings:
  # Maps your PC's port 80 to NGINX's static HTTP port (32000)
  - containerPort: 32000
    hostPort: 80
    protocol: TCP
  # Maps your PC's port 443 to NGINX's static HTTPS port (32443)
  - containerPort: 32443
    hostPort: 443
    protocol: TCP
- role: control-plane
- role: control-plane
- role: worker
- role: worker
```
> **Explanation**: `extraPortMappings` instructs Docker to forward traffic from port `80` of our `localhost` to port `32000` of the container running the cluster node. We'll see shortly why we use port `32000`.

Create the cluster:
```bash
kind create cluster --name kind-lb-demo --config kind-lb-config.yaml
```

### 2. Install the NGINX Ingress Controller

Now let's install the Ingress Controller. We use a manifest `kind-ingress-deploy.yaml` that has been specifically corrected to ensure stability in a `kind` environment.

```bash
kubectl apply -f kind-ingress-deploy.yaml
```
Wait for it to be ready:
```bash
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

> #### 💡 The Theory: Static `NodePort` Stability
> The `kind-ingress-deploy.yaml` file has been modified to use a `Service` of type `NodePort` with **fixed** ports.
> We've forced the service to use `type: NodePort` and to always expose itself on ports `32000` (HTTP) and `32443` (HTTPS).
>     ```yaml
>     # Extract from kind-ingress-deploy.yaml
>     spec:
>       type: NodePort
>       ports:
>       - nodePort: 32000 # <-- FIXED Port
>     ```
> This creates a predictable and stable network chain: `localhost:80` → `kind-node:32000` → `NGINX Pod`.

### 3. Deploy Demo Applications

Deploy two simple `foo` and `bar` applications that we'll use to test routing.

```bash
kubectl apply -f demo-apps.yaml
```

> #### 💡 The Theory: `Deployment` and `Service`
> The `demo-apps.yaml` file contains two fundamental object types:
> *   **[Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)**: Declares the desired state for our application (e.g. "I want 1 replica of the `http-echo` container"). Its controller ensures that the correct number of **[Pods](https://kubernetes.io/docs/concepts/workloads/pods/)** (the work units that run our containers) is always active.
> *   **[Service](https://kubernetes.io/docs/concepts/services-networking/service/)**: Since Pods are ephemeral (they are created and destroyed, changing IP), a Service provides a **stable access point** and internal cluster DNS name (e.g. `foo-service`) for a group of Pods. It's to this stable address that our Ingress will point.

To dive deeper into these concepts, consult the official Kubernetes documentation on [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) and [Service](https://kubernetes.io/docs/concepts/services-networking/service/).

### 4. Configure DNS and Routing Rules

Finally, define the routing rules for the Ingress Controller.

**a. Local DNS**

Edit your `/etc/hosts` file (or `C:\Windows\System32\drivers\etc\hosts` on Windows) to resolve `mydomain.local` on your PC.
```
127.0.0.1   mydomain.local
```

**b. Ingress Rule Definition**

This YAML file (`demo-ingress.yaml`) defines our set of routing rules.

```yaml
# demo-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mydomain-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: "mydomain.local"
    http:
      paths:
      - path: /foo
        pathType: Prefix
        backend:
          service: { name: foo-service, port: { number: 80 } }
      - path: /bar
        pathType: Prefix
        backend:
          service: { name: bar-service, port: { number: 80 } }
```
Apply the rules:
```bash
kubectl apply -f demo-ingress.yaml
```

### 5. Security: HTTPS Configuration with SSL/TLS

To test more realistic and secure environments, it's possible to configure HTTPS for ingress rules. This requires creating SSL/TLS certificates.

To generate a self-signed certificate for your local domain (e.g. `mydomain.local`), you can use the following command:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt -subj "/CN=mydomain.local"
```

Next, create a Kubernetes Secret with the certificate:

```bash
kubectl create secret tls mydomain-tls --key tls.key --cert tls.crt
```

Finally, add the TLS section to your ingress:

```yaml
# demo-ingress.yaml with HTTPS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mydomain-ingress
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - mydomain.local
    secretName: mydomain-tls  # Name of the secret created previously
  rules:
  - host: "mydomain.local"
    http:
      paths:
      - path: /foo
        pathType: Prefix
        backend:
          service: { name: foo-service, port: { number: 80 } }
      - path: /bar
        pathType: Prefix
        backend:
          service: { name: bar-service, port: { number: 80 } }
```

Now you can test HTTPS connections:

```bash
# Test HTTPS for FOO service
curl https://mydomain.local/foo --insecure
# Response: Hello, I'm the FOO service

# Test HTTPS for BAR service
curl https://mydomain.local/bar --insecure
# Response: Hi there, this is BAR
```

> **Note**: The `--insecure` option is necessary when using self-signed certificates because they are not signed by a recognized certificate authority.

For automatic SSL/TLS certificate management in production, consider using `cert-manager`, which can obtain free certificates from Let's Encrypt.

For more information about TLS secrets in Kubernetes, consult the [official documentation](https://kubernetes.io/docs/concepts/configuration/secret/).

---

## Operational Flow and Kubernetes Abstraction

### Initial Setup Test

Now, from your terminal (no more strange ports!):

```bash
# Test the first endpoint
curl http://mydomain.local/foo
# Response: Hello, I'm the FOO service

# Test the second endpoint
curl http://mydomain.local/bar
# Response: Hi there, this is BAR
```
Fantastic! We have a single entry point that routes traffic to the correct services.

### Where do the Pods run? (And why don't we care)

If we run `kubectl get pods -o wide`, we'll see that Kubernetes (through its **Scheduler** component) has distributed the Pods across various worker nodes. They might be on the same node or on different nodes.

This is the heart of Kubernetes's abstraction: thanks to the `Service` that provides us with a stable address, **we don't care where the Pods are physically located**. This follows the well-known Kubernetes community mantra **"Cattle, not Pets"** (treating servers like livestock, not pets): Pods are considered ephemeral and interchangeable resources, not unique and irreplaceable servers.

### Adding a New Service (The Declarative Magic)

And if we now wanted to add a "baz" service? With this setup, it's a piece of cake.

1.  **Deploy the new app** (`baz-app.yaml`, similar to `foo` and `bar`).
    ```bash
    kubectl apply -f baz-app.yaml
    ```
2.  **Update Ingress rules (declaratively)**:
    Instead of using an imperative command like `kubectl edit`, we modify our configuration file `demo-ingress.yaml` directly, which represents our "source of truth".

    Add the new rule for `/baz` to the file:
    ```yaml
    # demo-ingress.yaml (updated)
    # ... (inside spec.rules.http.paths)
          - path: /foo
            # ...
          - path: /bar
            # ...
          # ADD THIS NEW RULE:
          - path: /baz
            pathType: Prefix
            backend:
              service:
                name: baz-service
                port:
                  number: 80
    ```
    Now, simply **reapply the file**:
    ```bash
    kubectl apply -f demo-ingress.yaml
    ```
    Kubernetes will compare the new desired state with the current state and apply only the differences, without interrupting existing traffic. This is the GitOps and Infrastructure as Code approach.
3.  **Test immediately**:
    ```bash
    curl http://mydomain.local/baz
    # Response: BAZ service online!
    ```
> **The Magic of "Reconciliation"**: We didn't restart NGINX. The Ingress Controller noticed the change in the `Ingress` resource and updated its configuration on the fly. This is the power of Kubernetes's declarative model.

---

## Alternative: Host-Based Routing (Subdomains)

So far we've used path-based routing (`/foo`, `/bar`). A very common and clean alternative is **host-based routing**, where each service responds to its own dedicated subdomain (e.g. `foo.mydomain.local`).

The wonderful thing about Kubernetes's declarative model is that **it's not necessary to destroy and recreate anything** to make this change. We can switch from one routing strategy to another simply by modifying and re-applying our configuration files. The cluster will handle reconciliation of the state.

This approach is often preferred because it completely isolates services and allows having independent paths (`/api`, `/v2`, etc.) for each of them.

Let's see how to modify our setup.

### 1. Update Local DNS (`/etc/hosts`)

First, we need to tell our PC where to find the new subdomains. Update the `/etc/hosts` file by adding the new hosts, making them point to our `localhost`.

```
127.0.0.1   mydomain.local
127.0.0.1   foo.mydomain.local
127.0.0.1   bar.mydomain.local
```

### 2. Modify Ingress Rules

Now let's modify our `demo-ingress.yaml` file to use the new hosts. The modification is very simple: instead of having one rule with multiple paths, we create multiple rules, one for each host.

```yaml
# demo-ingress.yaml (version with subdomains)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mydomain-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: "foo.mydomain.local" # <-- Host for FOO service
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: foo-service
            port:
              number: 80
  - host: "bar.mydomain.local" # <-- Host for BAR service
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bar-service
            port:
              number: 80
```

Apply the new configuration:
```bash
kubectl apply -f demo-ingress.yaml
```

### 3. Test the New Setup

Now you can access services using their dedicated subdomains:

```bash
# Test the first service
curl http://foo.mydomain.local
# Response: Hello, I'm the FOO service

# Test the second service
curl http://bar.mydomain.local
# Response: Hi there, this is BAR
```

With a simple modification to our `Ingress` resource, we've completely changed the routing strategy, demonstrating the flexibility and power of this resource.

---

## Conclusions

We have transformed a chaotic workflow based on `port-forward` into a clean, stable, and professional local development environment that reflects a production setup.

We have seen how:
1.  The main problem of local development is unstable and awkward access to services.
2.  The solution is an **Ingress Controller**, which provides Layer 7 routing leveraging Kubernetes's declarative model.
3.  Correct implementation on `kind` requires stable port mapping via a **static `NodePort` service**.
4.  Thanks to abstractions like `Service` and `Deployment`, we can manage our applications without worrying about their physical location in the cluster.

Now you can throw away all those `port-forward` scripts.

For further insights into these concepts, I recommend consulting the [official Kubernetes documentation](https://kubernetes.io/docs/home/).

## Troubleshooting

During the use of ingress in a kind environment, some common issues may arise. Here are some solutions:

*   **Ingress not reachable**: Ensure that the NGINX Ingress service is correctly running and that ports 80 and 443 are free on your system. Verify with `kubectl get pods -n ingress-nginx` that the pods are in `Running` state.

*   **DNS resolution error**: Verify that the host `mydomain.local` (or your custom domain) is correctly configured in the `/etc/hosts` file.

*   **Connection refused**: Check that the requested backend service is actually available and that the ingress rule points to the correct service name and port.

*   **Mapped ports not working**: Check that the `kind` configuration correctly includes the port mappings from `hostPort` to `containerPort` as defined in `kind-lb-config.yaml`.

*   **SSL certificates**: If you need to test HTTPS features, you can generate self-signed certificates using tools like `openssl` or use `cert-manager` to manage certificates automatically.

## External References

To dive deeper into the topics covered in this guide, here are some official resources and reference documentation:

*   **[Official Kubernetes Documentation - Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)**: The official Kubernetes documentation that details what Ingress resources are and how they work.

*   **[Official Kubernetes Documentation - Services](https://kubernetes.io/docs/concepts/services-networking/service/)**: In-depth coverage of Kubernetes services, including NodePort and ClusterIP types.

*   **[NGINX Ingress Controller - Documentation](https://kubernetes.github.io/ingress-nginx/)**: The official documentation for the NGINX controller for Kubernetes, with all configuration options and advanced examples.

*   **[kind - Official Documentation](https://kind.sigs.k8s.io/)**: The official documentation of kind (Kubernetes in Docker), with installation guides and advanced configuration.

*   **[Istio Service Mesh](https://istio.io/)**: Official Istio documentation, a complete service mesh platform with advanced traffic management features.

*   **[cert-manager](https://cert-manager.io/)**: Tool for automatically managing SSL/TLS certificates in Kubernetes, useful for obtaining certificates from Let's Encrypt.

*   **[Official Kubernetes Documentation - Controllers](https://kubernetes.io/docs/concepts/architecture/controller/)**: In-depth explanation of the controller pattern, fundamental for understanding Kubernetes's declarative operation.

### Cleanup

When you're done, delete everything with a single command:

```bash
kind delete cluster --name kind-lb-demo
```
And don't forget to remove `mydomain.local` from your `hosts` file!

---

Photo by <a href="https://unsplash.com/it/@carrier_lost?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Ian Taylor</a> on <a href="https://unsplash.com/it/foto/nave-da-carico-blu-e-rossa-in-mare-durante-il-giorno-jOqJbvo1P9g?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a>
