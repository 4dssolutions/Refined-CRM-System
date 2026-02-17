import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ padding: '8px 16px', background: '#2563eb', color: 'white', fontSize: '14px' }}>
        Refined CRM
      </div>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </div>
  </React.StrictMode>
);
