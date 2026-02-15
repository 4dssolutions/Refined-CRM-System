import React from 'react';
import './Chart.css';

const Chart = ({ data, type = 'bar', title, height = 200, emptyMessage = 'No data to display' }) => {
  const safeData = Array.isArray(data) ? data : [];
  const maxValue = safeData.length ? Math.max(...safeData.map(d => d.value), 1) : 1;

  if (safeData.length === 0) {
    return (
      <div className="chart-container chart-empty">
        {title && <h3 className="chart-title">{title}</h3>}
        <div className="chart-empty-state" style={{ height: `${height}px` }}>
          <span>{emptyMessage}</span>
        </div>
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div className="chart-container">
        {title && <h3 className="chart-title">{title}</h3>}
        <div className="chart-bar-container" style={{ height: `${height}px` }}>
          {safeData.map((item, index) => (
            <div key={index} className="chart-bar-item">
              <div className="chart-bar-wrapper">
                <div
                  className="chart-bar"
                  style={{
                    height: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color || '#000000'
                  }}
                  title={`${item.label}: ${item.value}`}
                />
              </div>
              <span className="chart-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div className="chart-container">
        {title && <h3 className="chart-title">{title}</h3>}
        <svg className="chart-line" viewBox={`0 0 400 ${height}`}>
          <polyline
            fill="none"
            stroke="#000000"
            strokeWidth="2"
            points={safeData.map((item, index) => {
              const x = (index / Math.max(safeData.length - 1, 1)) * 400;
              const y = height - (item.value / maxValue) * (height - 40);
              return `${x},${y}`;
            }).join(' ')}
          />
          {safeData.map((item, index) => {
            const x = (index / Math.max(safeData.length - 1, 1)) * 400;
            const y = height - (item.value / maxValue) * (height - 40);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="#000000"
              />
            );
          })}
        </svg>
        <div className="chart-line-labels">
          {safeData.map((item, index) => (
            <span key={index}>{item.label}</span>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default Chart;
