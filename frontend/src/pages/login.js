import { useState } from 'react';

export default function Login() {
  const [form, setForm] = useState({
    usernameOrEmail: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!form.usernameOrEmail || !form.password) {
      setError('All fields are required.');
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
    xhr.open('POST', 'http://localhost:8000/login'); // Placeholder URL
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      setLoading(false);
      if (xhr.status === 200) {
        setSuccess('Login successful!');
        // Optionally, redirect or store session info here
      } else {
        setError(xhr.responseText || 'Login failed.');
      }
    };
    xhr.onerror = function () {
      setLoading(false);
      setError('Network error.');
    };
    xhr.send(JSON.stringify({
      username_or_email: form.usernameOrEmail,
      password: form.password
    }));
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Username or Email</label><br />
          <input name="usernameOrEmail" value={form.usernameOrEmail} onChange={handleChange} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label><br />
          <input type="password" name="password" value={form.password} onChange={handleChange} />
        </div>
        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
        {success && <div style={{ color: 'green', marginBottom: 8 }}>{success}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      </form>
    </div>
  );
}
