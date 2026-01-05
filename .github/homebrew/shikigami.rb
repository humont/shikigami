# This formula is auto-updated by the release workflow.
# To set up your Homebrew tap:
# 1. Create repo: humont/homebrew-shikigami
# 2. Copy this file to Formula/shikigami.rb in that repo
# 3. Add HOMEBREW_TAP_TOKEN secret to humont/shikigami repo
#    (Personal access token with repo scope)

class Shikigami < Formula
  desc "AI agent orchestration for parallel development"
  homepage "https://github.com/humont/shikigami"
  version "0.1.0"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/humont/shikigami/releases/download/v#{version}/shiki-darwin-arm64"
      sha256 "PLACEHOLDER_SHA256_ARM64"
    else
      url "https://github.com/humont/shikigami/releases/download/v#{version}/shiki-darwin-x64"
      sha256 "PLACEHOLDER_SHA256_X64"
    end
  end

  on_linux do
    url "https://github.com/humont/shikigami/releases/download/v#{version}/shiki-linux-x64"
    sha256 "PLACEHOLDER_SHA256_LINUX"
  end

  def install
    binary_name = if OS.mac?
      Hardware::CPU.arm? ? "shiki-darwin-arm64" : "shiki-darwin-x64"
    else
      "shiki-linux-x64"
    end
    bin.install binary_name => "shiki"
  end

  test do
    assert_match "shiki", shell_output("#{bin}/shiki --help")
  end
end
