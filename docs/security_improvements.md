# Part 8 – Security Improvements Document

This document compares the security posturing of the legacy C++ console application with the modern re-engineered MERN stack system, detailing the defense-in-depth security mechanisms implemented.

---

## 1. Security Posture Comparison Matrix

| Security Feature | Legacy C++ flat files | Modern MERN Stack |
| :--- | :--- | :--- |
| **Authentication** | **None**. Executable opens direct prompt. | **JWT (JSON Web Token)**, signed with cryptographically secure secret. |
| **Authorization / RBAC** | **None**. Any user can delete patient database. | **Role-Based Access Control** (`admin` vs `staff`). |
| **Data Encryption** | **Plaintext**. TXT files on disk readable by anyone. | **Hashed password storage** (bcrypt), secure Atlas connection. |
| **Injection Defense** | **Vulnerable**. Pipe (`|`) in inputs corrupts database. | **Sanitized queries** via Mongoose schemas and strict validation. |
| **Rate Limiting** | **None**. Infinite executions allowed. | **Rate-limiter** configured at 100 requests per 15 minutes. |
| **Network Security** | **Local only** (or raw network share file locking). | **CORS** origin control and secure HTTPS protocol. |
| **Audit Trails** | **None**. No log of who added or modified records. | **Automated Logging** of system operations via Morgan & Winston. |

---

## 2. Key Security Enhancements Implemented

### 2.1 Password Hashing with Bcrypt
All user passwords are encrypted using a one-way cryptographic hash function (`bcrypt`) with a salt complexity rating of 12. Plaintext passwords never enter the database.
```javascript
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

### 2.2 JWT Authentication & Role-Based Access Control (RBAC)
* Access tokens are generated with 30-day expiries, validating each incoming API request.
* Middleware enforces role authorization (`admin` vs `staff`). For example, only users with the `admin` role can send `DELETE` requests to delete patients or doctors.

### 2.3 Express Rate Limiting & Helmet Headers
* **Rate Limiter**: Mitigates brute-force authentication attacks and Denial of Service (DoS) by limiting IPs to 100 requests every 15 minutes.
* **Helmet**: Secures Express apps by setting various HTTP headers (e.g., XSS Protection, Frameguard to prevent clickjacking, HSTS for transport security).

### 2.4 CORS Configuration
Cross-Origin Resource Sharing is locked down to whitelist only the domain of the React client interface, blocking malicious requests initiated from external origins.
