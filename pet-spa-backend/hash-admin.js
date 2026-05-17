const bcrypt = require('bcrypt');

(async () => {
  const plain = 'Admin123!'; // la que VAS a usar para loguearte
  const hash = await bcrypt.hash(plain, 10);
  console.log('Password en texto plano:', plain);
  console.log('Hash generado:', hash);
})();