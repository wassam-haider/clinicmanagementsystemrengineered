const fs = require('fs');
const path = require('path');
const XLSX = require(path.join(__dirname, 'frontend', 'node_modules', 'xlsx'));

// Paths to test results JSON files
const backendJsonPath = path.join(__dirname, 'backend', 'jest-results.json');
const frontendJsonPath = path.join(__dirname, 'frontend', 'playwright-results.json');
const outputPath = path.join(__dirname, 'Test_Report.xlsx');

console.log('Generating consolidated QA Test Case Execution Report in Excel...');

// Pre-defined metadata mapping for all 44 test cases
const metadataMap = {
  // --- AUTH JEST ---
  'should register a new user successfully': {
    id: 'TC-B-AUTH-01',
    module: 'Authentication (Backend)',
    scenario: 'Verify successful registration of a new user',
    preconditions: 'Database is up; email is not already registered',
    steps: '1. Send POST request to /api/auth/register with name, email, password, and role\n2. Verify response status is 201',
    data: 'Name: "John Doe", Email: "john@test.com", Password: "Password123!", Role: "admin"',
    expected: 'Response code 201; JSON contains token and user object'
  },
  'should reject registration with existing email': {
    id: 'TC-B-AUTH-02',
    module: 'Authentication (Backend)',
    scenario: 'Verify user registration rejection with duplicate email',
    preconditions: 'Email already exists in the database',
    steps: '1. Send POST request to /api/auth/register with duplicate email\n2. Verify response status is 400',
    data: 'Name: "John Doe", Email: "duplicate@test.com", Password: "Password123!"',
    expected: 'Response code 400; Error message "User already exists"'
  },
  'should reject registration when creation fails': {
    id: 'TC-B-AUTH-03',
    module: 'Authentication (Backend)',
    scenario: 'Verify user registration rejection when Mongo db save fails',
    preconditions: 'Mock user model save throws database error',
    steps: '1. Mock save to throw DB error\n2. Send POST to /api/auth/register\n3. Verify response status is 500',
    data: 'User payload details',
    expected: 'Response code 500; Server error logged and handled'
  },
  'should reject registration with invalid fields (e.g. missing name)': {
    id: 'TC-B-AUTH-04',
    module: 'Authentication (Backend)',
    scenario: 'Verify registration rejection with missing fields',
    preconditions: 'Server is running',
    steps: '1. Send POST to /api/auth/register without name\n2. Verify response status is 400',
    data: 'Email: "john@test.com", Password: "Password123!" (Name missing)',
    expected: 'Response code 400; Validation error returned'
  },
  'should login the registered user': {
    id: 'TC-B-AUTH-05',
    module: 'Authentication (Backend)',
    scenario: 'Verify successful user login with valid credentials',
    preconditions: 'User is registered in the database',
    steps: '1. Send POST request to /api/auth/login\n2. Verify response status is 200',
    data: 'Email: "john@test.com", Password: "Password123!"',
    expected: 'Response code 200; JSON contains user token'
  },
  'should reject login with wrong password': {
    id: 'TC-B-AUTH-06',
    module: 'Authentication (Backend)',
    scenario: 'Verify login rejection with invalid password',
    preconditions: 'User exists in the database',
    steps: '1. Send POST request to /api/auth/login with wrong password\n2. Verify response status is 401',
    data: 'Email: "john@test.com", Password: "WrongPassword!"',
    expected: 'Response code 401; Error message "Invalid email or password"'
  },
  'should reject login for non-existent user': {
    id: 'TC-B-AUTH-07',
    module: 'Authentication (Backend)',
    scenario: 'Verify login rejection for non-registered email',
    preconditions: 'Email is not registered in the database',
    steps: '1. Send POST request to /api/auth/login with unregistered email\n2. Verify response status is 401',
    data: 'Email: "unknown@test.com", Password: "Password123!"',
    expected: 'Response code 401; Error message "Invalid email or password"'
  },
  'should get current user profile successfully': {
    id: 'TC-B-AUTH-08',
    module: 'Authentication (Backend)',
    scenario: 'Verify retrieving current logged-in user profile details',
    preconditions: 'User is logged in; auth token is valid',
    steps: '1. Send GET request to /api/auth/me with Bearer token\n2. Verify response status is 200',
    data: 'Headers: { Authorization: "Bearer <token>" }',
    expected: 'Response code 200; JSON contains current user profile info'
  },

  // --- PATIENTS JEST ---
  'should create a new patient when authenticated': {
    id: 'TC-B-PAT-02',
    module: 'Patient Management (Backend)',
    scenario: 'Verify patient creation with valid details',
    preconditions: 'User is authenticated',
    steps: '1. Send POST request to /api/patients with patient details\n2. Verify response status is 201',
    data: 'Name: "Alice", Age: 28, Gender: "Female", Phone: "03001122334"',
    expected: 'Response code 201; JSON contains created patient object'
  },
  'should reject patient creation when the model validation fails': {
    id: 'TC-B-PAT-03',
    module: 'Patient Management (Backend)',
    scenario: 'Verify patient creation fails when invalid data is sent',
    preconditions: 'User is authenticated',
    steps: '1. Send POST request to /api/patients with missing fields\n2. Verify response status is 400',
    data: 'Age: 28 (Name, Gender, Phone missing)',
    expected: 'Response code 400; Validation error messages returned'
  },
  'should get all patients with pagination': {
    id: 'TC-B-PAT-04',
    module: 'Patient Management (Backend)',
    scenario: 'Verify paginated list retrieval of all patients',
    preconditions: 'User is authenticated',
    steps: '1. Send GET request to /api/patients?page=1&limit=10\n2. Verify response status is 200',
    data: 'Query: page=1, limit=10',
    expected: 'Response code 200; JSON contains paginated array of patients'
  },
  'should search patients by name': {
    id: 'TC-B-PAT-05',
    module: 'Patient Management (Backend)',
    scenario: 'Verify searching patients by name keyword',
    preconditions: 'User is authenticated; matching patients exist',
    steps: '1. Send GET request to /api/patients?search=Alice\n2. Verify response status is 200',
    data: 'Query: search="Alice"',
    expected: 'Response code 200; JSON contains filtered array of patients'
  },
  'should get patient by ID': {
    id: 'TC-B-PAT-06',
    module: 'Patient Management (Backend)',
    scenario: 'Verify fetching a single patient record by ID',
    preconditions: 'User is authenticated; patient exists',
    steps: '1. Send GET request to /api/patients/:id\n2. Verify response status is 200',
    data: 'Param: patient ID',
    expected: 'Response code 200; JSON contains single patient details'
  },
  'should update patient demographics successfully': {
    id: 'TC-B-PAT-07',
    module: 'Patient Management (Backend)',
    scenario: 'Verify editing patient demographics details',
    preconditions: 'User is authenticated; patient exists',
    steps: '1. Send PUT request to /api/patients/:id\n2. Verify response status is 200',
    data: 'Param: patient ID, Body: { phone: "03009988776" }',
    expected: 'Response code 200; Patient details updated in DB'
  },
  'should delete patient when user is admin': {
    id: 'TC-B-PAT-08',
    module: 'Patient Management (Backend)',
    scenario: 'Verify admin is able to delete patient record',
    preconditions: 'User is authenticated as Admin; patient exists',
    steps: '1. Send DELETE request to /api/patients/:id\n2. Verify response status is 200',
    data: 'Param: patient ID, User Role: "admin"',
    expected: 'Response code 200; Patient record deleted'
  },

  // --- DOCTORS JEST ---
  'should create a new doctor when authenticated as admin/staff': {
    id: 'TC-B-DOC-02',
    module: 'Doctor Management (Backend)',
    scenario: 'Verify creating a new doctor record successfully',
    preconditions: 'User is authenticated as Admin or Staff',
    steps: '1. Send POST request to /api/doctors\n2. Verify response status is 201',
    data: 'Name: "Dr. Ayesha", Specialization: "Cardiology"',
    expected: 'Response code 201; JSON contains created doctor object'
  },
  'should reject doctor creation on validation failure': {
    id: 'TC-B-DOC-03',
    module: 'Doctor Management (Backend)',
    scenario: 'Verify doctor creation validation controls',
    preconditions: 'User is authenticated',
    steps: '1. Send POST request to /api/doctors with missing specialization\n2. Verify response status is 400',
    data: 'Name: "Dr. Ayesha" (Specialization missing)',
    expected: 'Response code 400; Validation error returned'
  },
  'should get all doctors with pagination': {
    id: 'TC-B-DOC-04',
    module: 'Doctor Management (Backend)',
    scenario: 'Verify listing all doctor records',
    preconditions: 'User is authenticated',
    steps: '1. Send GET request to /api/doctors\n2. Verify response status is 200',
    data: 'Query: limit=10',
    expected: 'Response code 200; Paginated list of doctors'
  },
  'should search doctors by specialization': {
    id: 'TC-B-DOC-05',
    module: 'Doctor Management (Backend)',
    scenario: 'Verify searching doctor by specialization tag',
    preconditions: 'User is authenticated',
    steps: '1. Send GET request to /api/doctors?search=Cardiology\n2. Verify response status is 200',
    data: 'Query: search="Cardiology"',
    expected: 'Response code 200; Doctors list filtered by Cardiology'
  },
  'should get doctor by ID': {
    id: 'TC-B-DOC-06',
    module: 'Doctor Management (Backend)',
    scenario: 'Verify retrieving single doctor record by ID',
    preconditions: 'User is authenticated; doctor exists',
    steps: '1. Send GET request to /api/doctors/:id\n2. Verify response status is 200',
    data: 'Param: doctor ID',
    expected: 'Response code 200; Doctor details returned'
  },
  'should update doctor details successfully': {
    id: 'TC-B-DOC-07',
    module: 'Doctor Management (Backend)',
    scenario: 'Verify editing doctor details',
    preconditions: 'User is authenticated; doctor exists',
    steps: '1. Send PUT request to /api/doctors/:id\n2. Verify response status is 200',
    data: 'Param: doctor ID, Body: { specialization: "Neurology" }',
    expected: 'Response code 200; Specialization field updated'
  },
  'should delete doctor when user is admin': {
    id: 'TC-B-DOC-08',
    module: 'Doctor Management (Backend)',
    scenario: 'Verify admin is able to delete doctor record',
    preconditions: 'User is authenticated as Admin; doctor exists',
    steps: '1. Send DELETE request to /api/doctors/:id\n2. Verify response status is 200',
    data: 'Param: doctor ID, User Role: "admin"',
    expected: 'Response code 200; Doctor record deleted'
  },

  // --- APPOINTMENTS JEST ---
  'should book a new appointment successfully when authorized': {
    id: 'TC-B-APP-02',
    module: 'Appointment Management (Backend)',
    scenario: 'Verify booking appointment with valid patient and doctor',
    preconditions: 'User is authenticated; patient and doctor exist in DB',
    steps: '1. Send POST request to /api/appointments\n2. Verify response status is 201',
    data: 'PatientID: "P00001", DoctorID: "D00001", Date: "2026-06-20", Time: "10:00"',
    expected: 'Response code 201; JSON contains booked appointment details'
  },
  'should reject booking if patient is not found': {
    id: 'TC-B-APP-03',
    module: 'Appointment Management (Backend)',
    scenario: 'Verify booking rejection when Patient ID does not exist',
    preconditions: 'Patient ID is invalid',
    steps: '1. Send POST to /api/appointments with non-existent patientId\n2. Verify response status is 404',
    data: 'PatientID: "INVALID", DoctorID: "D00001"',
    expected: 'Response code 404; Error message "Patient not found"'
  },
  'should reject booking if doctor is not found': {
    id: 'TC-B-APP-04',
    module: 'Appointment Management (Backend)',
    scenario: 'Verify booking rejection when Doctor ID does not exist',
    preconditions: 'Doctor ID is invalid',
    steps: '1. Send POST to /api/appointments with non-existent doctorId\n2. Verify response status is 404',
    data: 'PatientID: "P00001", DoctorID: "INVALID"',
    expected: 'Response code 404; Error message "Doctor not found"'
  },
  'should get all appointments with pagination': {
    id: 'TC-B-APP-05',
    module: 'Appointment Management (Backend)',
    scenario: 'Verify listing booked appointments',
    preconditions: 'User is authenticated',
    steps: '1. Send GET request to /api/appointments\n2. Verify response status is 200',
    data: 'Query: limit=10',
    expected: 'Response code 200; Paginated list of appointments'
  },
  'should get appointment by ID': {
    id: 'TC-B-APP-06',
    module: 'Appointment Management (Backend)',
    scenario: 'Verify retrieving appointment details by ID',
    preconditions: 'User is authenticated; appointment exists',
    steps: '1. Send GET request to /api/appointments/:id\n2. Verify response status is 200',
    data: 'Param: appointment ID',
    expected: 'Response code 200; Appointment record details'
  },
  'should update appointment details successfully': {
    id: 'TC-B-APP-07',
    module: 'Appointment Management (Backend)',
    scenario: 'Verify rescheduling appointment date/time',
    preconditions: 'User is authenticated; appointment exists',
    steps: '1. Send PUT request to /api/appointments/:id\n2. Verify response status is 200',
    data: 'Param: appointment ID, Body: { date: "2026-06-25" }',
    expected: 'Response code 200; Appointment date rescheduled'
  },
  'should delete appointment when user is admin': {
    id: 'TC-B-APP-08',
    module: 'Appointment Management (Backend)',
    scenario: 'Verify admin is able to delete/cancel appointment',
    preconditions: 'User is authenticated as Admin; appointment exists',
    steps: '1. Send DELETE request to /api/appointments/:id\n2. Verify response status is 200',
    data: 'Param: appointment ID, User Role: "admin"',
    expected: 'Response code 200; Appointment canceled/deleted'
  },

  // --- PRESCRIPTIONS JEST ---
  'should get all prescriptions with pagination': {
    id: 'TC-B-RX-02',
    module: 'Prescription Management (Backend)',
    scenario: 'Verify listing prescriptions',
    preconditions: 'User is authenticated',
    steps: '1. Send GET request to /api/prescriptions\n2. Verify response status is 200',
    data: 'Query: limit=10',
    expected: 'Response code 200; Paginated list of prescriptions'
  },
  'should get prescription by ID': {
    id: 'TC-B-RX-03',
    module: 'Prescription Management (Backend)',
    scenario: 'Verify retrieving prescription by ID',
    preconditions: 'User is authenticated; prescription exists',
    steps: '1. Send GET request to /api/prescriptions/:id\n2. Verify response status is 200',
    data: 'Param: prescription ID',
    expected: 'Response code 200; Prescription details returned'
  },
  'should add a new prescription successfully when authorized': {
    id: 'TC-B-RX-04',
    module: 'Prescription Management (Backend)',
    scenario: 'Verify adding prescription for valid patient',
    preconditions: 'User is authenticated; patient exists in DB',
    steps: '1. Send POST request to /api/prescriptions\n2. Verify response status is 201',
    data: 'PatientID: "P00001", Medicine: "Paracetamol 500mg"',
    expected: 'Response code 201; JSON contains created prescription'
  },
  'should reject prescription addition if patient not found': {
    id: 'TC-B-RX-05',
    module: 'Prescription Management (Backend)',
    scenario: 'Verify prescription creation fails when Patient ID is invalid',
    preconditions: 'Patient ID does not exist',
    steps: '1. Send POST request to /api/prescriptions with invalid patientId\n2. Verify response status is 404',
    data: 'PatientID: "INVALID", Medicine: "Paracetamol"',
    expected: 'Response code 404; Error message "Patient not found"'
  },
  'should update prescription details successfully': {
    id: 'TC-B-RX-06',
    module: 'Prescription Management (Backend)',
    scenario: 'Verify modifying prescription medicine details',
    preconditions: 'User is authenticated; prescription exists',
    steps: '1. Send PUT request to /api/prescriptions/:id\n2. Verify response status is 200',
    data: 'Param: prescription ID, Body: { medicine: "Ibuprofen 400mg" }',
    expected: 'Response code 200; Medicine details updated'
  },
  'should delete prescription when user is admin': {
    id: 'TC-B-RX-07',
    module: 'Prescription Management (Backend)',
    scenario: 'Verify admin is able to delete prescription',
    preconditions: 'User is authenticated as Admin; prescription exists',
    steps: '1. Send DELETE request to /api/prescriptions/:id\n2. Verify response status is 200',
    data: 'Param: prescription ID, User Role: "admin"',
    expected: 'Response code 200; Prescription deleted'
  },
  'should block non-admin from deleting prescription': {
    id: 'TC-B-RX-08',
    module: 'Prescription Management (Backend)',
    scenario: 'Verify non-admin is blocked from deleting prescription',
    preconditions: 'User is authenticated with non-admin role (e.g. staff)',
    steps: '1. Send DELETE request to /api/prescriptions/:id as staff\n2. Verify response status is 403',
    data: 'Param: prescription ID, User Role: "staff"',
    expected: 'Response code 403; Error message "Forbidden: Access denied"'
  },

  // --- E2E SPECIFIC ---
  'Authentication and Session Management > should register a new admin, log out, and log back in': {
    id: 'TC-F-AUTH-01',
    module: 'Authentication & Session (E2E)',
    scenario: 'Verify registration, session logout, and login workflow from the UI',
    preconditions: 'Vite app & express server are running; email is unique',
    steps: '1. Load website\n2. Navigate to Register form\n3. Fill Name, Role, Email, Password & click Register\n4. Confirm session display and toast\n5. Click Logout\n6. Verify back to login page\n7. Login back with details & verify login toast',
    data: 'Name: "Dr. Test Admin", Email: dynamic, Password: "Password123!", Role: "admin"',
    expected: 'Successful redirection, correct toast messages, and session persistence'
  },
  'Authentication and Session Management > should reject invalid credentials during login': {
    id: 'TC-F-AUTH-02',
    module: 'Authentication & Session (E2E)',
    scenario: 'Verify UI displays error when invalid login details are supplied',
    preconditions: 'Vite app & express server are running',
    steps: '1. Load website\n2. Fill unregistered email and bad password\n3. Click Login\n4. Verify error toast is displayed',
    data: 'Email: "nonexistent@clinic.test", Password: "WrongPass123!"',
    expected: 'UI displays red error toast notification; session is not created'
  },
  'Navigation and Tab Switching > should navigate between Patients, Doctors, Appointments, and Prescriptions tabs': {
    id: 'TC-F-NAV-01',
    module: 'Navigation (E2E)',
    scenario: 'Verify tab navigation loads corresponding CRUD views dynamically',
    preconditions: 'User is logged in',
    steps: '1. Click Patients tab; verify patients fields\n2. Click Doctors tab; verify specialized fields\n3. Click Appointments tab; verify doctor/patient ID fields\n4. Click Prescriptions tab; verify medicine textarea field',
    data: 'Tab selection clicks',
    expected: 'Form controls are displayed matching the selected tab configuration'
  },
  'Patients CRUD Operations > should create, search, edit, and delete a patient record': {
    id: 'TC-F-PAT-01',
    module: 'Patient Management (E2E)',
    scenario: 'Verify full CRUD workflow for patient records from the UI',
    preconditions: 'User is logged in',
    steps: '1. Click Patients tab\n2. Create patient via form\n3. Search patient by name to verify visibility\n4. Edit demographic fields & click Update\n5. Verify updated values\n6. Click Delete\n7. Verify row is deleted',
    data: 'Name: "John Doe <timestamp>", Age: 35, Gender: "Male", Phone: "03001234567"',
    expected: 'Toast confirms each operation; table state updates dynamically'
  }
};

