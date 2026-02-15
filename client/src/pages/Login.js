import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { login as loginApi } from '../services/api';
import './Login.css';

const Login = () => {
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await loginApi({ login: loginValue.trim(), password });
      login(response.data.user, response.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel login-panel-form">
        <div className="login-form-inner">
          <div className="login-brand">
            <span className="login-logo">R</span>
            <h1 className="login-title">Refined CRM</h1>
            <p className="login-subtitle">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <div className="login-field">
              <label htmlFor="login-input">Username or email</label>
              <input
                id="login-input"
                type="text"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
                required
                placeholder="you@company.com"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="login-field">
              <label htmlFor="password-input">Password</label>
              <div className="login-password-wrap">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="login-actions">
              <a
                href="/forgot-password"
                className="login-forgot"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/forgot-password');
                }}
              >
                Forgot password?
              </a>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="login-legal">Refined CRM · Secure access</p>
        </div>
      </div>

      <div className="login-panel login-panel-visual">
        <div className="login-visual-content">
          <div className="login-visual-badge">Company portal</div>
          <p className="login-visual-text">
            Manage customers, orders, and projects in one place.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
