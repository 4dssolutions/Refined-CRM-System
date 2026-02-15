import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole, requiredSection }) => {
  const { user, loading, hasPermission } = useContext(AuthContext);

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !requiredRole.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  if (requiredSection && !hasPermission(requiredSection)) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: '#333', marginBottom: '0.5rem' }}>Access Restricted</h2>
        <p style={{ color: '#666' }}>You do not have permission to access this section. Please contact your administrator.</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