// Resolver helper for generic test titles or those requiring file context
function resolveMetadata(suiteName, fullName, title) {
  const cleanSuiteName = suiteName.toLowerCase();
  const cleanTitle = title.trim();

  // Handle generic 'should block unauthorized access'
  if (cleanTitle === 'should block unauthorized access') {
    if (cleanSuiteName.includes('patient')) {
      return {
        id: 'TC-B-PAT-01',
        module: 'Patient Management (Backend)',
        scenario: 'Verify route blocks unauthenticated access to patients list',
        preconditions: 'No Authorization header sent',
        steps: '1. Send GET request to /api/patients\n2. Verify response status is 401',
        data: 'No authentication token',
        expected: 'Response code 401 Unauthorized'
      };
    }
    if (cleanSuiteName.includes('doctor')) {
      return {
        id: 'TC-B-DOC-01',
        module: 'Doctor Management (Backend)',
        scenario: 'Verify route blocks unauthenticated access to doctors list',
        preconditions: 'No Authorization header sent',
        steps: '1. Send GET request to /api/doctors\n2. Verify response status is 401',
        data: 'No authentication token',
        expected: 'Response code 401 Unauthorized'
      };
    }
    if (cleanSuiteName.includes('appointment')) {
      return {
        id: 'TC-B-APP-01',
        module: 'Appointment Management (Backend)',
        scenario: 'Verify route blocks unauthenticated access to appointments list',
        preconditions: 'No Authorization header sent',
        steps: '1. Send GET request to /api/appointments\n2. Verify response status is 401',
        data: 'No authentication token',
        expected: 'Response code 401 Unauthorized'
      };
    }
    if (cleanSuiteName.includes('prescription')) {
      return {
        id: 'TC-B-RX-01',
        module: 'Prescription Management (Backend)',
        scenario: 'Verify route blocks unauthenticated access to prescriptions list',
        preconditions: 'No Authorization header sent',
        steps: '1. Send GET request to /api/prescriptions\n2. Verify response status is 401',
        data: 'No authentication token',
        expected: 'Response code 401 Unauthorized'
      };
    }
  }

  // Check direct mappings
  const matched = metadataMap[cleanTitle] || metadataMap[fullName] || metadataMap[title];
  if (matched) return matched;

  // Fallback generation based on file name if no mapping is found
  let id = 'TC-GENERIC';
  let module = 'General';
  if (cleanSuiteName.includes('auth')) { id = 'TC-B-AUTH-99'; module = 'Authentication (Backend)'; }
  else if (cleanSuiteName.includes('patient')) { id = 'TC-B-PAT-99'; module = 'Patient Management (Backend)'; }
  else if (cleanSuiteName.includes('doctor')) { id = 'TC-B-DOC-99'; module = 'Doctor Management (Backend)'; }
  else if (cleanSuiteName.includes('appointment')) { id = 'TC-B-APP-99'; module = 'Appointment Management (Backend)'; }
  else if (cleanSuiteName.includes('prescription')) { id = 'TC-B-RX-99'; module = 'Prescription Management (Backend)'; }

  return {
    id,
    module,
    scenario: title,
    preconditions: 'Server is running',
    steps: 'Execute automated test case',
    data: 'N/A',
    expected: 'Passes verification checks'
  };
}

