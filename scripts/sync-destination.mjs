import fs from "node:fs";
import { execSync } from "node:child_process";

const configPath = new URL("../wrangler.jsonc", import.meta.url);

function getDestination() {
  const explicitWorkerName =
    process.env.CLOUDFLARE_WORKER_NAME?.trim();

  if (explicitWorkerName) {
    return {
      repositoryName: null,
      workerName: explicitWorkerName,
    };
  }

  const explicitRepository =
    process.env.CODEX_GITHUB_REPOSITORY ||
    process.env.GITHUB_REPOSITORY;

  if (explicitRepository) {
    const repositoryName = explicitRepository.split("/").pop();

    return {
      repositoryName,
      workerName: repositoryName,
    };
  }

  try {
    const remote = execSync("git remote get-url origin", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    const match = remote.match(
      /github\.com[/:][^/]+\/([^/]+?)(?:\.git)?$/
    );

    if (!match) return null;

    return {
      repositoryName: match[1],
      workerName: match[1],
    };
  } catch {
    return null;
  }
}

const destination = getDestination();

if (!destination?.workerName) {
  console.log("Destination sync skipped: repository identity unavailable.");
  process.exit(0);
}

/*
 * Preserve the canonical product master.
 *
 * Destination copies are expected to use their own repository name.
 * No GitHub owner/account is hardcoded here.
 */
if (destination.repositoryName === "rooflume-astro-template") {
  console.log("Destination sync skipped: canonical template repository.");
  process.exit(0);
}

const raw = fs.readFileSync(configPath, "utf8");

const match = raw.match(/"name"\s*:\s*"([^"]+)"/);

if (!match) {
  throw new Error("Unable to locate Worker name in wrangler.jsonc.");
}

const currentName = match[1];

if (currentName === destination.workerName) {
  console.log(`Worker name already matches: ${destination.workerName}`);
  process.exit(0);
}

const updated = raw.replace(
  /"name"\s*:\s*"[^"]+"/,
  `"name": "${destination.workerName}"`
);

fs.writeFileSync(configPath, updated);

console.log(
  `Worker name synchronized: ${currentName} -> ${destination.workerName}`
);