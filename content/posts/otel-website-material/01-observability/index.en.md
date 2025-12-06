---
title: "Observability in Distributed Systems: From Monitoring to Understanding"
date: 2025-07-29T18:00:00+02:00
description: Why metrics, logs, and traces are no longer enough. A paradigm shift to understand and master the complexity of modern systems.
menu:
  sidebar:
    name: Introduction
    identifier: OBS-1
    weight: 10
    parent: OBS
tags: ["Observability", "OpenTelemetry", "Distributed Systems", "Tracing", "Metrics", "Logging", "DevOps", "Architecture", "Monitoring"]
categories: ["Software Architecture", "DevOps", "Distributed Systems"]
---

-----

## The Exitless Maze: A New Analogy for Observability

Imagine you are a brilliant architect, responsible for a huge and intricate building, full of complex systems: heating, ventilation, lighting, security, elevators. You have installed sensors everywhere: every temperature, every pressure, every watt of energy consumed is recorded. Your control dashboards are a profusion of charts and data, every parameter is monitored to perfection, every line is green and reassuring. You know exactly *what* is happening in every single corner of the building.

But one day, the building stops working as it should. The air conditioning no longer cools an entire wing, the elevators are stuck on the third floor, and some lights flash inexplicably. Despite all that data, despite knowing *what* is broken, you are completely in the dark about **why** it doesn't work. You can't understand the interaction between systems, which single upstream failure caused this cascade of problems. It's like being in a maze of information without a map to get out.

This extremely frustrating situation is the norm in the world of modern software development and operations. We gather thousands of metrics, produce colorful charts, and monitor everything we can think of. Yet, when something goes wrong, we are often completely blind about the **why**.

The answer to this crucial problem is called **observability**. It represents one of the most significant paradigm shifts in recent years in the world of software development and operations, pushing us beyond simply knowing *what* is happening to truly understand the *why*.

-----

## The Roots of Observability: From the '60s to Microservices

Observability is not a concept born yesterday. Its roots lie in the 1960s, in the field of industrial automation and control systems theory. Here, the goal was to determine the internal state of a dynamic system by analyzing only its external outputs. In mathematics and control engineering, a system is considered "**observable**" when its internal state can be completely inferred from measurements of its outputs. A classic reference for this definition can be found in the work of **Rudolf Kálmán** on control systems.

This theoretical concept found new life in the software world around 2010. It was exactly the explosion of complexity, particularly with the advent and spread of architectures based on **microservices**, that made the traditional approach insufficient. The problem was no longer just understanding **which** component was broken, but especially understanding the **why** and the **how** that failure manifested itself through a complex network of interactions in a **distributed system**.

-----

## The Paradigm Shift: From Incomplete Maps to Maze Navigation

### Why Modern Systems Are Different

The reasons that have made observability an indispensable necessity are mainly two:

**1. More Complex Software Architectures: Distributed Systems**
We no longer have the old familiar monoliths, but a dynamic web of **microservices**, serverless functions, message queues, API gateways, service meshes. This is the heart of **distributed systems**: applications composed of autonomous components that communicate with each other, often asynchronously, through the network. Each single request can traverse dozens of different services, each with its own dependencies and potential failure points. The error surface has multiplied exponentially, making debugging a real journey through a maze, where the cause of a problem is never isolated in a single component.

**2. Dynamic Execution Environments**
Applications no longer run on a single fixed server, but on dynamic cloud infrastructures that scale automatically. Containers that are born and die, nodes that are created and destroyed, load balancers that redistribute traffic. The infrastructure itself has become ephemeral and unpredictable. What runs on server A today, tomorrow could be on server Z, or may no longer exist at all, making problem localization extremely difficult with traditional tools.

### Monitoring vs Observability: The Crucial Difference

Understanding the difference between **traditional monitoring** and **observability** is fundamental to embracing this new approach:

**Traditional Monitoring**
It's like having indicator lights on a car dashboard. It alerts you when something you *know* to check is outside predefined parameters. It is primarily a **reactive** approach that answers the question: "Has something happened that I know about and for which I set an alarm?"

Characteristics of monitoring:

  * Based on **predefined metrics** and **structured logs** that you expect to want to check.
  * **Thresholds** and **alerts** configured a priori for known conditions.
  * Effective for known, recurring, and easily predictable problems.
  * **Limited** in the ability to discover new *failure modes* or unexpected behaviors, especially in distributed systems where interactions are complex.

**Observability**
It is the ability to ask questions you never thought you'd need to ask, allowing you to explore unknown problems and understand unexpected behaviors. It is an **exploratory** and **proactive** approach that answers the question: "What's happening and **why**?"

Characteristics of observability:

  * Relies on **rich and contextualized data** that allows for thorough investigation.
  * Offers the ability to **drill-down** and **correlate** between different data sources, essential for following the flow in a distributed environment.
  * Allows the **discovery of unexpected patterns** and identification of the **root cause** of problems never seen before.
  * Essential for **debugging** of **complex distributed systems**.

It's crucial to understand that monitoring **is not replaced** by observability; rather, observability **extends and enhances** it.

> Monitoring tells you there's a problem; observability helps you understand why.

-----

## The Three Pillars of Observability

Observability is based on three fundamental pillars, often called "telemetry signals", which together create a complete view of system behavior. These pillars are the foundations on which to build the ability to explore and understand:

### 1\. Metrics

**What they are**: **Numerical data** aggregated and collected over time that describes the quantitative trend of the system. They represent the "**what** is happening" in consolidated and high-efficiency form. They are useful for getting an overview of the health of a **specific service** within a distributed system, such as API throughput or database latency.

**Practical examples**:

  * **Number of HTTP requests** per second (throughput)
  * **Average response time** or percentile of APIs (latency)
  * **CPU and memory usage** of servers or containers
  * **Error rate** (e.g. 5xx) by endpoint or service
  * **Business metrics** (e.g. conversions, revenue, active users)
  * **Queue lengths** in messaging systems

**When to use them**:

  * Create executive and operational **dashboards** for a quick overview.
  * Analyze long-term **trends** and identify anomalies.
  * Configure **alerts** on predefined thresholds for known problems.
  * Support **capacity planning** and scaling decisions.
  * Monitor **SLA** (Service Level Agreement).

**Advantages**:

  * **Storage efficiency** (pre-aggregated data).
  * Perfect for **trend analysis** and time series visualization.
  * Ideal for **automatic alerting** and deviation detection.
  * **Low network overhead** once aggregated.

**Limitations**:

  * **Lose detail** of individual transactions or events.
  * Difficult to correlate directly with specific events **without additional context**, especially in a **distributed environment** where a problem on one metric may be caused by another upstream service.
  * Don't explain the "why" of an anomaly, but only that it occurred.

### 2\. Logs

**What they are**: **Textual information** (or structured) that records discrete and specific events that occurred within the system. They represent the "**what happened**" with maximum detail for a given moment. In a **distributed system**, logs from a single service provide an internal view of that specific component.

**Practical examples**:

```
2024-07-29 10:30:45 INFO [OrderService] User_id:67890 Order_id:12345 created
2024-07-29 10:30:46 ERROR [PaymentService] User_id:67890 Order_id:12345 Payment failed: Invalid card number, GatewayResponse: "Card expired"
2024-07-29 10:30:46 WARN [OrderService] User_id:67890 Order_id:12345 cancelled due to payment failure
2024-07-29 10:30:47 INFO [NotificationService] User_id:67890 Sending failure notification for Order_id:12345
```

**Types of logs**:

  * **Application logs**: Business logic and application flow events.
  * **Access logs**: Records of incoming/outgoing HTTP requests, database queries.
  * **System logs**: Events of the operating system or underlying infrastructure.
  * **Security logs**: Access, intrusion attempts, permission changes.
  * **Audit logs**: Records of changes to sensitive data or critical actions.