let testCasesReportRows = [];
let backendPassed = 0;
let backendFailed = 0;
let e2ePassed = 0;
let e2eFailed = 0;

// 1. Parse Backend Jest Results
if (fs.existsSync(backendJsonPath)) {
  try {
    const rawData = fs.readFileSync(backendJsonPath, 'utf8');
    const data = JSON.parse(rawData);

    if (data.testResults) {
      data.testResults.forEach(suite => {
        const suiteName = path.basename(suite.name);
        if (suite.assertionResults) {
          suite.assertionResults.forEach(test => {
            const isPassed = test.status === 'passed';
            const status = isPassed ? 'PASS' : 'FAIL';
            if (isPassed) backendPassed++;
            else backendFailed++;

            const meta = resolveMetadata(suiteName, test.fullName, test.title);

            testCasesReportRows.push({
              'Test Case ID': meta.id,
              'Module': meta.module,
              'Test Scenario': meta.scenario,
              'Preconditions': meta.preconditions,
              'Test Steps': meta.steps,
              'Test Data': meta.data,
              'Expected Result': meta.expected,
              'Actual Result': isPassed ? 'Automated test executed successfully; assertions verified expected codes, keys, and values.' : 'Assertion failed during run.',
              'Status (Pass/Fail)': status,
              'Remarks': isPassed ? `Duration: ${test.duration || 0}ms` : (test.failureMessages || []).join('\n')
            });
          });
        }
      });
    }
    console.log(`Parsed Backend Jest results: ${backendPassed} passed, ${backendFailed} failed.`);
  } catch (err) {
    console.error('Error parsing backend Jest results:', err.message);
  }
} else {
  console.log('Backend Jest results file not found at:', backendJsonPath);
}

