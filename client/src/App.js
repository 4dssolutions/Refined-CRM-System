import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import NotificationButton from './components/NotificationButton';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Tasks from './pages/Tasks';
import Projects from './pages/Projects';
import Meetings from './pages/Meetings';
import Calendar from './pages/Calendar';
import Organizations from './pages/Organizations';
import Documents from './pages/Documents';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import Emails from './pages/Emails';
import Chat from './pages/Chat';
import Revenue from './pages/Revenue';
import Calls from './pages/Calls';
import Leads from './pages/Leads';
import './App.css';

const AppRoutes = () => {
  const { user } = React.useContext(AuthContext);

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        <header className="top-bar">
          <div />
          <NotificationButton />
        </header>
        <div className="page-content">
          <Routes>
          <Route path="/" element={<ProtectedRoute requiredSection="dashboard"><Dashboard /></ProtectedRoute>} />
          <Route path="/emails" element={<ProtectedRoute requiredSection="emails"><Emails /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute requiredSection="chat"><Chat /></ProtectedRoute>} />
          <Route path="/revenue" element={<ProtectedRoute requiredSection="revenue"><Revenue /></ProtectedRoute>} />
          <Route path="/calls" element={<ProtectedRoute requiredSection="calls"><Calls /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute requiredSection="customers"><Customers /></ProtectedRoute>} />
          <Route path="/suppliers" element={<ProtectedRoute requiredSection="suppliers"><Suppliers /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute requiredSection="products"><Products /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute requiredSection="orders"><Orders /></ProtectedRoute>} />
          <Route path="/leads" element={<ProtectedRoute requiredSection="leads"><Leads /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute requiredSection="tasks"><Tasks /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute requiredSection="projects"><Projects /></ProtectedRoute>} />
          <Route path="/meetings" element={<ProtectedRoute requiredSection="meetings"><Meetings /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute requiredSection="calendar"><Calendar /></ProtectedRoute>} />
          <Route path="/organizations" element={<ProtectedRoute requiredSection="organizations"><Organizations /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute requiredRole={['admin', 'manager', 'executive']} requiredSection="documents"><Documents /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute requiredRole={['admin', 'executive']} requiredSection="audit"><AuditLogs /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute requiredRole={['admin', 'manager']}><Settings /></ProtectedRoute>} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

// Base path for subfolder deployment (e.g. /crm). Root = empty string.
const getBasename = () => {
  const pub = process.env.PUBLIC_URL || '';
  if (!pub) return '';
  try {
    return pub.startsWith('http') ? new URL(pub).pathname.replace(/\/$/, '') : pub.replace(/\/$/, '');
  } catch {
    return '';
  }
};

function App() {
  return (
    <Router basename={getBasename()}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
