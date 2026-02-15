# Warehouse CRM System

An automated Customer Relationship Management (CRM) system designed specifically for warehouse operations. This system helps manage customers, suppliers, products, inventory, and orders with automated workflows and real-time monitoring.

## Features

### Core Functionality
- **Customer Management**: Complete customer database with contact information and status tracking
- **Supplier Management**: Manage supplier relationships and contact details
- **Product/Inventory Management**: Track products, SKUs, stock levels, and low stock alerts
- **Order Management**: Create and track orders with automatic inventory updates
- **Dashboard**: Real-time statistics and overview of warehouse operations

### Automation Features
- **Low Stock Alerts**: Automated hourly checks for products below minimum stock levels
- **Order Status Updates**: Automatic status progression for pending orders
- **Daily Reports**: Automated daily reports on orders and revenue
- **Inventory Updates**: Automatic stock deduction when orders are created

## Technology Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database (easily upgradeable to PostgreSQL/MySQL)
- **RESTful API** architecture
- **Node-cron** for scheduled automation tasks

### Frontend
- **React** 18 with React Router
- **Modern UI** with responsive design
- **React Icons** for iconography
- **Axios** for API communication

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup Steps

1. **Install dependencies**:
   ```bash
   npm run install-all
   ```

2. **Start the development servers**:
   ```bash
   npm run dev
   ```
   This will start both the backend server (port 5000) and frontend development server (port 3000).

   Or start them separately:
   ```bash
   # Backend only
   npm run server

   # Frontend only (in a separate terminal)
   npm run client
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

## Project Structure

```
warehouse-crm/
├── server/
│   ├── index.js          # Main server file
│   ├── database.js        # Database setup and initialization
│   ├── routes/
│   │   └── index.js      # API routes
│   └── automation.js     # Automated tasks and scheduling
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service layer
│   │   └── App.js        # Main app component
│   └── package.json
└── package.json
```

## API Endpoints

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `POST /api/suppliers` - Create new supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Database Schema

The system uses SQLite with the following main tables:
- `customers` - Customer information
- `suppliers` - Supplier information
- `products` - Product catalog and inventory
- `orders` - Order records
- `order_items` - Order line items
- `contacts` - Customer/supplier interactions
- `automation_rules` - Automation configuration

## Automation Schedule

- **Low Stock Check**: Every hour
- **Order Status Update**: Every 6 hours
- **Daily Report**: 9:00 AM daily

## Production Deployment

1. **Build the frontend**:
   ```bash
   npm run build
   ```

2. **Set environment variables**:
   ```bash
   NODE_ENV=production
   PORT=5000
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

The server will serve the built React app in production mode.

## Future Enhancements

- User authentication and authorization
- Email notifications for low stock and order updates
- Advanced reporting and analytics
- Barcode scanning integration
- Multi-warehouse support
- Export functionality (CSV, PDF)
- Mobile app support

## License

MIT
