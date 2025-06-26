import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validate = () => {
    if (!form.username || !form.email || !form.password || !form.confirmPassword) {
      setError('All fields are required.');
      return false;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setError('Invalid email format.');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    setError('');
    return true;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess('');
    if (!validate()) return;
    setLoading(true);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://localhost:8000/register');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      setLoading(false);
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          setSuccess('Registration successful! Logging you in...');
          // Store user data in localStorage
          localStorage.setItem('user', JSON.stringify({
            id: response.user_id,
            username: form.username
          }));
          // Redirect to forum after a short delay
          setTimeout(() => {
            router.push('/forum');
          }, 1500);
        } catch (e) {
          setError('Error processing response.');
        }
      } else {
        setError(xhr.responseText || 'Registration failed.');
      }
    };
    xhr.onerror = function () {
      setLoading(false);
      setError('Network error.');
    };
    xhr.send(JSON.stringify({
      username: form.username,
      email: form.email,
      password: form.password
    }));
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        maxWidth: 500, 
        width: '100%', 
        padding: '40px', 
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        border: '1px solid #eee'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          color: '#333', 
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          Register
        </h1>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '1.1rem', 
              fontWeight: 'bold', 
              color: '#333',
              marginBottom: '8px'
            }}>
              Username
            </label>
            <input 
              name="username" 
              value={form.username} 
              onChange={handleChange}
              style={{ 
                width: '100%',
                padding: '14px 16px',
                fontSize: '16px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.3s',
                color: '#000'
              }}
              onFocus={(e) => e.target.style.borderColor = '#44aa44'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '1.1rem', 
              fontWeight: 'bold', 
              color: '#333',
              marginBottom: '8px'
            }}>
              Email
            </label>
            <input 
              name="email" 
              value={form.email} 
              onChange={handleChange}
              style={{ 
                width: '100%',
                padding: '14px 16px',
                fontSize: '16px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.3s',
                color: '#000'
              }}
              onFocus={(e) => e.target.style.borderColor = '#44aa44'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '1.1rem', 
              fontWeight: 'bold', 
              color: '#333',
              marginBottom: '8px'
            }}>
              Password
            </label>
            <input 
              type="password" 
              name="password" 
              value={form.password} 
              onChange={handleChange}
              style={{ 
                width: '100%',
                padding: '14px 16px',
                fontSize: '16px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.3s',
                color: '#000'
              }}
              onFocus={(e) => e.target.style.borderColor = '#44aa44'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '1.1rem', 
              fontWeight: 'bold', 
              color: '#333',
              marginBottom: '8px'
            }}>
              Confirm Password
            </label>
            <input 
              type="password" 
              name="confirmPassword" 
              value={form.confirmPassword} 
              onChange={handleChange}
              style={{ 
                width: '100%',
                padding: '14px 16px',
                fontSize: '16px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.3s',
                color: '#000'
              }}
              onFocus={(e) => e.target.style.borderColor = '#44aa44'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
          </div>
          
          {error && (
            <div style={{ 
              color: '#ff4444', 
              marginBottom: '16px', 
              padding: '12px', 
              backgroundColor: '#fff5f5', 
              border: '1px solid #ff4444',
              borderRadius: '6px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
          
          {success && (
            <div style={{ 
              color: '#44aa44', 
              marginBottom: '16px', 
              padding: '12px', 
              backgroundColor: '#f0fff0', 
              border: '1px solid #44aa44',
              borderRadius: '6px',
              fontSize: '14px'
            }}>
              {success}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#ccc' : '#44aa44',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s'
            }}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        
        <div style={{ 
          textAlign: 'center', 
          marginTop: '24px',
          fontSize: '14px',
          color: '#666'
        }}>
          Already have an account?{' '}
          <a 
            href="/login" 
            style={{ 
              color: '#44aa44', 
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            Login here
          </a>
        </div>
      </div>
    </div>
  );
}
