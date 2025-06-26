import { useState } from 'react';

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
    xhr.open('POST', 'http://localhost:8000/register'); // Placeholder URL
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      setLoading(false);
      if (xhr.status === 200) {
        setSuccess('Registration successful!');
        setForm({ username: '', email: '', password: '', confirmPassword: '' });
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
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Username</label><br />
          <input name="username" value={form.username} onChange={handleChange} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label><br />
          <input name="email" value={form.email} onChange={handleChange} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label><br />
          <input type="password" name="password" value={form.password} onChange={handleChange} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Confirm Password</label><br />
          <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} />
        </div>
        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
        {success && <div style={{ color: 'green', marginBottom: 8 }}>{success}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
      </form>
    </div>
  );
}
