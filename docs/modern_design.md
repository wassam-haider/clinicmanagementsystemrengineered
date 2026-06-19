# Part 2 - Modern Enterprise Architecture Design

The modern system is designed as a three-tier, web-based enterprise application built on the MERN (MongoDB, Express, React, Node) stack. It features schema validation, centralized middleware control, role-based access controls, and production-ready APIs.

---

## 1. High-Level Architecture Diagram
The architecture consists of a decoupled frontend client communicating with a REST API backend, backed by MongoDB.

```mermaid
graph TD
    Client[React SPA - Vite] -->|HTTPS REST API Calls| Gateway[API Router / Express]
    subgraph Express Backend
        Gateway --> AuthMW[Auth & RBAC Middleware]
        AuthMW --> Controllers[Controllers Layer]
        Controllers --> Models[Mongoose Schema Models]
    end
    Models -->|TCP / Mongoose Driver| DB[(MongoDB database)]
```

---

## 2. Component Diagram
Details the key software components and modules within the modern architecture.

```mermaid
graph TD
    subgraph Frontend Components
        UI[Presentation Dashboard Views]
        Fetch[HTTP Client]
    end

    subgraph Backend Components
        AppJS[Express App]
        Routes[Auth / Entity Router]
        Ctrl[Controllers]
        Mongoose[Mongoose ODM]
    end

    UI --> Fetch
    Fetch -->|REST API Request| AppJS
    AppJS --> Routes
    Routes --> Ctrl
    Ctrl --> Mongoose
    Mongoose -->|Query| DB[(MongoDB)]
```

---

## 3. Deployment Diagram
Illustrates a modern Dockerized deployment model with reverse proxying and automated scaling.

```mermaid
graph TD
    User([End User Browser]) -->|Port 80/443| Nginx[Nginx Reverse Proxy]

    subgraph Target Host Server
        Nginx -->|Proxy Pass http://localhost:5173| Vite[Vite Frontend]
        Nginx -->|Proxy Pass http://localhost:5000| NodeContainer[Express Backend]

        subgraph MongoDB Cluster
            NodeContainer -->|Port 27017| Mongo[(MongoDB Instance)]
        end
    end
```

---

## 4. Sequence Diagrams

### 4.1 Authentication Flow (Login)
```mermaid
sequenceDiagram
    autonumber
    actor User as Staff / Admin
    participant Client as React SPA
    participant API as Express API
    participant DB as MongoDB

    User ->> Client: Inputs Email & Password
    Client ->> API: POST /api/auth/login
    API ->> DB: FindUserByEmail(email)
    DB -->> API: Return User Profile & Hash
    API ->> API: Verify Password (bcrypt.compare)
    Note over API: Sign JWT Token with UserID & Role
    API -->> Client: Return User Info & JWT Token
    Client ->> Client: Store token for authenticated requests
    Client -->> User: Show dashboard
```

### 4.2 Booking Appointment Flow
```mermaid
sequenceDiagram
    autonumber
    actor Staff
    participant UI as React UI
    participant API as Express API
    participant DB as MongoDB

    Staff ->> UI: Inputs PatientID, DoctorID, Date, and Time
    UI ->> UI: Validate required fields
    UI ->> API: POST /api/appointments with Authorization header
    Note over API: Protect and authorize middleware runs
    API ->> DB: FindPatient(PatientID) and FindDoctor(DoctorID)
    DB -->> API: Return validation records
    API ->> API: Auto-generate appointmentId
    API ->> DB: InsertAppointment(data)
    DB -->> API: Return saved appointment object
    API -->> UI: Return HTTP 201 success JSON
    UI -->> Staff: Show success state and refresh list
```
