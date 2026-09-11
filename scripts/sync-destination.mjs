import fs from "node:fs";
import { execSync } from "node:child_process";

const wranglerPath = new URL("../wrangler.jsonc", import.meta.url);
const projectConfigPath = new URL("../project.config.json", import.meta.url);

function getRepositoryName() {
  const explicitWorkerName =
    process.env.CLOUDFLARE_WORKER_NAME?.trim();

  const explicitRepository =
    process.env.CODEX_GITHUB_REPOSITORY ||
    process.env.GITHUB_REPOSITORY;

  if (explicitRepository) {
    return explicitRepository.split("/").pop();
  }

  if (explicitWorkerName) {
    return explicitWorkerName;
  }

  try {
    const remote = execSync("git remote get-url origin", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    const match = remote.match(
      /github\.com[/:][^/]+\/([^/]+?)(?:\.git)?$/
    );

    return match?.[1] || null;
  } catch {
    return null;
  }
}

function getBasePath(repositoryName) {
  if (!repositoryName) return "/";

  if (repositoryName === "rooflume-astro-template") {
    return "/";
  }

  const shibgaMatch = repositoryName.match(/^shibga-(.+)-lp-(\d+)$/);

  if (shibgaMatch) {
    const [, service, number] = shibgaMatch;
    return `/lp/${service}-${number}/`;
  }

  return "/";
}

const repositoryName = getRepositoryName();

if (!repositoryName) {
  console.log("Destination sync skipped: repository identity unavailable.");
  process.exit(0);
}

const workerName =
  process.env.CLOUDFLARE_WORKER_NAME?.trim() || repositoryName;

const basePath =
  process.env.DEPLOYMENT_BASE_PATH?.trim() ||
  getBasePath(repositoryName);

// Keep canonical master unchanged.
if (repositoryName === "rooflume-astro-template") {
  console.log("Destination sync skipped: canonical template repository.");
  process.exit(0);
}

// Sync wrangler Worker name.
const wranglerRaw = fs.readFileSync(wranglerPath, "utf8");

const wranglerUpdated = wranglerRaw.replace(
  /"name"\s*:\s*"[^"]+"/,
  `"name": "${workerName}"`
);

fs.writeFileSync(wranglerPath, wranglerUpdated);

// Sync project deployment base path.
const projectConfig = JSON.parse(
  fs.readFileSync(projectConfigPath, "utf8")
);

projectConfig.deployment ??= {};
projectConfig.deployment.basePath = basePath;

fs.writeFileSync(
  projectConfigPath,
  `${JSON.stringify(projectConfig, null, 2)}\n`
);

console.log(`Worker name synchronized: ${workerName}`);
console.log(`Deployment base path synchronized: ${basePath}`);