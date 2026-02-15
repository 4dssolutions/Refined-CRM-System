import React, { useState, useEffect, useContext } from 'react';
import { getAuditLogs } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { FiSearch, FiFilter } from 'react-icons/fi';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import ExportButton from '../components/ExportButton';
import './Customers.css';

const AuditLogs = () => {
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (user && ['admin', 'executive'].includes(user.role)) {
      loadLogs();
    }
  }, [user]);

  useEffect(() => {
    let filtered = logs;
    
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (entityTypeFilter) {
      filtered = filtered.filter(log => log.entity_type === entityTypeFilter);
    }
    
    setFilteredLogs(filtered);
  }, [searchTerm, entityTypeFilter, logs]);

  const loadLogs = async () => {
    try {
      const params = {};
      if (dateRange.start) params.start_date = dateRange.start;
      if (dateRange.end) params.end_date = dateRange.end;
      if (entityTypeFilter) params.entity_type = entityTypeFilter;
      
      const response = await getAuditLogs(params);
      setLogs(response.data);
      setFilteredLogs(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setLoading(false);
    }
  };

  const exportHeaders = ['Date', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address'];
  const exportRows = filteredLogs.map(log => [
    new Date(log.created_at).toLocaleString('en-ZA'),
    log.user_name || 'N/A', log.action || '',
    log.entity_type || '', log.entity_id || '', log.ip_address || ''
  ]);

  if (!user || !['admin', 'executive'].includes(user.role)) {
    return (
      <div className="customers-page">
        <div className="page-header">
          <h1>Access Denied</h1>
        </div>
        <p>You do not have permission to view audit logs.</p>
      </div>
    );
  }

  if (loading) return <div className="page-loading">Loading audit logs...</div>;

  const entityTypes = [...new Set(logs.map(l => l.entity_type).filter(Boolean))];

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Audit Logs</h1>
          <p className="page-subtitle">Complete activity trail and accountability records</p>
        </div>
        <ExportButton fileName="audit_logs" headers={exportHeaders} rows={exportRows} title="Audit Logs" />
      </div>

      <div className="page-toolbar">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search audit logs..." />
        <FilterBar
          filters={[
            {
              key: 'entity_type',
              label: 'Entity Type',
              value: entityTypeFilter,
              options: entityTypes.map(type => ({ value: type, label: type }))
            }
          ]}
          onFilterChange={(key, value) => {
            setEntityTypeFilter(value);
            loadLogs();
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => {
              setDateRange({ ...dateRange, start: e.target.value });
              setTimeout(loadLogs, 100);
            }}
            placeholder="Start Date"
            style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => {
              setDateRange({ ...dateRange, end: e.target.value });
              setTimeout(loadLogs, 100);
            }}
            placeholder="End Date"
            style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
          />
        </div>
      </div>

      <div className="table-container">
        <div className="table-header-info">
          <span>Showing {filteredLogs.length} of {logs.length} audit entries</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
              <th>IP Address</th>
              <th>Changes</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">No audit logs found</td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.user_name || 'N/A'}</td>
                  <td>
                    <span className={`status-badge status-${log.action}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.entity_type || '-'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {log.entity_id ? log.entity_id.substring(0, 8) + '...' : '-'}
                  </td>
                  <td>{log.ip_address || '-'}</td>
                  <td>
                    {log.changes ? (
                      <details style={{ cursor: 'pointer' }}>
                        <summary style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>View Changes</summary>
                        <pre style={{ marginTop: '0.5rem', fontSize: '0.75rem', background: '#f5f5f5', padding: '0.5rem', borderRadius: '4px', overflow: 'auto' }}>
                          {JSON.stringify(JSON.parse(log.changes), null, 2)}
                        </pre>
                      </details>
                    ) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogs;
