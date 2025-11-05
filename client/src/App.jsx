import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001';

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
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${API}/api/properties`);
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading properties...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '10px' }}>Welcome, {user.firstName}! 👋</h1>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>Browse available properties</p>

      {properties.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <p style={{ fontSize: '18px', color: '#666' }}>No properties available yet. Check back soon!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {properties.map(property => (
            <div key={property._id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>{property.title}</h3>
              <p style={{ color: '#666', marginBottom: '10px', fontSize: '16px' }}>📍 {property.city}</p>
              <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#16a34a', marginBottom: '10px' }}>€{property.price}/month</p>
              <p style={{ color: '#666', marginBottom: '10px' }}>🛏️ {property.rooms} rooms</p>
              <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px', lineHeight: '1.5' }}>{property.description}</p>
              
              {property.amenities && property.amenities.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>✨ Amenities:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {property.amenities.map((amenity, idx) => (
                      <span key={idx} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
              >
                📧 Contact Landlord
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LandlordDashboard({ user }) {
  const [properties, setProperties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    city: '',
    price: '',
    rooms: '',
    amenities: ''
  });
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await axios.get(`${API}/api/my-properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const amenitiesArray = formData.amenities.split(',').map(a => a.trim()).filter(a => a);
      await axios.post(`${API}/api/properties`, {
        ...formData,
        price: parseFloat(formData.price),
        rooms: parseInt(formData.rooms),
        amenities: amenitiesArray
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData({ title: '', description: '', city: '', price: '', rooms: '', amenities: '' });
      setShowForm(false);
      fetchProperties();
    } catch (error) {
      alert('Error adding property: ' + error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await axios.delete(`${API}/api/properties/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProperties();
    } catch (error) {
      alert('Error deleting property');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '20px' }}>Landlord Dashboard</h1>
      
      <button
        onClick={() => setShowForm(!showForm)}
        style={{ backgroundColor: '#16a34a', color: 'white', padding: '10px 20px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', border: 'none', marginBottom: '20px' }}
      >
        {showForm ? '❌ Close' : '➕ Add Property'}
      </button>

      {showForm && (
        <div style={{ backgroundColor: '#f0fdf4', padding: '30px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #bbf7d0' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Add New Property</h2>
          <form onSubmit={handleAddProperty}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Cozy 2BHK in downtown"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="e.g., Nantes"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Price (€/month)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="e.g., 500"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Rooms</label>
                <input
                  type="number"
                  name="rooms"
                  value={formData.rooms}
                  onChange={handleInputChange}
                  placeholder="e.g., 2"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your property..."
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '100px', fontFamily: 'inherit' }}
                required
              />
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Amenities (comma-separated)</label>
              <input
                type="text"
                name="amenities"
                value={formData.amenities}
                onChange={handleInputChange}
                placeholder="e.g., WiFi, Kitchen, Parking, Balcony"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ marginTop: '20px', width: '100%', padding: '12px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}
            >
              {loading ? 'Adding...' : 'Add Property'}
            </button>
          </form>
        </div>
      )}

      <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '4px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>📊 Your Properties</h2>
        
        {properties.length === 0 ? (
          <p style={{ color: '#666' }}>No properties yet. Click "Add Property" to get started!</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {properties.map(property => (
              <div key={property._id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>{property.title}</h3>
                <p style={{ color: '#666', marginBottom: '10px' }}>📍 {property.city}</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a', marginBottom: '10px' }}>€{property.price}/month</p>
                <p style={{ color: '#666', marginBottom: '10px' }}>🛏️ {property.rooms} rooms</p>
                <p style={{ color: '#666', marginBottom: '10px', fontSize: '14px' }}>{property.description}</p>
                
                <button
                  onClick={() => handleDeleteProperty(property._id)}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
