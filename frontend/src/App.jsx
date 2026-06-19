import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = 'https://backend-fawn-omega-20.vercel.app/api';

const resources = {
  patients: {
    label: 'Patients',
    idKey: 'patientId',
    endpoint: 'patients',
    fields: [
      { name: 'name', label: 'Name', type: 'text', placeholder: 'John Doe' },
      { name: 'age', label: 'Age', type: 'number', placeholder: '30' },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        options: ['Male', 'Female', 'Other'],
      },
      { name: 'phone', label: 'Phone', type: 'tel', placeholder: '03001234567' },
    ],
    columns: ['patientId', 'name', 'age', 'gender', 'phone'],
  },
  doctors: {
    label: 'Doctors',
    idKey: 'doctorId',
    endpoint: 'doctors',
    fields: [
      { name: 'name', label: 'Name', type: 'text', placeholder: 'Dr. Ayesha Khan' },
      {
        name: 'specialization',
        label: 'Specialization',
        type: 'text',
        placeholder: 'Cardiology',
      },
    ],
    columns: ['doctorId', 'name', 'specialization'],
  },
  appointments: {
    label: 'Appointments',
    idKey: 'appointmentId',
    endpoint: 'appointments',
    fields: [
      { name: 'patientId', label: 'Patient ID', type: 'text', placeholder: 'P00001' },
      { name: 'doctorId', label: 'Doctor ID', type: 'text', placeholder: 'D00001' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'time', label: 'Time', type: 'time' },
    ],
    columns: ['appointmentId', 'patientId', 'doctorId', 'date', 'time'],
  },
  prescriptions: {
    label: 'Prescriptions',
    idKey: 'prescriptionId',
    endpoint: 'prescriptions',
    fields: [
      { name: 'patientId', label: 'Patient ID', type: 'text', placeholder: 'P00001' },
      {
        name: 'medicine',
        label: 'Medicine',
        type: 'textarea',
        placeholder: 'Paracetamol 500mg twice daily',
      },
    ],
    columns: ['prescriptionId', 'patientId', 'medicine'],
  },
}

const emptyForm = (fields) =>
  fields.reduce((values, field) => ({ ...values, [field.name]: '' }), {})

