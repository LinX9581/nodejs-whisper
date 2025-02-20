const Mysql = require('mysql2/promise');
const pool = Mysql.createPool({
  host: config.mysql.host,
  user: config.mysql.user,
  password: config.mysql.password,
});
let query = async function(query, data, fileName, status) {
  try {
    if (status === 'prod') {
      const pool = Mysql.createPool({
        host: config.mysql_prod.host,
        user: config.mysql_prod.user,
        password: config.mysql_prod.password,
      });
      const rows = await pool.query(query, data);
      return rows[0];
    } else {
      const rows = await pool.query(query, data);
      return rows[0];
    }
  } catch (err) {
    console.log(`SQL ERROR => File => ${fileName} => ` + err);
    return err;
  }
}
module.exports = query