import dotenv from 'dotenv';
import fs from 'fs';
import ini from 'ini';
import mysql2 from 'mysql2/promise';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const CONFIG_FILE = 'rds-config.ini';
const config_data = fs.readFileSync(CONFIG_FILE, 'utf-8');
const config = ini.parse(config_data);

const pool = mysql2.createPool({
  host: config.rds.endpoint,
  port: parseInt(config.rds.port_number),
  user: config.rds.user_name,
  password: config.rds.user_pwd,
  database: config.rds.db_name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const pgPool = pool;

export { pool, pgPool };
