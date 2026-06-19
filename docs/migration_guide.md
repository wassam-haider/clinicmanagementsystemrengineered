# Part 4 – Database Re-engineering & Migration Guide

This guide details the process of migrating 200,000+ records (50,000+ each for Patients, Doctors, Appointments, and Prescriptions) from legacy pipe-delimited flat files to MongoDB.

---

## 1. Schema Mapping & Structural Transformation

### 1.1 Patients
* **Legacy Flat File**: `P00001|Ayesha Rizvi|22|Male|03091002396`
* **Mongoose Model**:
  ```javascript
  {
    patientId: "P00001",    // String (Index, Unique)
    name: "Ayesha Rizvi",   // String (Trimmed)
    age: 22,                // Number (Validator: >= 0)
    gender: "Male",         // String (Enum: Male/Female/Other)
    phone: "03091002396"    // String (Regex validated length 10-15)
  }
  ```

### 1.2 Doctors
* **Legacy Flat File**: `D00001|Nargis Shehzad|Endocrinology`
* **Mongoose Model**:
  ```javascript
  {
    doctorId: "D00001",           // String (Index, Unique)
    name: "Nargis Shehzad",       // String
    specialization: "Endocrinology" // String
  }
  ```

### 1.3 Appointments
* **Legacy Flat File**: `A00001|P05512|D06521|2026-12-01|15:00`
* **Mongoose Model**:
  ```javascript
  {
    appointmentId: "A00001", // String (Index, Unique)
    patientId: "P05512",     // String (Legacy Match key)
    patient: ObjectId("..."),// Ref: 'Patient' (Resolved from cache)
    doctorId: "D06521",      // String (Legacy Match key)
    doctor: ObjectId("..."), // Ref: 'Doctor' (Resolved from cache)
    date: "2026-12-01",      // String
    time: "15:00",           // String
    dateTime: ISODate("2026-12-01T15:00:00Z") // Index (Date Object for queries)
  }
  ```

### 1.4 Prescriptions
* **Legacy Flat File**: `PR00001|P09662|Hydrochlorothiazide`
* **Mongoose Model**:
  ```javascript
  {
    prescriptionId: "PR00001", // String (Index, Unique)
    patientId: "P09662",       // String (Legacy Match key)
    patient: ObjectId("..."),  // Ref: 'Patient' (Resolved from cache)
    medicine: "Hydrochlorothiazide" // String
  }
  ```

---

## 2. ETL Architecture
The migration uses a memory-efficient stream-based ETL pipeline written in Node.js.

```
+-------------------------------------------------------------+
|                          EXTRACT                            |
|  Read legacy files line-by-line using fs.createReadStream   |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                         TRANSFORM                           |
|  * Clean white spaces, convert ages/dates                   |
|  * Normalize genders to enum (Male/Female/Other)             |
|  * Validate fields. Invalid rows logged to error log        |
|  * Resolve Patient/Doctor IDs to MongoDB ObjectIds via cache|
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                            LOAD                             |
|  * Bulk write in batches of 5000 records                    |
|  * Retry failed DB operations with exponential backoff     |
+-------------------------------------------------------------+
```

---

## 3. How to Run the Migration

1. Configure environment variables in `backend/.env` (specifically `MONGO_URI`).
2. Verify that the legacy text files (`patients.txt`, `doctors.txt`, `appointments.txt`, `prescriptions.txt`) are in the root directory.
3. Open a terminal in `etl/` directory.
4. Run:
   ```bash
   npm install
   npm run migrate
   ```

---

## 4. Post-Migration Verification Checks
After running the script, verify correct load counts via MongoDB shell or Compass:
```javascript
// Verification Commands in Mongo Shell:
db.patients.countDocuments()       // Should equal 50001
db.doctors.countDocuments()        // Should equal 50000
db.appointments.countDocuments()   // Should equal 50000
db.prescriptions.countDocuments()  // Should equal 50000
```
Review `etl/migration_errors.log` to audit any skipped records with bad or incomplete data formats.
