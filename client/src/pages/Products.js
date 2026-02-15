import React, { useState, useEffect } from 'react';
import { getProducts, getSuppliers, createProduct, updateProduct, deleteProduct } from '../services/api';
import { formatCurrency } from '../utils/format';
import { FiPlus, FiEdit, FiTrash2, FiX, FiAlertTriangle } from 'react-icons/fi';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButton from '../components/ExportButton';
import './Customers.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    price: '',
    cost: '',
    stock_quantity: '',
    min_stock_level: '',
    supplier_id: '',
    status: 'active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, suppliersRes] = await Promise.all([
        getProducts(),
        getSuppliers()
      ]);
      setProducts(productsRes.data);
      setFilteredProducts(productsRes.data);
      setSuppliers(suppliersRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(product => product.status === statusFilter);
    }

    setFilteredProducts(filtered);
  }, [searchTerm, categoryFilter, statusFilter, products]);

  const exportHeaders = ['SKU', 'Name', 'Category', 'Price (R)', 'Stock', 'Min Level', 'Status'];
  const exportRows = filteredProducts.map(p => [
    p.sku || '', p.name || '', p.category || '',
    p.price || 0, p.stock_quantity || 0, p.min_stock_level || 0, p.status || ''
  ]);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        min_stock_level: parseInt(formData.min_stock_level) || 0,
        supplier_id: formData.supplier_id || null
      };
      
      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
      } else {
        await createProduct(data);
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product. Please try again.');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku || '',
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      price: product.price || '',
      cost: product.cost || '',
      stock_quantity: product.stock_quantity || '',
      min_stock_level: product.min_stock_level || '',
      supplier_id: product.supplier_id || '',
      status: product.status || 'active'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
        loadData();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      category: '',
      price: '',
      cost: '',
      stock_quantity: '',
      min_stock_level: '',
      supplier_id: '',
      status: 'active'
    });
    setEditingProduct(null);
  };

  const isLowStock = (product) => {
    return product.stock_quantity <= product.min_stock_level;
  };

  if (loading) {
    return <div className="page-loading">Loading products...</div>;
  }

  return (
    <div className="products-page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p className="page-subtitle">Manage inventory and product catalog</p>
        </div>
        <div className="header-actions">
          <ExportButton fileName="products" headers={exportHeaders} rows={exportRows} title="Products" />
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus /> Add Product
          </button>
        </div>
      </div>

      <div className="page-toolbar">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search products by name, SKU..."
        />
        {categories.length > 0 && (
          <FilterBar
            filters={[
              {
                key: 'category',
                label: 'Category',
                value: categoryFilter,
                options: categories.map(cat => ({ value: cat, label: cat }))
              },
              {
                key: 'status',
                label: 'Status',
                value: statusFilter,
                options: [
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]
              }
            ]}
            onFilterChange={(key, value) => {
              if (key === 'category') setCategoryFilter(value);
              if (key === 'status') setStatusFilter(value);
            }}
          />
        )}
        {categories.length === 0 && (
          <FilterBar
            filters={[{
              key: 'status',
              label: 'Status',
              value: statusFilter,
              options: [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]
            }]}
            onFilterChange={(key, value) => setStatusFilter(value)}
          />
        )}
      </div>

      <div className="table-container">
        <div className="table-header-info">
          <span>Showing {filteredProducts.length} of {products.length} products</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Min Level</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-state">
                  {products.length === 0 ? 'No products found' : 'No products match your search'}
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} className={isLowStock(product) ? 'low-stock-row' : ''}>
                  <td>{product.sku}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {product.name}
                      {isLowStock(product) && (
                        <FiAlertTriangle style={{ color: '#ef4444' }} title="Low Stock" />
                      )}
                    </div>
                  </td>
                  <td>{product.category || '-'}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>
                    <span className={isLowStock(product) ? 'low-stock' : ''}>
                      {product.stock_quantity}
                    </span>
                  </td>
                  <td>{product.min_stock_level}</td>
                  <td>{product.supplier_name || '-'}</td>
                  <td>
                    <span className={`status-badge status-${product.status}`}>
                      {product.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" onClick={() => handleEdit(product)}>
                        <FiEdit />
                      </button>
                      <button className="btn-icon btn-danger" onClick={() => handleDelete(product.id)}>
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button className="btn-icon" onClick={() => { setShowModal(false); resetForm(); }}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Supplier</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} {supplier.company ? `(${supplier.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Price (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Cost (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Min Stock Level</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
