const bcrypt = require('bcryptjs');
(async () => {
  console.log('Admin hash:', await bcrypt.hash('Admin@123', 10));
  console.log('Customer hash:', await bcrypt.hash('Customer@123', 10));
})();
