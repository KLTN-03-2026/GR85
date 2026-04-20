const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'your_password',
    database: 'your_database',
  });

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Insert roles
    const [adminRole] = await connection.execute(
      `INSERT INTO roles (name, description) VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      ['Admin', 'System administrator']
    );

    const [userRole] = await connection.execute(
      `INSERT INTO roles (name, description) VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      ['User', 'Default customer role']
    );

    // Insert admin user
    const [adminUser] = await connection.execute(
      `INSERT INTO users (email, fullName, passwordHash, status, roleId, phone, address) 
       VALUES (?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE fullName = VALUES(fullName), passwordHash = VALUES(passwordHash), status = VALUES(status), phone = VALUES(phone), address = VALUES(address)`,
      ['admin@gmail.com', 'System Admin', hashedPassword, 'ACTIVE', adminRole.insertId, '0900000000', 'TP.HCM']
    );

    // Insert categories
    const categories = [
      { name: 'CPU', slug: 'cpu', description: 'Bo xu ly trung tam' },
      { name: 'Mainboard', slug: 'mainboard', description: 'Bang mach chu' },
      { name: 'RAM', slug: 'ram', description: 'Bo nho tam' },
      { name: 'VGA', slug: 'vga', description: 'Card do hoa' },
      { name: 'SSD', slug: 'ssd', description: 'Luu tru toc do cao' },
    ];

    for (const category of categories) {
      await connection.execute(
        `INSERT INTO categories (name, slug, description) VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`,
        [category.name, category.slug, category.description]
      );
    }

    // Insert suppliers
    const suppliers = [
      {
        name: 'Tech Distribution VN',
        contactPerson: 'Nguyen Van A',
        phone: '0901000001',
        email: 'techdist@example.com',
        address: 'Quan 1, TP.HCM',
      },
      {
        name: 'PC Parts Hub',
        contactPerson: 'Tran Thi B',
        phone: '0901000002',
        email: 'pcparts@example.com',
        address: 'Quan 3, TP.HCM',
      },
      {
        name: 'Global Component Supply',
        contactPerson: 'Le Van C',
        phone: '0901000003',
        email: 'globalsupply@example.com',
        address: 'Quan 7, TP.HCM',
      },
    ];

    for (const supplier of suppliers) {
      await connection.execute(
        `INSERT INTO suppliers (name, contactPerson, phone, email, address) VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE contactPerson = VALUES(contactPerson), phone = VALUES(phone), email = VALUES(email), address = VALUES(address)`,
        [supplier.name, supplier.contactPerson, supplier.phone, supplier.email, supplier.address]
      );
    }

    console.log('Đã seed dữ liệu thành công!');
  } catch (error) {
    console.error('Lỗi khi seed dữ liệu:', error);
  } finally {
    await connection.end();
  }
}

main();