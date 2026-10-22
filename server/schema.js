const SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
      phone VARCHAR(50),
      address VARCHAR(255),
      status ENUM('active', 'locked', 'closed') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE IF NOT EXISTS accounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      account_number VARCHAR(32) NOT NULL UNIQUE,
      account_type ENUM('Checking', 'Savings', 'Credit') NOT NULL DEFAULT 'Checking',
      balance DECIMAL(14, 2) NOT NULL DEFAULT 0,
      currency VARCHAR(8) NOT NULL DEFAULT 'PHP',
      status ENUM('active', 'frozen', 'closed') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_accounts_user (user_id),
      CONSTRAINT fk_accounts_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account_id INT NOT NULL,
      ref_number VARCHAR(40) NOT NULL UNIQUE,
      type ENUM('deposit', 'withdrawal', 'transfer', 'payment') NOT NULL,
      category VARCHAR(80),
      description VARCHAR(255),
      amount DECIMAL(14, 2) NOT NULL,
      status ENUM('completed', 'pending', 'failed') NOT NULL DEFAULT 'completed',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_transactions_account (account_id),
      INDEX idx_transactions_created (created_at),
      CONSTRAINT fk_transactions_account
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE IF NOT EXISTS logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_type VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      ip_address VARCHAR(64),
      user_agent VARCHAR(255),
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_logs_event (event_type),
      INDEX idx_logs_email (email),
      INDEX idx_logs_created (created_at)
    ) ENGINE=InnoDB
  `,
];

async function initializeDatabase(db) {
  for (const statement of SCHEMA_STATEMENTS) {
    await db.query(statement);
  }
}

module.exports = { SCHEMA_STATEMENTS, initializeDatabase };