// 2. Parse Frontend Playwright Results
if (fs.existsSync(frontendJsonPath)) {
  try {
    const rawData = fs.readFileSync(frontendJsonPath, 'utf8');
    const data = JSON.parse(rawData);

    function processPlaywrightSuite(suite, parentTitle = '') {
      const currentTitle = parentTitle ? `${parentTitle} > ${suite.title}` : suite.title;

      if (suite.specs) {
        suite.specs.forEach(spec => {
          const mainResult = spec.tests?.[0]?.results?.[0];
          const isPassed = spec.ok;
          const status = isPassed ? 'PASS' : 'FAIL';

          if (isPassed) e2ePassed++;
          else e2eFailed++;

          const fullName = parentTitle ? `${parentTitle} > ${spec.title}` : spec.title;
          const meta = resolveMetadata(spec.file || '', fullName, spec.title);

          testCasesReportRows.push({
            'Test Case ID': meta.id,
            'Module': meta.module,
            'Test Scenario': meta.scenario,
            'Preconditions': meta.preconditions,
            'Test Steps': meta.steps,
            'Test Data': meta.data,
            'Expected Result': meta.expected,
            'Actual Result': isPassed ? 'E2E browser interactions completed successfully; page state, elements, and notifications verified.' : 'Browser workflow failed to complete.',
            'Status (Pass/Fail)': status,
            'Remarks': isPassed ? `Duration: ${mainResult ? mainResult.duration : 0}ms` : (mainResult && mainResult.errors ? mainResult.errors.map(e => e.message).join('\n') : '')
          });
        });
      }

      if (suite.suites) {
        suite.suites.forEach(subSuite => {
          processPlaywrightSuite(subSuite, currentTitle);
        });
      }
    }

    if (data.suites) {
      data.suites.forEach(suite => {
        processPlaywrightSuite(suite);
      });
    }
    console.log(`Parsed Frontend Playwright results: ${e2ePassed} passed, ${e2eFailed} failed.`);
  } catch (err) {
    console.error('Error parsing Playwright results:', err.message);
  }
} else {
  console.log('Frontend Playwright results file not found at:', frontendJsonPath);
}

