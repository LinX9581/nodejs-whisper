import mysql from 'mysql2/promise';
import config from './config.js'

// 建立資料庫連線池
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    charset: 'utf8mb4',
    timezone: '+08:00',
    connectionLimit: 60,
    connectTimeout: 60000,      // 建立連線的超時時間 (毫秒)
    idleTimeout: 900000,        // 閒置連線的超時時間 (15分鐘)
    maxIdle: 10,                // 最大閒置連線數
});

// 簡化的查詢函數，包含基本錯誤追蹤
let query = async function(sql, params) {
    const caller = new Error().stack.split('\n')[2]?.trim() || 'Unknown';
    try {
        const [rows] = await pool.query(sql, params);
        return rows;
    } catch (err) {
        err.sql = sql;
        err.caller = caller;
        throw err;
    }
}

export default query;