#!/bin/bash
set -e

# Configuration - update these for your repo
REPO="humont/shikigami"
BINARY_NAME="shiki"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Detect OS and architecture
detect_platform() {
    local os arch

    case "$(uname -s)" in
        Linux*)  os="linux" ;;
        Darwin*) os="darwin" ;;
        MINGW*|MSYS*|CYGWIN*) os="windows" ;;
        *) error "Unsupported operating system: $(uname -s)" ;;
    esac

    case "$(uname -m)" in
        x86_64|amd64) arch="x64" ;;
        arm64|aarch64) arch="arm64" ;;
        *) error "Unsupported architecture: $(uname -m)" ;;
    esac

    # Windows only supports x64
    if [ "$os" = "windows" ] && [ "$arch" != "x64" ]; then
        error "Windows builds are only available for x64 architecture"
    fi

    # Linux only supports x64
    if [ "$os" = "linux" ] && [ "$arch" != "x64" ]; then
        error "Linux builds are only available for x64 architecture"
    fi

    echo "${os}-${arch}"
}

# Get latest release version
get_latest_version() {
    curl -sL "https://api.github.com/repos/${REPO}/releases/latest" |
        grep '"tag_name":' |
        sed -E 's/.*"([^"]+)".*/\1/'
}

# Download and install
install() {
    local platform version artifact url tmp_dir

    platform=$(detect_platform)
    info "Detected platform: ${platform}"

    version="${VERSION:-$(get_latest_version)}"
    if [ -z "$version" ]; then
        error "Could not determine latest version. Set VERSION env var or check your internet connection."
    fi
    info "Installing version: ${version}"

    artifact="${BINARY_NAME}-${platform}"
    if [ "$platform" = "windows-x64" ]; then
        artifact="${artifact}.exe"
    fi

    url="https://github.com/${REPO}/releases/download/${version}/${artifact}"
    info "Downloading from: ${url}"

    tmp_dir=$(mktemp -d)
    trap "rm -rf ${tmp_dir}" EXIT

    if ! curl -fsSL "$url" -o "${tmp_dir}/${BINARY_NAME}"; then
        error "Failed to download ${artifact}. Check if the release exists."
    fi

    chmod +x "${tmp_dir}/${BINARY_NAME}"

    # Install to destination
    if [ -w "$INSTALL_DIR" ]; then
        mv "${tmp_dir}/${BINARY_NAME}" "${INSTALL_DIR}/${BINARY_NAME}"
    else
        info "Installing to ${INSTALL_DIR} (requires sudo)"
        sudo mv "${tmp_dir}/${BINARY_NAME}" "${INSTALL_DIR}/${BINARY_NAME}"
    fi

    info "Successfully installed ${BINARY_NAME} to ${INSTALL_DIR}/${BINARY_NAME}"
    echo ""
    info "Run '${BINARY_NAME} --help' to get started"
}

# Uninstall
uninstall() {
    local binary_path="${INSTALL_DIR}/${BINARY_NAME}"

    if [ ! -f "$binary_path" ]; then
        error "${BINARY_NAME} is not installed at ${binary_path}"
    fi

    if [ -w "$INSTALL_DIR" ]; then
        rm "$binary_path"
    else
        info "Removing from ${INSTALL_DIR} (requires sudo)"
        sudo rm "$binary_path"
    fi

    info "Successfully uninstalled ${BINARY_NAME}"
}

# Main
case "${1:-install}" in
    install)   install ;;
    uninstall) uninstall ;;
    *)         echo "Usage: $0 [install|uninstall]"; exit 1 ;;
esac