// 3. Sort rows by Test Case ID to make the report look orderly
testCasesReportRows.sort((a, b) => a['Test Case ID'].localeCompare(b['Test Case ID']));

// 4. Build Summary Data
const totalBackend = backendPassed + backendFailed;
const totalE2e = e2ePassed + e2eFailed;
const summaryRows = [
  {
    'Test Category': 'Backend API (Jest)',
    'Total Tests': totalBackend,
    'Passed': backendPassed,
    'Failed': backendFailed,
    'Pass Rate': totalBackend > 0 ? `${((backendPassed / totalBackend) * 100).toFixed(1)}%` : 'N/A'
  },
  {
    'Test Category': 'Frontend E2E (Playwright)',
    'Total Tests': totalE2e,
    'Passed': e2ePassed,
    'Failed': e2eFailed,
    'Pass Rate': totalE2e > 0 ? `${((e2ePassed / totalE2e) * 100).toFixed(1)}%` : 'N/A'
  },
  {
    'Test Category': 'TOTAL SUMMARY',
    'Total Tests': totalBackend + totalE2e,
    'Passed': backendPassed + e2ePassed,
    'Failed': backendFailed + e2eFailed,
    'Pass Rate': (totalBackend + totalE2e) > 0 
      ? `${(((backendPassed + e2ePassed) / (totalBackend + totalE2e)) * 100).toFixed(1)}%` 
      : 'N/A'
  }
];

// 5. Generate Excel Workbook
try {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Execution Summary');

  // Test Case Report sheet
  const wsReport = XLSX.utils.json_to_sheet(testCasesReportRows);
  
  // Set column widths for better readability in Excel
  const colWidths = [
    { wch: 15 }, // Test Case ID
    { wch: 25 }, // Module
    { wch: 45 }, // Test Scenario
    { wch: 35 }, // Preconditions
    { wch: 55 }, // Test Steps
    { wch: 35 }, // Test Data
    { wch: 45 }, // Expected Result
    { wch: 45 }, // Actual Result
    { wch: 18 }, // Status (Pass/Fail)
    { wch: 30 }  // Remarks
  ];
  wsReport['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, wsReport, 'Test Case Execution Report');

  XLSX.writeFile(wb, outputPath);
  console.log(`Excel report successfully saved with custom QA format to:\n${outputPath}`);
} catch (err) {
  console.error('Error writing Excel file:', err.message);
}