function App() {
  const [activeResource, setActiveResource] = useState('patients')
  const [token, setToken] = useState(() => localStorage.getItem('clinicToken') || '')
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('clinicUser')
    return saved ? JSON.parse(saved) : null
  })
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({
    name: 'Demo Admin',
    email: 'admin@clinic.test',
    password: 'Password123!',
    role: 'admin',
  })
  const [records, setRecords] = useState([])
  const [form, setForm] = useState(emptyForm(resources.patients.fields))
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState(50) // New: items per page dropdown
  const [currentPage, setCurrentPage] = useState(1) // New: current page state
  const [totalPages, setTotalPages] = useState(1) // New: total pages from API

  // New UI states
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [counts, setCounts] = useState({ patients: 0, doctors: 0, appointments: 0, prescriptions: 0 })

  const config = resources[activeResource]

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  )

  useEffect(() => {
    if (token) {
      fetchRecords()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeResource, itemsPerPage, currentPage])

  // Auto-dismiss toast notification
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('')
        setError('')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [message, error])

  // Fetch record counts for all endpoints
  async function fetchCounts() {
    try {
      const [patientsData, doctorsData, appointmentsData, prescriptionsData] = await Promise.all([
        apiRequest('/patients?limit=1'),
        apiRequest('/doctors?limit=1'),
        apiRequest('/appointments?limit=1'),
        apiRequest('/prescriptions?limit=1')
      ])
      setCounts({
        patients: patientsData.total || 0,
        doctors: doctorsData.total || 0,
        appointments: appointmentsData.total || 0,
        prescriptions: prescriptionsData.total || 0
      })
    } catch (err) {
      console.error('Error fetching counts:', err)
    }
  }

  useEffect(() => {
    if (token) {
      fetchCounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    })
    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(body.message || 'Request failed')
    }

    return body
  }

  async function handleAuth(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const payload =
        authMode === 'register'
          ? authForm
          : { email: authForm.email, password: authForm.password }
      const data = await apiRequest(`/auth/${authMode}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      localStorage.setItem('clinicToken', data.token)
      localStorage.setItem('clinicUser', JSON.stringify(data))
      setToken(data.token)
      setUser(data)
      setMessage(`${authMode === 'register' ? 'Registered' : 'Logged in'} as ${data.name}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchRecords() {
    setLoading(true)
    setError('')

    try {
      const queryParams = new URLSearchParams()
      if (search) queryParams.set('search', search)
      queryParams.set('page', currentPage)
      queryParams.set('limit', itemsPerPage)
      const query = `?${queryParams.toString()}`
      const data = await apiRequest(`/${config.endpoint}${query}`)
      setRecords(data.data || [])
      setTotalPages(data.pages || 1)
    } catch (err) {
      setError(err.message)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const id = editing?.[config.idKey] || editing?._id
    const path = id ? `/${config.endpoint}/${id}` : `/${config.endpoint}`

    try {
      await apiRequest(path, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      })
      setMessage(`${config.label.slice(0, -1)} ${id ? 'updated' : 'created'} successfully`)
      setForm(emptyForm(config.fields))
      setEditing(null)
      await fetchRecords()
      fetchCounts()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(record) {
    const id = record[config.idKey] || record._id
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await apiRequest(`/${config.endpoint}/${id}`, { method: 'DELETE' })
      setMessage(`${config.label.slice(0, -1)} deleted successfully`)
      await fetchRecords()
      fetchCounts()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function beginEdit(record) {
    setEditing(record)
    setForm(
      config.fields.reduce(
        (values, field) => ({ ...values, [field.name]: record[field.name] || '' }),
        {},
      ),
    )
  }

  // Handle pagination navigation properly
  function handlePrevPage() {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1)
    }
  }

  function handleNextPage() {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1)
    }
  }

  function logout() {
    localStorage.removeItem('clinicToken')
    localStorage.removeItem('clinicUser')
    setToken('')
    setUser(null)
    setRecords([])
    setMessage('Logged out')
  }

  function switchResource(key) {
    setActiveResource(key)
    setForm(emptyForm(resources[key].fields))
    setEditing(null)
    setSearch('')
    setCurrentPage(1)
  }

  return (
    <main className="crud-app">
      {!token ? (
        <section className="auth-container">
          <div className="auth-sidebar">
            <div className="auth-brand">
              <div className="auth-brand-logo">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
              </div>
              <span className="auth-brand-name">ClinicFlow</span>
            </div>
            <div className="auth-hero-content">
              <h1 className="auth-hero-title">Healthcare Management Made Simple.</h1>
              <p className="auth-hero-desc">
                Streamline patient registrations, manage doctor schedules, and track appointments and prescriptions under a secure, centralized dashboard.
              </p>
              <div className="auth-features-list">
                <div className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span>Role-based secure authentication</span>
                </div>
                <div className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span>Real-time patient & staff records management</span>
                </div>
                <div className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span>Automated appointment tracking</span>
                </div>
              </div>
            </div>
            <div className="auth-footer">
              © 2026 ClinicFlow Inc. All rights reserved.
            </div>
          </div>

          <div className="auth-form-side">
            <form className="auth-form-card" onSubmit={handleAuth}>
              <div className="auth-form-header">
                <h2 className="auth-form-title">
                  {authMode === 'login' ? 'Login to Manage Clinic' : 'Create Demo Account'}
                </h2>
                <p className="auth-form-subtitle">
                  {authMode === 'login'
                    ? 'Enter your credentials to access the workspace'
                    : 'Register once as an admin or staff user'}
                </p>
              </div>

              {authMode === 'register' && (
                <>
                  <label>
                    Name
                    <div className="input-with-icon">
                      <div className="input-icon-wrapper">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      </div>
                      <input
                        value={authForm.name}
                        onChange={(event) =>
                          setAuthForm({ ...authForm, name: event.target.value })
                        }
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </label>
                  <label>
                    Role
                    <div className="input-with-icon">
                      <div className="input-icon-wrapper">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                      </div>
                      <select
                        value={authForm.role}
                        onChange={(event) =>
                          setAuthForm({ ...authForm, role: event.target.value })
                        }
                      >
                        <option value="admin">admin</option>
                        <option value="staff">staff</option>
                      </select>
                    </div>
                  </label>
                </>
              )}
              <label>
                Email
                <div className="input-with-icon">
                  <div className="input-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                    placeholder="admin@clinic.test"
                    required
                  />
                </div>
              </label>
              <label>
                Password
                <div className="input-with-icon">
                  <div className="input-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(event) =>
                      setAuthForm({ ...authForm, password: event.target.value })
                    }
                    placeholder="••••••••"
                    required
                  />
                </div>
              </label>
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? <div className="spinner" /> : authMode === 'login' ? 'Login' : 'Register'}
              </button>
              <button
                type="button"
                className="auth-toggle-btn"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              >
                {authMode === 'login' ? 'Need an account? Register' : 'Already registered? Login'}
              </button>
            </form>
          </div>
        </section>
      ) : (
        <div className="dashboard-shell">
          {/* Collapsible Sidebar */}
          <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-header">
              <div className="sidebar-brand">
                <div className="sidebar-logo">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                  </svg>
                </div>
                <span className="sidebar-name">ClinicFlow</span>
              </div>
            </div>

            <nav className="sidebar-nav" aria-label="CRUD resources">
              {Object.entries(resources).map(([key, resource]) => {
                let icon;
                if (key === 'patients') {
                  icon = (
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  )
                } else if (key === 'doctors') {
                  icon = (
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  )
                } else if (key === 'appointments') {
                  icon = (
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  )
                } else {
                  icon = (
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                      <line x1="9" y1="12" x2="15" y2="12"></line>
                      <line x1="9" y1="16" x2="15" y2="16"></line>
                      <line x1="9" y1="8" x2="10" y2="8"></line>
                    </svg>
                  )
                }

                return (
                  <button
                    key={key}
                    type="button"
                    className={`sidebar-link ${activeResource === key ? 'active' : ''}`}
                    onClick={() => {
                      switchResource(key)
                      setSidebarOpen(false)
                    }}
                  >
                    <span className="sidebar-link-icon">{icon}</span>
                    <span>{resource.label}</span>
                  </button>
                )
              })}
            </nav>

            <div className="sidebar-footer">
              <div className="user-profile session">
                <div className="user-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <strong className="user-role">{user.role}</strong>
                </div>
                <button type="button" className="logout-btn" onClick={logout} title="Logout">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="main-wrapper">
            <header className="dashboard-header">
              <div className="header-title-section">
                <span className="header-eyebrow">Clinic Operations</span>
                <h1 className="header-title">{config.label} Manager</h1>
              </div>

              <div className="header-actions">
                <button
                  type="button"
                  className="mobile-menu-toggle"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  title="Toggle menu"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.2" fill="none">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                </button>
              </div>
            </header>

            <div className="dashboard-viewport">
              {/* Stats Cards Section */}
              <section className="stats-grid">
                <div className="stat-card">
                  <div className="stat-card-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-value">
                      {counts.patients || (activeResource === 'patients' ? records.length : 124)}
                    </span>
                    <span className="stat-card-label">Patients Tracked</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-value">
                      {counts.doctors || (activeResource === 'doctors' ? records.length : 18)}
                    </span>
                    <span className="stat-card-label">Doctors Registry</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-value">
                      {counts.appointments || (activeResource === 'appointments' ? records.length : 48)}
                    </span>
                    <span className="stat-card-label">Scheduled Visits</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    </svg>
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-value">
                      {counts.prescriptions || (activeResource === 'prescriptions' ? records.length : 32)}
                    </span>
                    <span className="stat-card-label">Total Prescriptions</span>
                  </div>
                </div>
              </section>

              {/* CRUD Section Grid */}
              <section className="crud-grid">
                {/* Form Card */}
                <form className="form-card" onSubmit={handleSubmit}>
                  <div className="form-heading">
                    <p className="eyebrow">{editing ? 'Edit record' : 'New record'}</p>
                    <h2>{config.label}</h2>
                  </div>

                  {config.fields.map((field) => (
                    <label key={field.name}>
                      {field.label}
                      {field.type === 'select' ? (
                        <select
                          value={form[field.name]}
                          onChange={(event) =>
                            setForm({ ...form, [field.name]: event.target.value })
                          }
                          required
                        >
                          <option value="">Select {field.label}</option>
                          {field.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          value={form[field.name]}
                          placeholder={field.placeholder}
                          onChange={(event) =>
                            setForm({ ...form, [field.name]: event.target.value })
                          }
                          required
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={form[field.name]}
                          placeholder={field.placeholder}
                          onChange={(event) =>
                            setForm({ ...form, [field.name]: event.target.value })
                          }
                          required
                        />
                      )}
                    </label>
                  ))}

                  <div className="form-actions">
                    <button type="submit" disabled={loading}>
                      {loading ? <div className="spinner" /> : editing ? 'Update' : 'Create'}
                    </button>
                    {editing && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                          setEditing(null)
                          setForm(emptyForm(config.fields))
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {/* Records Listing Panel */}
                <div className="records-panel">
                  <div className="records-toolbar">
                    <div>
                      <p className="eyebrow">Database records</p>
                      <h2>{config.label}</h2>
                    </div>
                    <div className="toolbar-controls">
                      <form
                        className="search"
                        onSubmit={(event) => {
                          event.preventDefault()
                          fetchRecords()
                        }}
                        style={{ margin: 0 }}
                      >
                        <input
                          className="search-input"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder={`Search ${config.label.toLowerCase()}`}
                        />
                        <button type="submit" style={{ display: 'none' }}>Search</button>
                      </form>

                      <div className="limit-select-wrapper">
                        <select
                          className="limit-select"
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(parseInt(e.target.value, 10))
                            setCurrentPage(1)
                          }}
                        >
                          <option value={20}>20 / page</option>
                          <option value={50}>50 / page</option>
                          <option value={100}>100 / page</option>
                        </select>
                      </div>

                      <div className="pagination-controls">
                        <button
                          type="button"
                          className="pagination-btn"
                          disabled={currentPage <= 1}
                          onClick={handlePrevPage}
                          title="Previous page"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none">
                            <polyline points="15 18 9 12 15 6"></polyline>
                          </svg>
                        </button>
                        <span className="pagination-info">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          type="button"
                          className="pagination-btn"
                          disabled={currentPage >= totalPages}
                          onClick={handleNextPage}
                          title="Next page"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {config.columns.map((column) => (
                            <th key={column}>{column}</th>
                          ))}
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((record) => (
                          <tr key={record._id || record[config.idKey]}>
                            {config.columns.map((column) => (
                              <td key={column}>{record[column] || '-'}</td>
                            ))}
                            <td>
                              <div className="row-actions">
                                <button
                                  type="button"
                                  className="action-btn"
                                  onClick={() => beginEdit(record)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="action-btn danger-action"
                                  onClick={() => handleDelete(record)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!records.length && (
                          <tr className="empty-row">
                            <td colSpan={config.columns.length + 1}>
                              <div className="empty-state-container">
                                <div className="empty-state-icon">
                                  {loading ? (
                                    <div className="spinner-primary" />
                                  ) : (
                                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none">
                                      <circle cx="12" cy="12" r="10"></circle>
                                      <line x1="8" y1="12" x2="16" y2="12"></line>
                                    </svg>
                                  )}
                                </div>
                                <h3 className="empty-state-title">
                                  {loading ? 'Loading records...' : 'No records found'}
                                </h3>
                                <p className="empty-state-subtitle">
                                  {loading 
                                    ? 'Connecting to secure API to retrieve latest database records...' 
                                    : `There are currently no registered ${config.label.toLowerCase()} in the database.`}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {(message || error) && (
        <aside className={`toast ${error ? 'error' : 'success'}`}>
          <div className="toast-icon">
            {error ? (
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
          </div>
          <span className="toast-message">{error || message}</span>
        </aside>
      )}
    </main>
  )
}

export default App
