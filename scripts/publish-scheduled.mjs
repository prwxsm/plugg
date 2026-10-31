// Run from the project directory on a trusted server, e.g. once per minute.
import sql from "../src/lib/db.ts";
import { publishScheduled } from "../src/server/publication.ts";
try {
  console.log(await publishScheduled());
} finally {
  await sql.end();
}
