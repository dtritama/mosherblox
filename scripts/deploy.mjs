// Deploy to the VPS:  npm run deploy
// Sends the project files (everything git knows about or would add — never .env* or storage) over
// SSH and runs deploy/remote-deploy.sh there. Needs `ssh` and `tar` (macOS, Linux, Windows 10+).
//   DEPLOY_HOST  user@ip           (default below)
//   DEPLOY_KEY   SSH private key   (default: your SSH config / agent)
import { spawn, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const host = process.env.DEPLOY_HOST ?? "mosherblox@103.127.135.122";
const key = process.env.DEPLOY_KEY;
const ssh = [...(key ? ["-i", key, "-o", "IdentitiesOnly=yes"] : []), "-o", "ServerAliveInterval=30", host];

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (run("git", ["status", "--porcelain"]).trim()) console.warn("Note: deploying uncommitted changes too.");

const files = run("git", ["ls-files", "-co", "--exclude-standard", "-z"])
  .split("\0")
  .filter((file) => file && !/^\.env(?!\.example$)/.test(file) && existsSync(file));

function pipe(left, right, input) {
  return new Promise((resolve, reject) => {
    const a = spawn(left[0], left[1], { stdio: ["pipe", "pipe", "inherit"] });
    const b = spawn(right[0], right[1], { stdio: [a.stdout, "inherit", "inherit"] });
    a.stdin.end(input);
    a.on("exit", (code) => code && reject(new Error(`${left[0]} failed (${code})`)));
    b.on("exit", (code) => (code ? reject(new Error(`${right[0]} failed (${code})`)) : resolve()));
  });
}

console.log(`Sending ${files.length} files to ${host} …`);
// Unpack next to the live copy, then swap, so a broken upload never replaces it.
const unpack =
  "set -e; cd /opt/mosherblox; rm -rf app.new; mkdir app.new; tar -xzf - -C app.new; rm -rf app.old; " +
  "if [ -d app ]; then mv app app.old; fi; mv app.new app; chmod +x app/deploy/*.sh";
await pipe(["tar", ["--null", "-czf", "-", "-T", "-"]], ["ssh", [...ssh, unpack]], files.join("\0") + "\0");

const remote = spawn("ssh", [...ssh, "/opt/mosherblox/app/deploy/remote-deploy.sh"], { stdio: "inherit" });
remote.on("exit", (code) => process.exit(code ?? 1));
