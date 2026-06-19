import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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
  }

  return (
    <main className="crud-app">
      <header className="topbar">
        <div>
          <p className="eyebrow">MERN CRUD Application</p>
          <h1>Clinic Management System</h1>
        </div>
        {user && (
          <div className="session">
            <span>{user.name}</span>
            <strong>{user.role}</strong>
            <button type="button" onClick={logout}>
              Logout
            </button>
          </div>
        )}
      </header>

      {!token ? (
        <section className="auth-panel">
          <div>
            <p className="eyebrow">Secure access</p>
            <h2>{authMode === 'login' ? 'Login to manage clinic records' : 'Create demo user'}</h2>
            <p>
              Register once as an admin or staff user, then use the protected CRUD screens
              connected to the Express API and MongoDB.
            </p>
          </div>

          <form className="form-card" onSubmit={handleAuth}>
            {authMode === 'register' && (
              <>
                <label>
                  Name
                  <input
                    value={authForm.name}
                    onChange={(event) =>
                      setAuthForm({ ...authForm, name: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Role
                  <select
                    value={authForm.role}
                    onChange={(event) =>
                      setAuthForm({ ...authForm, role: event.target.value })
                    }
                  >
                    <option value="admin">admin</option>
                    <option value="staff">staff</option>
                  </select>
                </label>
              </>
            )}
            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm({ ...authForm, password: event.target.value })
                }
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Register'}
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? 'Need an account? Register' : 'Already registered? Login'}
            </button>
          </form>
        </section>
      ) : (
        <section className="workspace">
          <nav className="tabs" aria-label="CRUD resources">
            {Object.entries(resources).map(([key, resource]) => (
              <button
                key={key}
                type="button"
                className={activeResource === key ? 'active' : ''}
                onClick={() => switchResource(key)}
              >
                {resource.label}
              </button>
            ))}
          </nav>

          <section className="crud-grid">
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
                  {editing ? 'Update' : 'Create'}
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

            <div className="records-panel">
              <div className="records-toolbar">
                <div>
                  <p className="eyebrow">Database records</p>
                  <h2>{config.label}</h2>
                </div>
                <div className="toolbar-controls" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <form
                    className="search"
                    onSubmit={(event) => {
                      event.preventDefault()
                      fetchRecords()
                    }}
                    style={{margin: 0}}
                  >
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={`Search ${config.label.toLowerCase()}`}
                    />
                    <button type="submit">Search</button>
                  </form>
                  {/* Pagination controls */}
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(parseInt(e.target.value, 10)); setCurrentPage(1); fetchRecords(); }}
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); fetchRecords(); }}
                  >Prev</button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => { setCurrentPage(prev => prev + 1); fetchRecords(); }}
                  >Next</button>
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
                            <button type="button" onClick={() => beginEdit(record)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleDelete(record)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!records.length && (
                      <tr>
                        <td colSpan={config.columns.length + 1} className="empty-state">
                          {loading ? 'Loading records...' : 'No records found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </section>
      )}

      {(message || error) && (
        <aside className={`toast ${error ? 'error' : 'success'}`}>{error || message}</aside>
      )}
    </main>
  )
}

export default App
