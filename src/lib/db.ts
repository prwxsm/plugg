import "dotenv/config";
import postgres from "postgres";

const connectionString =
  process.env["DATABASE_URL"] || "postgres://prwxsm:plugg_dev@localhost:5432/plugg";

// Use a global variable in development to avoid leaking connections on hot-reload
declare global {
  // eslint-disable-next-line no-var
  var __plugg_sql__: ReturnType<typeof postgres> | undefined;
}

const sql =
  globalThis.__plugg_sql__ ??
  postgres(connectionString, {
    transform: postgres.camel,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__plugg_sql__ = sql;
}

export default sql;