**When to use them**:

  * Investigate **specific problems** and **debug** code.
  * Trace the step-by-step **execution flow** of an application.
  * Perform **forensic analysis** and **security audits**.
  * Understand the **detailed internal behavior** of an application.

**Best Practices for Logs**:

  * **Structured logging**: Use machine-readable formats (e.g. JSON) instead of free text, to facilitate analysis and searching. This is a concept widely supported in the community, for example by articles such as those on [Elastic Common Schema (ECS)](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html) that promote standardization of fields in logs.
  * **Consistent formatting**: Standardize timestamps, log levels and common fields.
  * **Contextual information**: Always include relevant information such as `user_id`, `request_id`, `session_id`, `trace_id` and `span_id` (if available) for correlation, especially crucial when a user interacts with different **distributed services**.
  * **Appropriate log levels**: Use standard levels (DEBUG, INFO, WARN, ERROR, FATAL) consistently.
  * **No sensitive data**: Avoid logging passwords, tokens, personal data or other sensitive information.

### 3\. Distributed Tracing

**What they are**: The **complete path of a single request** or transaction as it traverses all services and components of a **distributed system**. They represent the "**how** a process end-to-end occurred", showing dependencies and latency of each step. Tracing is **essential for distributed systems**, as it provides visibility into how a single operation flows through multiple components.

**Practical example** of an e-commerce checkout in a distributed system:

```
Trace ID: abc123-def456-ghi789
└─ Frontend Request (200ms total)
   ├─ Auth Service Validation (20ms)
   ├─ Cart Service GetItems (15ms)
   ├─ Order Service CreateOrder (150ms)
   │  ├─ Inventory Service CheckStock (30ms)
   │  ├─ Payment Service ProcessPayment (100ms) ← ERROR HERE
   │  │  ├─ Card Validation (20ms)
   │  │  └─ Bank API Call (80ms) ← TIMEOUT
   │  └─ Notification Service SendEmail (20ms)
   └─ Frontend Render Response (15ms)
```

