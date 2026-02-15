require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const dbModule = require('../database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

dbModule.init().then(() => {
  const db = dbModule.getDb();

  db.get('SELECT * FROM users WHERE email = ?', ['admin@company.com'], (err, user) => {
    if (err) {
      console.error('Error checking user:', err);
      dbModule.close().then(() => process.exit(1));
      return;
    }

    if (user) {
      console.log('Admin user already exists');
      console.log('Email:', user.email);
      console.log('Name:', user.name);
      console.log('Role:', user.role);
      console.log('Status:', user.status);

      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, 'admin@company.com'], (err) => {
        if (err) console.error('Error updating password:', err);
        else console.log('✅ Admin password reset to: admin123');
        dbModule.close().then(() => process.exit(0));
      });
    } else {
      console.log('Creating admin user...');
      const adminId = uuidv4();
      const hashedPassword = bcrypt.hashSync('admin123', 10);

      db.run(
        'INSERT INTO users (id, email, password, name, role, status) VALUES (?, ?, ?, ?, ?, ?)',
        [adminId, 'admin@company.com', hashedPassword, 'System Administrator', 'admin', 'active'],
        (err) => {
          if (err) console.error('Error creating admin:', err);
          else {
            console.log('✅ Admin user created successfully!');
            console.log('Email: admin@company.com');
            console.log('Password: admin123');
          }
          dbModule.close().then(() => process.exit(0));
        }
      );
    }
  });
}).catch((err) => {
  console.error('Database init failed:', err);
  process.exit(1);
});
