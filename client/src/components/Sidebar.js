import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  FiHome, FiUsers, FiTruck, FiPackage, FiShoppingCart,
  FiMenu, FiX, FiCheckSquare, FiFolder, FiCalendar, 
  FiClock, FiBriefcase, FiSettings, FiLogOut, FiFileText,
  FiShield, FiActivity, FiMail, FiMessageCircle, FiTrendingUp, FiPhoneCall, FiTarget
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole, hasPermission } = useContext(AuthContext);
  const [isOpen, setIsOpen] = React.useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', icon: FiHome, label: 'Dashboard', section: 'dashboard' },
    { path: '/emails', icon: FiMail, label: 'Email', section: 'emails' },
    { path: '/chat', icon: FiMessageCircle, label: 'Chat', section: 'chat' },
    { path: '/calls', icon: FiPhoneCall, label: 'Calls', section: 'calls' },
    { path: '/tasks', icon: FiCheckSquare, label: 'Tasks & Projects', section: 'tasks' },
    { path: '/projects', icon: FiFolder, label: 'Projects', section: 'projects' },
    { path: '/organizations', icon: FiBriefcase, label: 'Contacts & Organizations', section: 'organizations' },
    { path: '/documents', icon: FiFileText, label: 'Documents', roles: ['admin', 'manager', 'executive'], section: 'documents' },
    { path: '/calendar', icon: FiCalendar, label: 'Calendar & Scheduling', section: 'calendar' },
    { path: '/meetings', icon: FiClock, label: 'Meetings', section: 'meetings' },
    { path: '/customers', icon: FiUsers, label: 'Customers', section: 'customers' },
    { path: '/suppliers', icon: FiTruck, label: 'Suppliers', section: 'suppliers' },
    { path: '/products', icon: FiPackage, label: 'Products', section: 'products' },
    { path: '/orders', icon: FiShoppingCart, label: 'Orders', section: 'orders' },
    { path: '/leads', icon: FiTarget, label: 'Leads', section: 'leads' },
    { path: '/revenue', icon: FiTrendingUp, label: 'Revenue', section: 'revenue' },
  ];

  const adminItems = [
    { path: '/audit', icon: FiActivity, label: 'Audit Logs', roles: ['admin', 'executive'], section: 'audit' },
  ];

  const settingsItems = [
    ...(hasRole(['admin', 'manager']) ? [{ path: '/settings', icon: FiSettings, label: 'Settings' }] : []),
  ];

  return (
    <>
      <button className="mobile-menu-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <FiX /> : <FiMenu />}
      </button>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>Refined CRM</h1>
          {user && (
            <div className="user-info">
              <div className="user-avatar">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <div className="user-name">{user.name}</div>
                <div className="user-role">{user.role}</div>
              </div>
            </div>
          )}
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            // Check role-based access
            if (item.roles && user && !item.roles.includes(user.role)) {
              return null;
            }
            // Check section permission
            if (item.section && !hasPermission(item.section)) {
              return null;
            }
            
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => window.innerWidth < 768 && setIsOpen(false)}
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {adminItems.length > 0 && user && ['admin', 'executive'].includes(user.role) && (
            <>
              <div className="nav-divider"></div>
              {adminItems.map((item) => {
                if (item.roles && !item.roles.includes(user.role)) {
                  return null;
                }
                if (item.section && !hasPermission(item.section)) {
                  return null;
                }
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => window.innerWidth < 768 && setIsOpen(false)}
                  >
                    <Icon className="nav-icon" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
          {settingsItems.length > 0 && (
            <>
              <div className="nav-divider"></div>
              {settingsItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => window.innerWidth < 768 && setIsOpen(false)}
                  >
                    <Icon className="nav-icon" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
          <div className="nav-divider"></div>
          <button className="nav-item logout-button" onClick={handleLogout}>
            <FiLogOut className="nav-icon" />
            <span>Logout</span>
          </button>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
