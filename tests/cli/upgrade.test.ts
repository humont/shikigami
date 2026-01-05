import { describe, test, expect } from "bun:test";

// Extract testable functions - we'll need to export these
// For now, testing the logic inline

describe("upgrade", () => {
  describe("compareVersions", () => {
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

    test("returns -1 when current is older", () => {
      expect(compareVersions("0.1.0", "0.2.0")).toBe(-1);
      expect(compareVersions("0.1.0", "1.0.0")).toBe(-1);
      expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
    });

    test("returns 1 when current is newer", () => {
      expect(compareVersions("0.2.0", "0.1.0")).toBe(1);
      expect(compareVersions("1.0.0", "0.9.9")).toBe(1);
    });

    test("returns 0 when versions are equal", () => {
      expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
      expect(compareVersions("0.1.0", "0.1.0")).toBe(0);
    });

    test("handles different version lengths", () => {
      expect(compareVersions("1.0", "1.0.0")).toBe(0);
      expect(compareVersions("1.0.0", "1.0")).toBe(0);
      expect(compareVersions("1.0", "1.0.1")).toBe(-1);
    });
  });

  describe("getPlatform", () => {
    test("returns correct platform string", () => {
      // This test runs on the current platform
      const os = process.platform;
      const arch = process.arch;

      const expected =
        os === "linux" && arch === "x64" ? "linux-x64" :
        os === "darwin" && arch === "arm64" ? "darwin-arm64" :
        os === "darwin" && arch === "x64" ? "darwin-x64" :
        os === "win32" && arch === "x64" ? "windows-x64" :
        null;

      if (expected) {
        // Platform detection logic
        function getPlatform(): string {
          if (process.platform === "linux" && process.arch === "x64") return "linux-x64";
          if (process.platform === "darwin" && process.arch === "arm64") return "darwin-arm64";
          if (process.platform === "darwin" && process.arch === "x64") return "darwin-x64";
          if (process.platform === "win32" && process.arch === "x64") return "windows-x64";
          throw new Error(`Unsupported platform`);
        }
        expect(getPlatform()).toBe(expected);
      }
    });
  });

  describe("getArtifactName", () => {
    function getArtifactName(platform: string): string {
      if (platform === "windows-x64") return "shiki-windows-x64.exe";
      return `shiki-${platform}`;
    }

    test("returns correct artifact names", () => {
      expect(getArtifactName("linux-x64")).toBe("shiki-linux-x64");
      expect(getArtifactName("darwin-arm64")).toBe("shiki-darwin-arm64");
      expect(getArtifactName("darwin-x64")).toBe("shiki-darwin-x64");
      expect(getArtifactName("windows-x64")).toBe("shiki-windows-x64.exe");
    });
  });
});
