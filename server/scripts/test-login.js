require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const dbModule = require('../database');
const bcrypt = require('bcryptjs');

dbModule.init().then(() => {
  const db = dbModule.getDb();

  db.get('SELECT * FROM users WHERE email = ?', ['admin@company.com'], async (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      dbModule.close().then(() => process.exit(1));
      return;
    }

    if (!user) {
      console.error('❌ Admin user not found!');
      dbModule.close().then(() => process.exit(1));
      return;
    }

    console.log('✅ Admin user found:');
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    console.log('   Status:', user.status);
    console.log('   Password hash:', (user.password || '').substring(0, 20) + '...');
    console.log('');

    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, user.password);

    console.log('Testing password "admin123":');
    if (isValid) {
      console.log('✅ Password is correct!');
      dbModule.close().then(() => process.exit(0));
    } else {
      console.log('❌ Password is incorrect!');
      console.log('   Resetting password...');
      const hashedPassword = bcrypt.hashSync(testPassword, 10);
      db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, 'admin@company.com'], (err) => {
        if (err) console.error('Error resetting password:', err);
        else console.log('✅ Password reset successfully!');
        dbModule.close().then(() => process.exit(0));
      });
    }
  });
}).catch((err) => {
  console.error('Database init failed:', err);
  process.exit(1);
});
