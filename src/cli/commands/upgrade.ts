import { existsSync, unlinkSync, renameSync, chmodSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const REPO = "humont/shikigami";
const CURRENT_VERSION = "0.1.0";

interface ReleaseInfo {
  version: string;
  downloadUrl: string;
  publishedAt: string;
}

interface UpgradeResult {
  success: boolean;
  currentVersion?: string;
  latestVersion?: string;
  upgraded?: boolean;
  message?: string;
  error?: string;
}

function getPlatform(): string {
  const os = process.platform;
  const arch = process.arch;

  if (os === "linux" && arch === "x64") return "linux-x64";
  if (os === "darwin" && arch === "arm64") return "darwin-arm64";
  if (os === "darwin" && arch === "x64") return "darwin-x64";
  if (os === "win32" && arch === "x64") return "windows-x64";

  throw new Error(`Unsupported platform: ${os}-${arch}`);
}

function getArtifactName(platform: string): string {
  if (platform === "windows-x64") {
    return "shiki-windows-x64.exe";
  }
  return `shiki-${platform}`;
}

interface GitHubRelease {
  tag_name: string;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}

async function getLatestRelease(): Promise<ReleaseInfo | null> {
  const response = await fetch(
    `https://api.github.com/repos/${REPO}/releases/latest`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "shikigami-cli",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null; // No releases yet
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = (await response.json()) as GitHubRelease;
  const platform = getPlatform();
  const artifactName = getArtifactName(platform);

  const asset = data.assets?.find((a) => a.name === artifactName);
  if (!asset) {
    throw new Error(`No binary available for platform: ${platform}`);
  }

  return {
    version: data.tag_name.replace(/^v/, ""),
    downloadUrl: asset.browser_download_url,
    publishedAt: data.published_at,
  };
}

function compareVersions(current: string, latest: string): number {
  const currentParts = current.split(".").map(Number);
  const latestParts = latest.split(".").map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const c = currentParts[i] || 0;
    const l = latestParts[i] || 0;
    if (c < l) return -1;
    if (c > l) return 1;
  }
  return 0;
}

function getExecutablePath(): string {
  // When running as compiled binary, process.execPath is the binary itself
  // When running via bun, it's the bun executable
  if (process.execPath.includes("bun")) {
    throw new Error(
      "Self-update only works with compiled binaries. Run: bun run build:standalone"
    );
  }
  return process.execPath;
}

async function downloadBinary(url: string, destPath: string): Promise<void> {
  const response = await fetch(url, {
    headers: { "User-Agent": "shikigami-cli" },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  await Bun.write(destPath, buffer);
}

export async function runUpgrade(options: {
  check?: boolean;
  force?: boolean;
}): Promise<UpgradeResult> {
  try {
    const currentVersion = CURRENT_VERSION;

    // Fetch latest release info
    const latest = await getLatestRelease();

    if (!latest) {
      return {
        success: true,
        currentVersion,
        message: "No releases available yet",
        upgraded: false,
      };
    }

    const comparison = compareVersions(currentVersion, latest.version);

    // Check-only mode
    if (options.check) {
      if (comparison >= 0) {
        return {
          success: true,
          currentVersion,
          latestVersion: latest.version,
          message: "You are on the latest version",
          upgraded: false,
        };
      }
      return {
        success: true,
        currentVersion,
        latestVersion: latest.version,
        message: `Update available: ${currentVersion} → ${latest.version}`,
        upgraded: false,
      };
    }

    // Already up to date
    if (comparison >= 0 && !options.force) {
      return {
        success: true,
        currentVersion,
        latestVersion: latest.version,
        message: "Already up to date",
        upgraded: false,
      };
    }

    // Get current executable path
    const execPath = getExecutablePath();

    // Download to temp file
    const tmpPath = join(tmpdir(), `shiki-upgrade-${Date.now()}`);
    await downloadBinary(latest.downloadUrl, tmpPath);

    // Make executable (unix)
    if (process.platform !== "win32") {
      chmodSync(tmpPath, 0o755);
    }

    // Replace current binary
    const backupPath = `${execPath}.backup`;

    // Backup current binary
    if (existsSync(execPath)) {
      renameSync(execPath, backupPath);
    }

    try {
      // Move new binary into place
      renameSync(tmpPath, execPath);

      // Remove backup on success
      if (existsSync(backupPath)) {
        unlinkSync(backupPath);
      }
    } catch (err) {
      // Restore backup on failure
      if (existsSync(backupPath)) {
        renameSync(backupPath, execPath);
      }
      throw err;
    }

    return {
      success: true,
      currentVersion,
      latestVersion: latest.version,
      message: `Upgraded: ${currentVersion} → ${latest.version}`,
      upgraded: true,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
