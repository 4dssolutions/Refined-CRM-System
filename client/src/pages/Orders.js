import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getOrders, getOrder, getCustomers, getProducts, createOrder, updateOrder } from '../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';
import { FiPlus, FiEdit, FiX, FiTrash2, FiEye } from 'react-icons/fi';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButton from '../components/ExportButton';
import './Customers.css';

const Orders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [formData, setFormData] = useState({
    customer_id: '',
    shipping_street: '',
    shipping_suburb: '',
    shipping_town: '',
    shipping_province: '',
    shipping_postal_code: '',
    notes: '',
    items: [{ product_id: '', quantity: 1 }]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        getOrders(),
        getCustomers(),
        getProducts()
      ]);
      setOrders(ordersRes.data);
      setFilteredOrders(ordersRes.data);
      setCustomers(customersRes.data);
      setProducts(productsRes.data.filter(p => p.status === 'active'));
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Update status filter from URL params on mount
    const urlStatus = searchParams.get('status');
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  useEffect(() => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
    
    // Update URL when status filter changes
    if (statusFilter) {
      setSearchParams({ status: statusFilter }, { replace: true });
    } else if (searchParams.get('status')) {
      setSearchParams({}, { replace: true });
    }
  }, [searchTerm, statusFilter, orders, searchParams, setSearchParams]);

  const handleViewOrder = async (orderId) => {
    try {
      const response = await getOrder(orderId);
      setSelectedOrder(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading order details:', error);
    }
  };

  const exportHeaders = ['Order #', 'Customer', 'Items', 'Total (R)', 'Status', 'Date'];
  const exportRows = filteredOrders.map(o => [
    o.order_number || '', o.customer_name || '', o.items?.length || 0,
    o.total_amount || 0, o.status || '', formatDate(o.created_at)
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Build combined shipping address from parts
      const shippingParts = [
        formData.shipping_street,
        formData.shipping_suburb,
        formData.shipping_town,
        formData.shipping_province,
        formData.shipping_postal_code
      ].filter(Boolean);
      const shipping_address = shippingParts.join(', ');

      const data = {
        customer_id: formData.customer_id,
        shipping_address,
        notes: formData.notes,
        items: formData.items.filter(item => item.product_id && item.quantity > 0)
      };

      if (!editingOrder && data.items.length === 0) {
        alert('Please add at least one item to the order');
        return;
      }

      if (editingOrder) {
        await updateOrder(editingOrder.id, {
          status: editingOrder.status,
          shipping_address,
          notes: formData.notes
        });
      } else {
        await createOrder(data);
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Error saving order. Please try again.');
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    // Parse existing shipping_address back into parts
    const addrParts = (order.shipping_address || '').split(',').map(s => s.trim());
    setFormData({
      customer_id: order.customer_id || '',
      shipping_street: addrParts[0] || '',
      shipping_suburb: addrParts[1] || '',
      shipping_town: addrParts[2] || '',
      shipping_province: addrParts[3] || '',
      shipping_postal_code: addrParts[4] || '',
      notes: order.notes || '',
      items: order.items && order.items.length > 0 
        ? order.items.map(item => ({ product_id: item.product_id, quantity: item.quantity }))
        : [{ product_id: '', quantity: 1 }]
    });
    setShowModal(true);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1 }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems.length > 0 ? newItems : [{ product_id: '', quantity: 1 }] });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => {
    let total = 0;
    formData.items.forEach(item => {
      if (item.product_id) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          total += parseFloat(product.price || 0) * parseInt(item.quantity || 0);
        }
      }
    });
    return total.toFixed(2);
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      shipping_street: '',
      shipping_suburb: '',
      shipping_town: '',
      shipping_province: '',
      shipping_postal_code: '',
      notes: '',
      items: [{ product_id: '', quantity: 1 }]
    });
    setEditingOrder(null);
  };

  if (loading) {
    return <div className="page-loading">Loading orders...</div>;
  }

  return (
    <div className="orders-page">
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p className="page-subtitle">Track and manage customer orders</p>
        </div>
        <div className="header-actions">
          <ExportButton fileName="orders" headers={exportHeaders} rows={exportRows} title="Orders" />
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus /> Create Order
          </button>
        </div>
      </div>

      <div className="page-toolbar">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by order number or customer..."
        />
        <FilterBar
          filters={[{
            key: 'status',
            label: 'Status',
            value: statusFilter,
            options: [
              { value: 'pending', label: 'Pending' },
              { value: 'processing', label: 'Processing' },
              { value: 'shipped', label: 'Shipped' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'cancelled', label: 'Cancelled' }
            ]
          }]}
          onFilterChange={(key, value) => setStatusFilter(value)}
        />
      </div>

      <div className="table-container">
        <div className="table-header-info">
          <span>Showing {filteredOrders.length} of {orders.length} orders</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">
                  {orders.length === 0 ? 'No orders found' : 'No orders match your search'}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.order_number}</td>
                  <td>{order.customer_name || 'N/A'}</td>
                  <td>{order.items ? order.items.length : 0} item(s)</td>
                  <td>{formatCurrency(order.total_amount)}</td>
                  <td>
                    <span className={`status-badge status-${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{formatDate(order.created_at)}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => handleViewOrder(order.id)} title="View Details">
                        <FiEye />
                      </button>
                      <button className="btn-icon" onClick={() => handleEdit(order)} title="Edit">
                        <FiEdit />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showDetailModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => { setShowDetailModal(false); setSelectedOrder(null); }}>
          <div className="modal-content order-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Order Details</h2>
                <p className="order-number">{selectedOrder.order_number}</p>
              </div>
              <button className="btn-icon" onClick={() => { setShowDetailModal(false); setSelectedOrder(null); }}>
                <FiX />
              </button>
            </div>
            <div className="order-detail-content">
              <div className="order-detail-section">
                <h3>Customer Information</h3>
                <p><strong>Name:</strong> {selectedOrder.customer_name || 'N/A'}</p>
                <p><strong>Email:</strong> {selectedOrder.customer_email || 'N/A'}</p>
                <p><strong>Phone:</strong> {selectedOrder.customer_phone || 'N/A'}</p>
              </div>
              <div className="order-detail-section">
                <h3>Order Information</h3>
                <p><strong>Status:</strong> <span className={`status-badge status-${selectedOrder.status}`}>{selectedOrder.status}</span></p>
                <p><strong>Created:</strong> {formatDateTime(selectedOrder.created_at)}</p>
                {selectedOrder.shipped_at && <p><strong>Shipped:</strong> {formatDateTime(selectedOrder.shipped_at)}</p>}
                {selectedOrder.delivered_at && <p><strong>Delivered:</strong> {formatDateTime(selectedOrder.delivered_at)}</p>}
                {selectedOrder.shipping_address && <p><strong>Shipping Address:</strong> {selectedOrder.shipping_address}</p>}
              </div>
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="order-detail-section">
                  <h3>Order Items</h3>
                  <table className="order-items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.product_name || 'N/A'}</td>
                          <td>{item.sku || 'N/A'}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.unit_price)}</td>
                          <td>{formatCurrency(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'right', fontWeight: 600 }}>Total:</td>
                        <td style={{ fontWeight: 700, fontSize: '1.125rem' }}>{formatCurrency(selectedOrder.total_amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {selectedOrder.notes && (
                <div className="order-detail-section">
                  <h3>Notes</h3>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>{editingOrder ? 'Edit Order' : 'Create Order'}</h2>
              <button className="btn-icon" onClick={() => { setShowModal(false); resetForm(); }}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Customer *</label>
                <select
                  required
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                >
                  <option value="">Select Customer</option>
                  {customers.filter(c => c.status === 'active').map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.company ? `(${customer.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Street Name</label>
                <input
                  type="text"
                  value={formData.shipping_street}
                  onChange={(e) => setFormData({ ...formData, shipping_street: e.target.value })}
                  placeholder="e.g. 123 Main Street"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Suburb</label>
                  <input
                    type="text"
                    value={formData.shipping_suburb}
                    onChange={(e) => setFormData({ ...formData, shipping_suburb: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Town</label>
                  <input
                    type="text"
                    value={formData.shipping_town}
                    onChange={(e) => setFormData({ ...formData, shipping_town: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Province</label>
                  <input
                    type="text"
                    value={formData.shipping_province}
                    onChange={(e) => setFormData({ ...formData, shipping_province: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    value={formData.shipping_postal_code}
                    onChange={(e) => setFormData({ ...formData, shipping_postal_code: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Order Items *</label>
                {formData.items.map((item, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    marginBottom: '1rem',
                    alignItems: 'flex-end'
                  }}>
                    <div style={{ flex: 2 }}>
                      <select
                        required
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                        style={{ marginBottom: 0 }}
                      >
                        <option value="">Select Product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} (SKU: {product.sku}) - Stock: {product.stock_quantity}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        placeholder="Qty"
                      />
                    </div>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        className="btn-icon btn-danger"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddItem}
                  style={{ marginTop: '0.5rem' }}
                >
                  Add Item
                </button>
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <strong>Total: {formatCurrency(calculateTotal())}</strong>
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {editingOrder && (
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editingOrder.status}
                    onChange={(e) => {
                      const updatedOrder = { ...editingOrder, status: e.target.value };
                      setEditingOrder(updatedOrder);
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingOrder ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
