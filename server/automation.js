const cron = require('node-cron');
const db = require('./database');

// Automated tasks
const automationTasks = {
  // Check for low stock and send alerts
  checkLowStock: async () => {
    try {
      const lowStockProducts = await new Promise((resolve, reject) => {
        db.getDb().all(
          `SELECT * FROM products 
           WHERE stock_quantity <= min_stock_level 
           AND status = 'active'`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      
      if (lowStockProducts.length > 0) {
        console.log(`⚠️  Low stock alert: ${lowStockProducts.length} products need restocking`);
        // In a real system, you would send emails/notifications here
        lowStockProducts.forEach(product => {
          console.log(`  - ${product.name} (SKU: ${product.sku}): ${product.stock_quantity} remaining (min: ${product.min_stock_level})`);
        });
      }
    } catch (error) {
      console.error('Error checking low stock:', error);
    }
  },
  
  // Auto-update order statuses
  updateOrderStatuses: async () => {
    try {
      // Auto-mark pending orders older than 7 days as "processing"
      await new Promise((resolve, reject) => {
        db.getDb().run(
          `UPDATE orders 
           SET status = 'processing', updated_at = CURRENT_TIMESTAMP
           WHERE status = 'pending' 
           AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`,
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      console.log('✅ Order statuses updated');
    } catch (error) {
      console.error('Error updating order statuses:', error);
    }
  },
  
  // Generate daily reports
  generateDailyReport: async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const stats = await new Promise((resolve, reject) => {
        db.getDb().get(
          `SELECT 
            COUNT(*) as orders_today,
            SUM(total_amount) as revenue_today
           FROM orders 
           WHERE DATE(created_at) = CURDATE()`,
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      console.log(`📊 Daily Report (${today}):`);
      console.log(`  - Orders: ${stats.orders_today || 0}`);
      console.log(`  - Revenue: R${(stats.revenue_today || 0).toFixed(2)}`);
    } catch (error) {
      console.error('Error generating daily report:', error);
    }
  }
};

// Schedule automated tasks
const startAutomation = () => {
  // Check low stock every hour
  cron.schedule('0 * * * *', () => {
    automationTasks.checkLowStock();
  });
  
  // Update order statuses every 6 hours
  cron.schedule('0 */6 * * *', () => {
    automationTasks.updateOrderStatuses();
  });
  
  // Generate daily report at 9 AM
  cron.schedule('0 9 * * *', () => {
    automationTasks.generateDailyReport();
  });
  
  console.log('🤖 Automation tasks scheduled');
};

module.exports = {
  startAutomation,
  automationTasks
};
