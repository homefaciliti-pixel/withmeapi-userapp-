const { query } = require('../config/db');

async function fixUsers() {
  await query(`UPDATE users SET name = 'User' WHERE phone_number NOT LIKE '%9199953391%' AND name = 'Amit'`);
  const rows = await query(`SELECT id, phone_number, name FROM users ORDER BY id DESC LIMIT 10`);
  console.log(rows);
}

fixUsers().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
