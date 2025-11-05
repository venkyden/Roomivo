import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5001';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <nav style={{ backgroundColor: 'white', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>🏠 Roomivo</h1>
            <div>
              {user ? (
                <>
                  <span style={{ marginRight: '20px', fontWeight: '600' }}>{user.firstName}</span>
                  <button
                    onClick={handleLogout}
                    style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Logout
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={!user ? <LandingPage /> : <Navigate to={user.role === 'tenant' ? '/tenant' : '/landlord'} />} />
          <Route path="/login" element={!user ? <LoginPage setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <RegisterPage setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="/tenant" element={user?.role === 'tenant' ? <TenantDashboard user={user} /> : <Navigate to="/" />} />
          <Route path="/landlord" element={user?.role === 'landlord' ? <LandlordDashboard user={user} /> : <Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px' }}>Welcome to Roomivo</h1>
      <p style={{ fontSize: '20px', color: '#666', marginBottom: '40px' }}>
        The transparent, dispute-free rental platform connecting tenants & landlords
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '40px' }}>
        <div style={{ backgroundColor: '#eff6ff', padding: '30px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>👤 Find Your Home</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>Browse verified properties, AI-matched to your preferences</p>
          <button
            onClick={() => navigate('/register')}
            style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}
          >
            Register as Tenant
          </button>
        </div>

        <div style={{ backgroundColor: '#f0fdf4', padding: '30px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>🏠 List Your Property</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>Connect with verified tenants and manage applications easily</p>
          <button
            onClick={() => navigate('/register')}
            style={{ width: '100%', padding: '12px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}
          >
            Register as Landlord
          </button>
        </div>
      </div>

      <p style={{ color: '#666', marginBottom: '10px' }}>Already have an account?</p>
      <button
        onClick={() => navigate('/login')}
        style={{ fontSize: '16px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600' }}
      >
        Login here
      </button>
    </div>
  );
}

function LoginPage({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API}/api/auth/login`, { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
      navigate(response.data.user.role === 'tenant' ? '/tenant' : '/landlord');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '30px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }}>Login to Roomivo</h2>
      {error && <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #fecaca' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: '#333' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
            required
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: '#333' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p style={{ marginTop: '20px', textAlign: 'center', color: '#666' }}>
        Don't have an account? <a href="/register" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>Register</a>
      </p>
    </div>
  );
}

function RegisterPage({ setUser }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('tenant');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API}/api/auth/register`, {
        firstName,
        lastName,
        email,
        password,
        role
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
      navigate(role === 'tenant' ? '/tenant' : '/landlord');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '30px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }}>Join Roomivo</h2>
      {error && <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #fecaca' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: '#333' }}>First Name</label>
          <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} required />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: '#333' }}>Last Name</label>
          <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} required />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: '#333' }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} required />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: '#333' }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} required />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: '#333' }}>I am a...</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}>
            <option value="tenant">Tenant (Looking for home)</option>
            <option value="landlord">Landlord (Listing property)</option>
          </select>
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }} disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p style={{ marginTop: '20px', textAlign: 'center', color: '#666' }}>
        Already have an account? <a href="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>Login</a>
      </p>
    </div>
  );
}

function TenantDashboard({ user }) {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '20px' }}>Welcome, {user.firstName}! 👋</h1>
      <div style={{ backgroundColor: '#dbeafe', border: '1px solid #60a5fa', padding: '20px', borderRadius: '4px', marginBottom: '30px', borderLeft: '4px solid #3b82f6' }}>
        <p style={{ fontWeight: '600', color: '#1e3a8a' }}>⚡ Quick Tip</p>
        <p style={{ color: '#1e40af' }}>Start browsing verified properties or complete your profile!</p>
      </div>
    </div>
  );
}

function LandlordDashboard({ user }) {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '20px' }}>Landlord Dashboard</h1>
      <button style={{ backgroundColor: '#16a34a', color: 'white', padding: '10px 20px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', border: 'none', marginBottom: '20px' }}>
        ➕ Add Property
      </button>
      <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '4px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>📊 Your Statistics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '4px' }}>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb' }}>0</p>
            <p style={{ color: '#666' }}>Properties Listed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
