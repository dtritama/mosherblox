// Create an admin account, or reset an existing one's password / name / role.
//   npm run admin:create -- --email owner@example.com --name "Owner" --role owner
// The password is asked for (hidden), or read from ADMIN_PASSWORD for automation.
// On a non-local database the password must be at least 12 characters.
import nextEnv from "@next/env";
import postgres from "postgres";
import readline from "node:readline";
import { hashPassword, PASSWORD_MIN_LENGTH } from "../src/server/auth/password-hash.mjs";

nextEnv.loadEnvConfig(process.cwd());

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.includes(question)) process.stdout.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const email = arg("email")?.trim().toLowerCase();
const name = arg("name")?.trim() || "Admin";
const role = arg("role") === "staff" ? "staff" : "owner";
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
  console.error('Usage: npm run admin:create -- --email you@example.com [--name "Name"] [--role owner|staff]');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — copy .env.example to .env.local.");
  process.exit(1);
}
const local = ["localhost", "127.0.0.1", "::1", "db"].includes(new URL(url).hostname);

const password = process.env.ADMIN_PASSWORD ?? (await askHidden(`Password for ${email}: `));
if (password.length < PASSWORD_MIN_LENGTH) {
  if (!local) {
    console.error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
    process.exit(1);
  }
  console.warn(
    `Warning: password is shorter than ${PASSWORD_MIN_LENGTH} characters. Allowed on this local database only.`,
  );
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  const passwordHash = await hashPassword(password);
  const [row] = await sql`
    INSERT INTO admins (email, name, password_hash, role)
    VALUES (${email}, ${name}, ${passwordHash}, ${role})
    ON CONFLICT (email) DO UPDATE
      SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role,
          disabled_at = NULL, updated_at = now()
    RETURNING (xmax = 0) AS created`;
  // A password change logs every device of this admin out.
  if (!row.created)
    await sql`DELETE FROM admin_sessions WHERE admin_id = (SELECT id FROM admins WHERE email = ${email})`;
  console.log(`${row.created ? "Created" : "Updated"} ${role} ${email}.`);
} finally {
  await sql.end();
}