**Key tracing concepts**:

  * **Trace**: The entire end-to-end execution of a request or operation across all **distributed services** involved.
  * **Span**: A single logical operation within a trace (e.g. an API call, a database query, function processing). Each span has a name, start and end time, and attributes.
  * **Parent-Child relationships**: Spans are organized hierarchically to show the relationship between operations (e.g. a microservice call is a "child" of the main request span). This is vital for understanding dependencies in a **distributed environment**.
  * **Span attributes**: Key-value pairs that provide contextual metadata to a span (e.g. `http.method`, `db.statement`, `user_id`, `product_id`).
  * **Trace context**: A set of identifiers (`trace_id` and `span_id`) that are propagated between services to maintain correlation of the entire transaction. This concept is the basis of standards like [W3C Trace Context](https://www.w3.org/TR/trace-context/) that ensure interoperability between different tracing tools.

**When to use them**:

  * Identify **bottlenecks** and slowdowns in slow requests that traverse **multiple services in a distributed system**.
  * Follow and **debug errors** that propagate through **complex distributed systems**.
  * Understand **dependencies** and actual interactions between services.
  * **Optimize end-to-end performance** and user-perceived latency.
  * Analyze the **customer journey** through the application, even when it traverses numerous microservices.

**Advantages of Distributed Tracing**:

  * **Complete visibility** on request flows in distributed architectures, something that metrics and logs alone cannot offer.
  * Precise and rapid **root cause analysis**, identifying exactly which service or internal call caused a problem.
  * Understanding of **end-to-end performance** and identification of the slowest services.
  * Detection of **single points of failure** or unexpected dependencies between distributed components.

-----

## The Lifecycle of Observability: Collect - Monitor - Analyze

To fully exploit the potential of observability, it is fundamental to understand its **lifecycle**, which can be synthesized in three interconnected phases: **Collect (Collect), Monitor (Monitor) and Analyze (Analyze)**.

### 1\. Collect (Collect Data)

This is the initial phase, where the system is **instrumented** to produce telemetry data (metrics, logs, trace). It's the moment when you decide "what" and "how" to collect.

  * **Instrumentation**: Code portions are added to the application (or agents/sidecars are used) to generate the three telemetry signals. In a **distributed system**, this means not only instrumenting each service individually, but also ensuring that the **trace context** is properly propagated between service calls.
  * **Data Collection**: Once the application produces the data, it must be collected efficiently. Agents or SDKs are often used that send the data to a collector or directly to an observability backend.
  * **Standardization**: It's crucial to adopt standards (e.g. for log formatting or trace context propagation) to ensure that data is consistent and easily correlatable, regardless of the service that generates it and the platform on which it resides in a distributed environment.

*Goal*: Have a continuous and reliable flow of raw and structured data that describes the internal state and behavior of the system.

### 2\. Monitor (Monitor and Alert)

In this phase, the collected data is transformed into useful information for **real-time system status awareness** and **proactive problem detection**.

  * **Aggregation and Visualization**: Metrics are aggregated and displayed in meaningful dashboards, providing a clear overview of performance and health. Logs are indexed for quick searches. Traces are visualized as dependency graphs or time sequences. These visualizations are fundamental for understanding the global state of a **distributed system**, going beyond the single service.
  * **Alerting**: Alert rules are configured based on thresholds (for metrics) or specific patterns (in logs and traces). Alerts inform teams when something is wrong or about to go wrong, allowing for timely intervention. A practical example of how metrics are used for alerts can be found in [Google SRE best practices](https://sre.google/sre-book/practical-alerting/) on system reliability.
  * **Trend Analysis**: Historical data is used to identify long-term trends, predict future problems (e.g. resource exhaustion), and guide capacity planning.

*Goal*: Be constantly aware of the system's health, detect anomalies, and receive quick notifications to intervene before problems worsen or significantly impact users.

### 3\. Analyze (Analyze and Debug)

This is the deepest phase of observability, where collected and correlated data is used to **understand the root cause** of a problem and **optimize the system**. It's the "exploratory" phase par excellence.

  * **Correlation**: This is the heart of analysis. Metrics, logs, and traces are linked together using common identifiers (such as the `trace_id`). For example, a spike in errors in metrics may lead to investigating the corresponding traces to find the specific failing service, and from there, analyzing the detailed logs of that service to understand the exact cause. This capability is **indispensable in distributed systems**, where a problem may manifest in one place but originate elsewhere, cascading.
  * **Drill-down**: The detail of the data is explored increasingly deeper. From the aggregated view of metrics, we move to specific traces, down to individual events in logs.
  * **Debugging and Root Cause Analysis (RCA)**: In-depth analysis allows identifying exactly "why" a problem occurred, rather than just "what" broke. This leads to more effective solutions and prevention of similar future incidents.
  * **Optimization**: Insights obtained from analysis can guide performance optimization decisions, code refactoring, or architecture improvements.

*Goal*: Transform data into actionable knowledge, allowing teams to solve problems faster, proactively improve system stability and performance, and make data-driven decisions.

The **Collect -> Monitor -> Analyze** cycle is iterative. Insights obtained in the analysis phase can lead to improving the collection phase (e.g. adding new metrics or logs for greater context), or refining alerts in the monitoring phase. It is a continuous process of improvement and understanding.

-----

## The Magic of Correlation

The true power of observability emerges when we connect these three elements together. This process is called **correlation** and it's what transforms raw data into actionable insights, allowing us to move from a detected anomaly to a deep understanding of its root cause. In **distributed systems**, correlation is the key to untangling complexity and identifying the source of a problem that propagates between different services.

### Practical Scenario: Debugging an Anomaly in a Distributed System

Imagine facing a problem in production:

1.  **Detection with Metrics**: The operational dashboard shows a sudden and significant increase in **P99 latency** (99th percentile of response time) in the checkout API. Metrics tell you: "There's a significant performance problem."
2.  **Drill-down with Tracing**: From the anomalous metric data point, you access the **distributed traces** of those slow transactions. Here you quickly identify that 95% of problematic traces spend a disproportionate amount of time in the `PaymentService`, particularly in the `span` that calls an external banking gateway. Tracing tells you: "The `PaymentService` and the external bank call are the bottleneck."
3.  **Investigation with Logs**: Using the `trace_id` and `span_id` extracted from the trace, you filter the **detailed logs** of the `PaymentService` for that period and those specific transactions. In the logs, you find numerous "timeout" or "rate limit exceeded" errors coming from calls to the banking gateway. Logs tell you: "The cause of the problem in the `PaymentService` is a timeout/rate limiting error with the bank."
4.  **Root Cause Identified**: You conclude that the banking gateway has introduced new rate limiting policies that were not anticipated or properly handled by our retry policies.

This correlation workflow allows moving from "there's a problem" to "here's what to do to fix it" in minutes rather than hours or days, drastically reducing **MTTR (Mean Time To Recovery)**.

### Tools for Correlation

The ability to correlate data depends heavily on the **consistency** with which it is instrumented and collected throughout the **distributed system**.

  * **Trace-Log Correlation**: Obtained by including the appropriate `trace_id` and `span_id` in each log line. This allows you to "jump" directly from a span in a trace to the detailed logs generated during that span's execution.

    ```python
    # Example of trace-correlated log in a distributed system
    {
      "timestamp": "2024-07-29T10:30:45Z",
      "level": "ERROR",
      "message": "Payment processing failed",
      "trace_id": "abc123-def456-ghi789", # ID of the end-to-end transaction that spans services
      "span_id": "payment-span-001",    # ID of the specific operation in the PaymentService
      "user_id": "user-67890",
      "order_id": "12345",
      "service_name": "PaymentService", # Added for clarity in distributed context
      "error_code": "GATEWAY_TIMEOUT"
    }
    ```

  * **Metric-Trace/Log Correlation**: Many observability tools allow you to "link" a point on a metric chart to a list of traces or logs that correspond to that period and/or that service. For example, clicking on a latency spike might redirect you to a view showing the 10 slowest traces of that moment.

-----

## The Evolution of Systems: Complexity vs. Observability

### The Complexity Curve

As systems evolve, their complexity grows in a non-linear way. We have moved from relatively simple paradigms to intricate ecosystems:

**Monolith** → **SOA (Service-Oriented Architecture)** → **Microservices** → **Serverless** → **Edge Computing**

Each step has exponentially increased:

  * The **number of components** and services, each potentially a node in a **distributed system**.
  * The **interactions** and dependencies between components, often network transactions.
  * The **error surface** and failure points, which are no longer isolated but can have cascading effects.
  * The **difficulty of debugging** and understanding the system as a whole.

### Observability as a Strategic Enabler

Observability is not just a reactive debugging tool, but a fundamental **strategic enabler** that allows organizations to thrive in the era of **distributed systems**. It provides critical capabilities that translate into competitive advantages:

**Development Velocity**:

  * Enables **more frequent deployments** with greater confidence, knowing you can quickly detect and resolve any problems even in an environment with multiple services.
  * Facilitates **rapid and informed rollbacks** when something goes wrong.
  * Encourages **safe experimentation** with new features through feature flags, being able to monitor the impact on various **distributed services** immediately.

**Reliability**:

  * Allows **proactive detection** of problems and anomalies before they seriously impact users.
  * **Drastically reduces MTTR** (Mean Time To Recovery), minimizing downtime. This is a key concept of [DevOps and SRE](https://www.google.com/search?q=https://www.atlassian.com/devops/frameworks/devops-metrics/mean-time-to-recovery-mttr).
  * Helps prevent **cascading failures** (cascading failures) by isolating the root cause before it spreads through the dependencies of **distributed systems**.

**Performance**:

  * Enables **scientific identification** of bottlenecks and inefficiencies, based on concrete data.
  * Guides **optimization** of resources and architecture to maximize efficiency.
  * Supports accurate **capacity planning**, predicting future resource needs.

**Business Intelligence**:

  * Provides **deep understanding of user behavior** and their journey within the application, even when it traverses multiple **distributed services**.
  * Allows measuring the **direct impact of new features** on business KPIs.
  * Enables **data-driven** decision-making, based on real insights from user-system interactions.

-----

## Challenges in Implementing Observability

Adopting observability is a path that presents significant but surmountable challenges, ranging from data management to cultural change. This is particularly true for **distributed systems**, given their inherent complexity.

### 1\. Data Volume (The Firehose Problem)

Modern systems, especially **distributed** ones, can produce **enormous amounts of telemetry data**. Every interaction between services, every event in an ephemeral container generates data. This constant flow of information can lead to:

  * **Prohibitive costs** of storage, ingestion, and processing.
  * A low **signal-to-noise ratio**, making it difficult to identify relevant information among the volume of data.

**Solutions**:

  * **Intelligent sampling**: It's not always necessary to collect 100% of all data. Every error can be captured and a sample (e.g. 10%) of successful transactions can be taken.
  * **Upstream aggregation**: Pre-calculate common metrics or aggregate logs before final ingestion.
  * **Differentiated retention policies**: Retain detailed data for a shorter period (e.g. days) and aggregated or sampled data for longer periods (e.g. months/years).
  * **Optimized storage architectures**: Use multi-tier storage solutions (e.g. hot storage on SSD for recent data, cold storage on object storage for historical data).

### 2\. Performance Overhead

Instrumentation of applications can introduce certain **overhead** in terms of performance. In **distributed systems**, this overhead can add up along the call chain:

  * **Additional latency** for each instrumented operation.
  * **Memory overhead** for buffering telemetry data.
  * **CPU utilization** for serialization and data processing.
  * **Network bandwidth** for data transmission.

**Mitigation**:

  * **Asynchronous collection**: Data collection and transmission operations should not block the business logic execution path.
  * **Batching**: Group telemetry data into batches before sending to reduce the number of network calls.
  * **Circuit breakers and fallback**: Temporarily disable collection in case of system overload to avoid cascading effects.
  * **Resource limits**: Configure and monitor memory and CPU usage by agents or instrumentation libraries.

### 3\. Cardinality Explosion

A common problem, especially with metrics, is **cardinality explosion**. This occurs when too many unique combinations of labels (tags) are created for a metric, exponentially increasing the data to store and analyze. In **distributed systems**, this is amplified by the number of services, service versions, and instances that can contribute to the metrics.

```python
# BAD Example: High cardinality in a distributed system
# user_id and session_id are almost always unique and would create too many distinct time series
# Imagine this on hundreds of different services.
counter.inc(labels={"user_id": user_id, "session_id": session_id, "service_name": "UserService", "instance_id": "user-service-ab23c"})

# GOOD Example: Controlled cardinality for distributed system metrics
# user_type and region have a limited number of predefined values
counter.inc(labels={"user_type": "premium", "region": "eu-west", "service_name": "UserService", "env": "prod"})
```

  * **Solution**: Prefer attributes with low or medium cardinality for metrics. Move high-cardinality identifiers (like `user_id` or `order_id`) to logs or traces, where the single context is fundamental and doesn't impact time series storage.

### 4\. Cultural Change

Perhaps the biggest challenge is the **change in mindset** and processes that observability requires. This is crucial for the adoption's success in any organization managing **distributed systems**.

  * **Shift-left**: You must start thinking about observability during the **design** and development phase of software, not as an afterthought after deployment. This includes designing APIs that facilitate trace context propagation.
  * **Blameless culture**: Promote a culture that focuses on **learning from system failure**, rather than seeking a scapegoat. Observability thrives in environments where problems are seen as opportunities for improvement. A famous example of adoption of blameless post-mortem culture can be found in [Google Site Reliability Engineering](https://sre.google/sre-book/postmortem-culture/).
  * **Data-driven debugging**: Encourage developers and operators to rely on **concrete data** provided by telemetry, rather than intuition or assumptions. This is particularly true when seeking root causes in a distributed system.
  * **Proactive monitoring**: Shift focus from simply reacting to alerts to actively searching for anomalies and understanding system behavior before serious problems manifest.

-----

## Best Practices for Observability

Implementing observability effectively requires a structured and intentional approach.

### 1\. Design for Observability

Integrating observability from the early stages of development is crucial:

  * **Instrument Early**: Add instrumentation during code development, not as a post-deploy activity. Think about observability during architecture and API design, especially for how **distributed services** will interact.
  * **Meaningful Names**: Use clear and descriptive names for metrics, logs, and spans that unequivocally indicate what they are measuring or recording.
  * **Consistent Tagging**: Define a standardized tag (attribute) schema for all **services of the distributed system**, facilitating correlation and cross-analysis.
  * **Business Metrics**: Don't limit yourself to technical metrics; include business KPIs (Key Performance Indicators) that connect technical performance to business value (e.g. number of conversions, order completion time).

### 2\. Progressive Implementation

Don't attempt to implement everything at once. Adopt a gradual approach:

  * **Start Simple**: Begin with auto-instrumentation to get basic metrics and traces and structured logging.
  * **Add Context**: Progressively add custom attributes and business context to your telemetry signals, extending them to all **relevant services**.
  * **Correlate Data**: Actively link metrics, logs and traces together, investing in tools that facilitate this correlation, essential for **distributed systems**.
  * **Optimize**: Once you have a robust data flow, focus on optimizing costs, performance, and relevance of collected data.

### 3\. Governance and Standards

To ensure scalability and maintainability, it's fundamental to establish clear guidelines:

  * **Naming Conventions**: Implement naming conventions for metrics, logs and spans to ensure uniformity between teams and different **distributed services**.
  * **Retention Policies**: Define clear policies on how long to keep telemetry data and where to archive it (e.g. detailed data on hot storage, aggregates on cold storage).
  * **Access Control**: Manage who can access observability data, especially if it contains sensitive information.
  * **Cost Management**: Actively monitor and manage costs associated with collection, storage, and analysis of telemetry data.

-----

## Conclusions: Observability as a Superpower for Distributed Systems

Observability represents a fundamental paradigm shift in how we understand and manage **modern software systems, and especially distributed ones**. It's not just about collecting more data, but about transforming that data into **actionable insights** that allow:

  * **Drastically reduce** problem resolution times, even when these span multiple **distributed services**.
  * **Proactively prevent** failures before they impact users.
  * **Optimize performance** based on concrete data, not intuition.
  * **Improve the experience** of both developers and end users.

### Impact on Developer Experience

Perhaps the most underestimated benefit of modern observability is the positive impact on **Developer Experience**. Developers working on **distributed systems** no longer have to:

  * Memorize complex architectures and hidden dependencies between dozens of microservices.
  * Debug blindly with simple `print statement` or search through thousands of lines of unstructured logs, hoping to manually correlate scattered events between services.
  * Continuously escalate problems to other teams without having tools to independently investigate the flow of an operation between services.
  * Work in stressful "war room" sessions during incidents, without a clear view of what's happening and which service is truly responsible.

Instead, thanks to adequate observability, they can:

  * **Quickly understand** unknown or complex systems by visualizing request paths.
  * **Autonomously resolve** most problems, reducing interruptions and dependencies between teams.
  * **Experiment with confidence**, knowing they can monitor and, if needed, rollback changes based on real data about the entire system's impact.
  * **Focus on creating value** for the business, rather than dedicating excessive time to inter-service troubleshooting.

Observability thus becomes a **force multiplier** that amplifies the capabilities of every developer and team, allowing them to build more robust, performant, and understandable **distributed systems**.
