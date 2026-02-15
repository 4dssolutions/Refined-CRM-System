import React, { useState, useEffect } from 'react';
import { getOrders, getCustomers, getProducts } from '../services/api';
import { formatCurrency, SA_LOCALE } from '../utils/format';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiCalendar, FiShoppingCart } from 'react-icons/fi';
import Chart from '../components/Chart';
import './Revenue.css';

const Revenue = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all'); // all, month, week, today

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        getOrders(),
        getCustomers(),
        getProducts()
      ]);
      setOrders(ordersRes.data);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading revenue data:', error);
      setLoading(false);
    }
  };

  const filterOrdersByDate = (ordersList) => {
    const now = new Date();
    let startDate;
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      default:
        return ordersList;
    }

    return ordersList.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate && orderDate <= endDate;
    });
  };

  const calculateStats = () => {
    const filteredOrders = filterOrdersByDate(orders);
    const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');
    
    const totalRevenue = deliveredOrders.reduce((sum, order) => {
      return sum + parseFloat(order.total_amount || 0);
    }, 0);

    const averageOrderValue = deliveredOrders.length > 0 
      ? totalRevenue / deliveredOrders.length 
      : 0;

    const totalOrders = filteredOrders.length;
    const completedOrders = deliveredOrders.length;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Calculate revenue by customer
    const revenueByCustomer = {};
    deliveredOrders.forEach(order => {
      const customerId = order.customer_id;
      if (!revenueByCustomer[customerId]) {
        revenueByCustomer[customerId] = {
          name: order.customer_name || 'Unknown',
          revenue: 0,
          orders: 0
        };
      }
      revenueByCustomer[customerId].revenue += parseFloat(order.total_amount || 0);
      revenueByCustomer[customerId].orders += 1;
    });

    // Calculate revenue by product
    const revenueByProduct = {};
    deliveredOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const productId = item.product_id;
          if (!revenueByProduct[productId]) {
            revenueByProduct[productId] = {
              name: item.product_name || 'Unknown',
              revenue: 0,
              quantity: 0
            };
          }
          revenueByProduct[productId].revenue += parseFloat(item.total_price || 0);
          revenueByProduct[productId].quantity += parseInt(item.quantity || 0);
        });
      }
    });

    return {
      totalRevenue,
      averageOrderValue,
      totalOrders,
      completedOrders,
      completionRate,
      revenueByCustomer: Object.values(revenueByCustomer).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      revenueByProduct: Object.values(revenueByProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
    };
  };

  const getRevenueChartData = () => {
    const filteredOrders = filterOrdersByDate(orders).filter(o => o.status === 'delivered');
    const dailyRevenue = {};
    
    if (filteredOrders.length === 0) {
      return [{ label: 'No Data', value: 0 }];
    }
    
    filteredOrders.forEach(order => {
      let date;
      if (dateRange === 'today') {
        // Group by hour for today
        const orderDate = new Date(order.created_at);
        date = `${String(orderDate.getHours()).padStart(2, '0')}:00`;
      } else if (dateRange === 'week') {
        // Group by day for week
        date = new Date(order.created_at).toLocaleDateString(SA_LOCALE, { weekday: 'short', day: 'numeric' });
      } else if (dateRange === 'month') {
        // Group by day for month
        date = new Date(order.created_at).toLocaleDateString(SA_LOCALE, { month: 'short', day: 'numeric' });
      } else {
        // Group by month for all time
        date = new Date(order.created_at).toLocaleDateString(SA_LOCALE, { month: 'short', year: 'numeric' });
      }
      
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = 0;
      }
      dailyRevenue[date] += parseFloat(order.total_amount || 0);
    });

    const sortedEntries = Object.entries(dailyRevenue).sort((a, b) => {
      if (dateRange === 'today') {
        return a[0].localeCompare(b[0]);
      }
      // Try to parse as date, fallback to string comparison
      try {
        return new Date(a[0]) - new Date(b[0]);
      } catch {
        return a[0].localeCompare(b[0]);
      }
    });

    return sortedEntries.map(([date, revenue]) => ({
      label: date,
      value: revenue
    }));
  };

  const getCustomerChartData = () => {
    const stats = calculateStats();
    if (stats.revenueByCustomer.length === 0) {
      return [{ label: 'No Data', value: 0 }];
    }
    return stats.revenueByCustomer.map(customer => ({
      label: customer.name.length > 15 ? customer.name.substring(0, 15) + '...' : customer.name,
      value: customer.revenue
    }));
  };

  const getProductChartData = () => {
    const stats = calculateStats();
    if (stats.revenueByProduct.length === 0) {
      return [{ label: 'No Data', value: 0 }];
    }
    return stats.revenueByProduct.map(product => ({
      label: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
      value: product.revenue
    }));
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    // Scroll to stats section smoothly
    setTimeout(() => {
      const statsSection = document.getElementById('revenue-stats');
      if (statsSection) {
        const offset = 100; // Offset for fixed headers
        const elementPosition = statsSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  if (loading) {
    return <div className="revenue-loading">Loading revenue data...</div>;
  }

  const stats = calculateStats();

  return (
    <div className="revenue-page">
      <div className="revenue-header">
        <div>
          <h1 className="revenue-title">Revenue Analytics</h1>
          <p className="revenue-subtitle">
            {dateRange === 'today' && 'Today\'s business performance and financial metrics'}
            {dateRange === 'week' && 'This week\'s business performance and financial metrics'}
            {dateRange === 'month' && 'This month\'s business performance and financial metrics'}
            {dateRange === 'all' && 'Track your business performance and financial metrics'}
          </p>
        </div>
        <div className="date-range-selector">
          <button
            className={`date-range-btn ${dateRange === 'today' ? 'active' : ''}`}
            onClick={() => handleDateRangeChange('today')}
          >
            Today
          </button>
          <button
            className={`date-range-btn ${dateRange === 'week' ? 'active' : ''}`}
            onClick={() => handleDateRangeChange('week')}
          >
            Week
          </button>
          <button
            className={`date-range-btn ${dateRange === 'month' ? 'active' : ''}`}
            onClick={() => handleDateRangeChange('month')}
          >
            Month
          </button>
          <button
            className={`date-range-btn ${dateRange === 'all' ? 'active' : ''}`}
            onClick={() => handleDateRangeChange('all')}
          >
            All Time
          </button>
        </div>
      </div>

      <div id="revenue-stats" className="revenue-stats-grid">
        <div className="revenue-stat-card primary">
          <div className="revenue-stat-icon">
            <FiDollarSign />
          </div>
          <div className="revenue-stat-content">
            <p className="revenue-stat-label">
              {dateRange === 'today' && 'Today\'s Revenue'}
              {dateRange === 'week' && 'This Week\'s Revenue'}
              {dateRange === 'month' && 'This Month\'s Revenue'}
              {dateRange === 'all' && 'Total Revenue'}
            </p>
            <p className="revenue-stat-value">{formatCurrency(stats.totalRevenue)}</p>
          </div>
        </div>

        <div className="revenue-stat-card">
          <div className="revenue-stat-icon">
            <FiShoppingCart />
          </div>
          <div className="revenue-stat-content">
            <p className="revenue-stat-label">
              {dateRange === 'today' && 'Today\'s Orders'}
              {dateRange === 'week' && 'This Week\'s Orders'}
              {dateRange === 'month' && 'This Month\'s Orders'}
              {dateRange === 'all' && 'Total Orders'}
            </p>
            <p className="revenue-stat-value">{stats.totalOrders}</p>
          </div>
        </div>

        <div className="revenue-stat-card">
          <div className="revenue-stat-icon">
            <FiTrendingUp />
          </div>
          <div className="revenue-stat-content">
            <p className="revenue-stat-label">Average Order Value</p>
            <p className="revenue-stat-value">{formatCurrency(stats.averageOrderValue)}</p>
          </div>
        </div>

        <div className="revenue-stat-card">
          <div className="revenue-stat-icon">
            <FiCalendar />
          </div>
          <div className="revenue-stat-content">
            <p className="revenue-stat-label">Completion Rate</p>
            <p className="revenue-stat-value">{stats.completionRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div id="revenue-charts" className="revenue-charts-grid">
        <div className="revenue-chart-card">
          <h3>
            {dateRange === 'today' && 'Today\'s Revenue Over Time'}
            {dateRange === 'week' && 'This Week\'s Revenue Over Time'}
            {dateRange === 'month' && 'This Month\'s Revenue Over Time'}
            {dateRange === 'all' && 'Revenue Over Time'}
          </h3>
          <Chart
            data={getRevenueChartData()}
            type="line"
            title=""
            height={250}
          />
        </div>

        <div className="revenue-chart-card">
          <h3>
            {dateRange === 'today' && 'Today\'s Top Customers by Revenue'}
            {dateRange === 'week' && 'This Week\'s Top Customers by Revenue'}
            {dateRange === 'month' && 'This Month\'s Top Customers by Revenue'}
            {dateRange === 'all' && 'Top Customers by Revenue'}
          </h3>
          <Chart
            data={getCustomerChartData()}
            type="bar"
            title=""
            height={250}
          />
        </div>
      </div>

      <div id="revenue-tables" className="revenue-tables-grid">
        <div className="revenue-table-card">
          <h3>
            {dateRange === 'today' && 'Today\'s Top Customers'}
            {dateRange === 'week' && 'This Week\'s Top Customers'}
            {dateRange === 'month' && 'This Month\'s Top Customers'}
            {dateRange === 'all' && 'Top Customers'}
          </h3>
          <div className="revenue-table-container">
            <table className="revenue-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.revenueByCustomer.length > 0 ? (
                  stats.revenueByCustomer.map((customer, index) => (
                    <tr key={index}>
                      <td>{customer.name}</td>
                      <td>{customer.orders}</td>
                      <td>{formatCurrency(customer.revenue)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="empty-state">No customer data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="revenue-table-card">
          <h3>
            {dateRange === 'today' && 'Today\'s Top Products'}
            {dateRange === 'week' && 'This Week\'s Top Products'}
            {dateRange === 'month' && 'This Month\'s Top Products'}
            {dateRange === 'all' && 'Top Products'}
          </h3>
          <div className="revenue-table-container">
            <table className="revenue-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.revenueByProduct.length > 0 ? (
                  stats.revenueByProduct.map((product, index) => (
                    <tr key={index}>
                      <td>{product.name}</td>
                      <td>{product.quantity}</td>
                      <td>{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="empty-state">No product data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Revenue;
