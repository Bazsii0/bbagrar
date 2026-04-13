import mysql from 'mysql2/promise';

const {
  DB_HOST = 'db',
  DB_PORT = '3306',
  DB_USER = 'bbagrar',
  DB_PASSWORD = 'bbagrar_pass',
  DB_NAME = 'bbagrar',
} = process.env;

export const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  connectionLimit: 10,
  waitForConnections: true,
  timezone: 'Z',
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}
