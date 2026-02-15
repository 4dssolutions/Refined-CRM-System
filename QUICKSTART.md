# Quick Start Guide

## Getting Started in 3 Steps

### 1. Install Dependencies
```bash
npm run install-all
```

### 2. Start the Application
```bash
npm run dev
```

This starts both the backend server (port 5000) and frontend (port 3000).

### 3. Open Your Browser
Navigate to: **http://localhost:3000**

## First Steps

1. **Add Suppliers**: Go to Suppliers page and add your suppliers
2. **Add Products**: Go to Products page and add products with SKUs and stock levels
3. **Add Customers**: Go to Customers page and add your customers
4. **Create Orders**: Go to Orders page and create orders for customers

## Key Features to Try

- **Dashboard**: View real-time statistics and low stock alerts
- **Low Stock Alerts**: Products below minimum stock level are highlighted
- **Order Management**: Create orders that automatically update inventory
- **Automation**: The system automatically checks for low stock every hour

## Troubleshooting

### Port Already in Use
If port 5000 or 3000 is already in use:
- Backend: Set `PORT` environment variable (e.g., `PORT=5001`)
- Frontend: React will prompt to use a different port

### Database Issues
The database file (`warehouse_crm.db`) is created automatically on first run. If you need to reset:
- Stop the server
- Delete `server/warehouse_crm.db`
- Restart the server

### API Connection Issues
Make sure the backend is running before starting the frontend. The frontend expects the API at `http://localhost:5000/api`.

## Sending Real Outbound Emails

To send emails to external addresses (customers, suppliers, etc.):

1. Copy `.env.example` to `.env`
2. Add your SMTP settings:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   SMTP_FROM_NAME=Your Company Name
   ```
3. **Gmail users**: Use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password
4. Restart the server
5. Go to Email → Compose → choose "External Email" and enter any address

## Next Steps

- Customize automation schedules in `server/automation.js`
- Add email notifications for low stock alerts
- Export data for reporting
- Add user authentication
