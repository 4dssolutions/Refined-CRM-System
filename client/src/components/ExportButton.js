import React, { useState, useRef, useEffect } from 'react';
import { FiDownload, FiFileText, FiFile } from 'react-icons/fi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './ExportButton.css';

/**
 * Reusable Export Button with PDF / Excel / CSV options.
 *
 * Props:
 *   fileName   - base name for the exported file (e.g. "customers")
 *   headers    - array of column header strings, e.g. ['Name', 'Email', 'Phone']
 *   rows       - array of arrays matching headers, e.g. [['John', 'j@x.com', '123'], ...]
 *   title      - (optional) title shown at top of PDF, defaults to fileName
 */
const ExportButton = ({ fileName, headers, rows, title }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dateSuffix = new Date().toISOString().split('T')[0];
  const baseName = `${fileName}_${dateSuffix}`;
  const docTitle = title || fileName.charAt(0).toUpperCase() + fileName.slice(1);

  const exportCSV = () => {
    const escape = (v) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const csv = [
      headers.map(escape).join(','),
      ...rows.map(row => row.map(escape).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    download(blob, `${baseName}.csv`);
    setOpen(false);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Auto-size columns
    ws['!cols'] = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map(r => String(r[i] ?? '').length)
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, docTitle.substring(0, 31));
    XLSX.writeFile(wb, `${baseName}.xlsx`);
    setOpen(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: rows[0]?.length > 6 ? 'landscape' : 'portrait' });

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(docTitle, 14, 18);

    // Date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Exported: ${new Date().toLocaleDateString('en-ZA')} ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`, 14, 25);

    doc.setTextColor(0);

    // Table
    doc.autoTable({
      startY: 30,
      head: [headers],
      body: rows.map(row => row.map(cell => String(cell ?? ''))),
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248],
      },
      margin: { top: 30 },
      didDrawPage: (data) => {
        // Footer with page number
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      },
    });

    doc.save(`${baseName}.pdf`);
    setOpen(false);
  };

  const download = (blob, name) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="export-btn-wrap" ref={ref}>
      <button className="btn-secondary" onClick={() => setOpen(!open)}>
        <FiDownload /> Export
      </button>
      {open && (
        <div className="export-dropdown">
          <button onClick={exportPDF}>
            <FiFileText className="export-icon pdf" /> PDF Document
          </button>
          <button onClick={exportExcel}>
            <FiFile className="export-icon excel" /> Excel Spreadsheet
          </button>
          <button onClick={exportCSV}>
            <FiFile className="export-icon csv" /> CSV File
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
