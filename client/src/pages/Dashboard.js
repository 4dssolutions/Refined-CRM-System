import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getDashboardStats, getOrders, getLeads, getDashboardActivity } from '../services/api';
import { formatCurrency, formatDate, formatDateTime, formatTime } from '../utils/format';
import { FiUsers, FiTruck, FiPackage, FiShoppingCart, FiDollarSign, FiAlertCircle, FiTarget, FiMessageCircle, FiPhoneCall, FiClock, FiCheckSquare, FiFolder } from 'react-icons/fi';
import Chart from '../components/Chart';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [activity, setActivity] = useState({ tasks: [], meetings: [], calls: [], chatMessages: [], projects: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAll = async () => {
    try {
      const [statsRes, ordersRes, leadsRes, activityRes] = await Promise.all([
        getDashboardStats(),
        getOrders(),
        getLeads().catch(() => ({ data: [] })),
        getDashboardActivity().catch(() => ({ data: {} }))
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
      setLeads(leadsRes.data || []);
      setActivity({
        tasks: activityRes.data?.tasks || [],
        meetings: activityRes.data?.meetings || [],
        calls: activityRes.data?.calls || [],
        chatMessages: activityRes.data?.chatMessages || [],
        projects: activityRes.data?.projects || []
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const urgentTasks = activity.tasks.filter(t => {
    if (t.priority === 'high') return true;
    if (!t.due_date) return false;
    const due = new Date(t.due_date);
    return due >= now && due <= inSevenDays;
  });
  const otherTasks = activity.tasks.filter(t => !urgentTasks.includes(t));
  const displayTasks = [...urgentTasks, ...otherTasks].slice(0, 5);
  const upcomingMeetings = activity.meetings
    .filter(m => m.start_time && new Date(m.start_time) >= now)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 5);
  const recentMeetings = activity.meetings
    .filter(m => !upcomingMeetings.includes(m))
    .slice(0, 5 - upcomingMeetings.length);
  const displayMeetings = [...upcomingMeetings, ...recentMeetings].slice(0, 5);

  const getOrderStatusData = () => {
    if (!orders.length) return [];
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(statusCounts).map(([status, count]) => ({
      label: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: status === 'delivered' ? '#808080' : status === 'shipped' ? '#666666' : status === 'processing' ? '#999999' : status === 'pending' ? '#b0b0b0' : '#d0d0d0'
    }));
  };

  const getRecentOrdersChart = () => {
    const recent = orders.slice(0, 7).reverse();
    return recent.map((order, index) => ({
      label: order.order_number?.slice(-4) || `${index + 1}`,
      value: parseFloat(order.total_amount || 0)
    }));
  };

  if (loading) return <div className="dashboard-loading">Loading dashboard...</div>;
  if (!stats) return <div className="dashboard-error">Error loading dashboard data</div>;

  const statCards = [
    { icon: FiUsers, label: 'Active Customers', value: stats.totalCustomers, path: '/customers' },
    { icon: FiTruck, label: 'Suppliers', value: stats.totalSuppliers, path: '/suppliers' },
    { icon: FiPackage, label: 'Products', value: stats.totalProducts, path: '/products' },
    { icon: FiShoppingCart, label: 'Total Orders', value: stats.totalOrders, path: '/orders' },
    { icon: FiShoppingCart, label: 'Pending Orders', value: stats.pendingOrders, path: '/orders?status=pending' },
    { icon: FiTarget, label: 'Leads', value: leads.length, path: '/leads' },
    { icon: FiDollarSign, label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), path: '/revenue' },
  ];

  return (
    <div className="dashboard">
      <div>
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Welcome back, {user?.name}. Here's your overview.</p>
      </div>

      <div className="stats-grid">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} to={stat.path} className="stat-card-link">
              <div className="stat-card">
                <div className="stat-icon"><Icon /></div>
                <div className="stat-content">
                  <p className="stat-label">{stat.label}</p>
                  <p className="stat-value">{stat.value}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="recent-orders-section leads-section">
        <div className="section-header-with-link">
          <h2>Recent Leads</h2>
          <Link to="/leads" className="view-all-link">View all leads →</Link>
        </div>
        <div className="orders-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assigned to</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.length > 0 ? (
                leads.slice(0, 5).map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.name}</td>
                    <td>{lead.company || '—'}</td>
                    <td><span className={`status-badge status-${lead.status || 'new'}`}>{lead.status || 'new'}</span></td>
                    <td>{lead.priority || '—'}</td>
                    <td>{lead.assigned_to_name || '—'}</td>
                    <td>{formatDate(lead.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No leads yet. <Link to="/leads">Add leads</Link></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dashboard-charts">
        <Chart data={getOrderStatusData()} type="bar" title="Orders by Status" height={200} emptyMessage="No orders yet. Create orders to see status breakdown." />
        <Chart data={getRecentOrdersChart()} type="bar" title="Recent Orders Revenue" height={200} emptyMessage="No orders yet. Create orders to see revenue chart." />
      </div>

      {stats.lowStockProducts && stats.lowStockProducts.length > 0 && (
        <div className="alert-section">
          <div className="alert-header">
            <FiAlertCircle className="alert-icon" />
            <h2>Low Stock Alert</h2>
            <span className="alert-count">{stats.lowStockProducts.length}</span>
          </div>
          <div className="alert-grid">
            {stats.lowStockProducts.map((product) => (
              <div key={product.id} className="alert-card">
                <h3>{product.name}</h3>
                <p className="alert-sku">SKU: {product.sku}</p>
                <p className="alert-stock">
                  Stock: <span className="alert-value">{product.stock_quantity}</span> /
                  Min: <span className="alert-value">{product.min_stock_level}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="recent-orders-section">
        <h2>Recent Orders</h2>
        <div className="orders-table">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.order_number}</td>
                    <td>{order.customer_name || 'N/A'}</td>
                    <td><span className={`status-badge status-${order.status}`}>{order.status}</span></td>
                    <td>{formatCurrency(order.total_amount)}</td>
                    <td>{formatDate(order.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No recent orders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
