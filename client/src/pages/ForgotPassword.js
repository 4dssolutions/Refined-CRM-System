import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../services/api';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import './Login.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await forgotPassword(email.trim());
      setMessage('If that email is registered, you will receive a password reset link shortly.');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Forgot Password</h1>
          <p>Enter your registered email to receive a reset link</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}
          
          <div className="form-group">
            <label>
              <FiMail className="input-icon" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your registered email"
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <button
            type="button"
            className="login-button-secondary"
            onClick={() => navigate('/login')}
          >
            <FiArrowLeft /> Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
