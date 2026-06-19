# Part 1 – Legacy Architecture & Reverse Engineering Documentation

## 1. Legacy Architecture Documentation
The legacy Clinic Management System (v1.0) is a monolithic, single-threaded desktop console application developed in procedural C++. 

### 1.1 Structural Overview
* **Programming Paradigm**: Procedural C++ utilizing `struct` objects for data representations (Patient, Doctor, Appointment, Prescription) without OOP principles like encapsulation, inheritance, or polymorphism.
* **User Interface**: Console-based, menu-driven CLI using standard input/output (`std::cin`, `std::cout`).
* **Persistence Layer**: Sequential, pipe-delimited flat text files (`patients.txt`, `doctors.txt`, `appointments.txt`, `prescriptions.txt`) stored directly on the local filesystem.
* **Database Driver**: Hand-rolled file I/O operations using `<fstream>` (`ifstream` for sequential scanning and reading, `ofstream` for appending and rewriting files).

### 1.2 Data Flow Diagram (DFD) - Level 0 & Level 1
```mermaid
graph TD
    User([Clinic Staff / Admin]) -->|CLI Commands & Inputs| App[C++ Console Application]
    App -->|File Reads/Writes| Files[(Flat Text Files Database)]
    Files -->|Loaded Records| App
    App -->|Console Output| User
```

#### Level 1 DFD: Detailed Process Flows
```mermaid
flowchart TD
    User([Clinic Staff / Admin]) -->|1. Select Menu Choice| Menu{Main Menu Loop}
    Menu -->|Choice 1| PM[Patient Module]
    Menu -->|Choice 2| DM[Doctor Module]
    Menu -->|Choice 3| AM[Appointment Module]
    Menu -->|Choice 4| RM[Prescription Module]
    
    PM -->|Add / View / Search / Delete| PFile[(patients.txt)]
    DM -->|Add / View / Search| DFile[(doctors.txt)]
    AM -->|Book / View| AFile[(appointments.txt)]
    RM -->|Add / View| RFile[(prescriptions.txt)]
```

---

## 2. Legacy Entity-Relationship (ER) Diagram
The legacy database consists of implicit associations implemented via primary key string matchings. No foreign key constraints, cascading deletes, or referential integrity validations are supported at the persistence level.

```mermaid
erDiagram
    Patient {
        char id PK "P00001"
        char name "Ayesha Rizvi"
        int age "22"
        char gender "Male"
        char phone "03091002396"
    }
    Doctor {
        char id PK "D00001"
        char name "Dr Asad"
        char specialization "Cardiology"
    }
    Appointment {
        char id PK "A00001"
        char patientId FK "P05512"
        char doctorId FK "D06521"
        char date "2026-12-01"
        char time "15:00"
    }
    Prescription {
        char id PK "PR00001"
        char patientId FK "P09662"
        char medicine "Hydrochlorothiazide"
    }

    Patient ||--o{ Appointment : "books"
    Doctor ||--o{ Appointment : "attends"
    Patient ||--o{ Prescription : "receives"
```

---

## 3. Legacy Database Analysis
Data is persisted in flat files using pipe-delimited values (`|`) and carriage-return/newline terminators.

* **patients.txt Format**: `[PatientID]|[Name]|[Age]|[Gender]|[Phone]`
  * Example: `P00001|Ayesha Rizvi|22|Male|03091002396`
* **doctors.txt Format**: `[DoctorID]|[Name]|[Specialization]`
  * Example: `D00001|Nargis Shehzad|Endocrinology`
* **appointments.txt Format**: `[AppointmentID]|[PatientID]|[DoctorID]|[Date]|[Time]`
  * Example: `A00001|P05512|D06521|2026-12-01|15:00`
* **prescriptions.txt Format**: `[PrescriptionID]|[PatientID]|[MedicineName]`
  * Example: `PR00001|P09662|Hydrochlorothiazide`

---

## 4. Architecture Limitations & Issues

### 4.1 Scalability Issues
* **Linear Time Complexity (O(N)) Searches**: To find a record (e.g., patient, doctor), the legacy program opens the file and reads it line-by-line from the beginning until a match is found. For 50,000+ records, this takes seconds and scales linearly.
* **Memory Limits**: The application does not support indexing, paging, or partial updates. Any table listings read the entire file sequentially, placing severe strain on I/O operations and CPU when files grow large.
* **Disk I/O Bottlenecks**: Deleting records requires reading the entire source file, filtering out the deleted row, writing everything else to a temporary file, deleting the original file, and renaming the temporary file. This is highly inefficient.

### 4.2 Maintainability Issues
* **Procedural Code Spaghetti**: Business logic, file parsing, formatting, and UI rendering are tightly coupled in monolithic functions.
* **No Unit Testing Support**: There are no tests, and code cannot be easily refactored without introducing regressions.
* **Hardcoded Constraints**: Buffers are defined with hardcoded array sizes (`MAX_LEN 100`, `NAME_LEN 60`, etc.), making the system prone to buffer overflows if inputs exceed constraints.

### 4.3 Security Issues
* **Zero Authentication / Authorization**: The console executable runs directly, allowing anyone with local access to read, modify, or delete the patient database.
* **Plaintext Storage**: All patient names, phone numbers, and clinical prescriptions are saved in raw text on disk, directly violating medical data privacy standards (HIPAA, GDPR).
* **Injection Vulnerabilities**: Pipe characters (`|`) in patient names or telephone fields corrupt the structure of the database files, causing columns to shift.

### 4.4 Concurrency Issues
* **No File Locking**: If two clinic terminals attempt to append to `appointments.txt` simultaneously, data corruption, write conflicts, or data loss will occur.
