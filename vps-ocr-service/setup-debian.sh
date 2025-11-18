#!/bin/bash

# Kairo VPS OCR Service - Setup Script for Debian
# Run this script on your Debian VPS

set -e  # Exit on error

echo "=================================="
echo "Kairo VPS OCR Service Setup"
echo "Debian Edition"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo "❌ Please run as root (use sudo)"
   exit 1
fi

# Detect Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
echo "ℹ️  Detected Python version: $PYTHON_VERSION"

# 1. Update system
echo "[1/8] Updating system packages..."
apt-get update
apt-get upgrade -y

# 2. Install system dependencies (Debian compatible)
echo "[2/8] Installing system dependencies..."
apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    git \
    supervisor \
    curl

# 3. Create service user
echo "[3/8] Creating service user..."
if ! id "ocruser" &>/dev/null; then
    useradd -r -s /bin/bash -m -d /opt/kairo ocruser
    echo "✅ User 'ocruser' created"
else
    echo "ℹ️  User 'ocruser' already exists"
fi

# 4. Create directories
echo "[4/8] Creating directories..."
mkdir -p /opt/kairo/vps-ocr-service
mkdir -p /var/log/ocr-service
mkdir -p /tmp/ocr-service

chown -R ocruser:ocruser /opt/kairo
chown -R ocruser:ocruser /var/log/ocr-service
chown -R ocruser:ocruser /tmp/ocr-service

# 5. Copy application files
echo "[5/8] Copying application files..."

# Detect script directory
if [ -d "/root/Kairo/vps-ocr-service" ]; then
    SCRIPT_DIR="/root/Kairo/vps-ocr-service"
    echo "ℹ️  Found repository at /root/Kairo/"
elif [ -d "/Kairo/vps-ocr-service" ]; then
    SCRIPT_DIR="/Kairo/vps-ocr-service"
    echo "ℹ️  Found repository at /Kairo/"
else
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    echo "ℹ️  Using script directory: $SCRIPT_DIR"
fi

echo "Copying from: $SCRIPT_DIR"
echo "Copying to: /opt/kairo/vps-ocr-service/"

# Copy files including hidden files like .env.example
# First copy visible files
cp -r "$SCRIPT_DIR"/* /opt/kairo/vps-ocr-service/ 2>/dev/null || true
# Then copy hidden files (dotfiles)
cp "$SCRIPT_DIR"/.env.example /opt/kairo/vps-ocr-service/ 2>/dev/null || true
cp "$SCRIPT_DIR"/.gitignore /opt/kairo/vps-ocr-service/ 2>/dev/null || true

# Set ownership
chown -R ocruser:ocruser /opt/kairo/vps-ocr-service

# 6. Create Python virtual environment
echo "[6/8] Creating Python virtual environment..."
cd /opt/kairo/vps-ocr-service
python3 -m venv venv
chown -R ocruser:ocruser venv

# 7. Install Python dependencies
echo "[7/8] Installing Python dependencies..."
echo "⏳ This may take 5-10 minutes to download and install packages (~1.5GB)"

# Upgrade pip first
/opt/kairo/vps-ocr-service/venv/bin/pip install --upgrade pip setuptools wheel

# Install dependencies
# Note: We're installing CPU-only PyTorch which is much smaller
/opt/kairo/vps-ocr-service/venv/bin/pip install \
    fastapi==0.109.0 \
    uvicorn[standard]==0.27.0 \
    python-multipart==0.0.6 \
    paddleocr==2.7.3 \
    paddlepaddle==2.6.1 \
    pdf2image==1.17.0 \
    Pillow==10.2.0 \
    psycopg2-binary==2.9.9 \
    asyncpg==0.29.0 \
    aiohttp==3.9.1 \
    httpx==0.26.0 \
    python-dotenv==1.0.0 \
    pydantic==2.5.3 \
    pydantic-settings==2.1.0 \
    loguru==0.7.2

# Install PyTorch CPU version and sentence-transformers separately
echo "Installing PyTorch (CPU version) and sentence-transformers..."
/opt/kairo/vps-ocr-service/venv/bin/pip install \
    torch==2.2.0+cpu \
    torchvision==0.17.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

/opt/kairo/vps-ocr-service/venv/bin/pip install \
    sentence-transformers==2.3.1

# Fix permissions after pip install
chown -R ocruser:ocruser /opt/kairo/vps-ocr-service/venv

echo "✅ Python dependencies installed"

# 8. Set up environment file
echo "[8/8] Setting up environment configuration..."
if [ ! -f /opt/kairo/vps-ocr-service/.env ]; then
    cp /opt/kairo/vps-ocr-service/.env.example /opt/kairo/vps-ocr-service/.env
    chown ocruser:ocruser /opt/kairo/vps-ocr-service/.env
    chmod 600 /opt/kairo/vps-ocr-service/.env

    echo ""
    echo "⚠️  IMPORTANT: The .env file has been created from .env.example"
    echo ""
    echo "If you need to change settings, edit:"
    echo "  /opt/kairo/vps-ocr-service/.env"
    echo ""
else
    echo "ℹ️  .env file already exists, not overwriting"
fi

# Install systemd service
echo ""
echo "Installing systemd service..."
cp /opt/kairo/vps-ocr-service/ocr-service.service /etc/systemd/system/
systemctl daemon-reload

echo ""
echo "=================================="
echo "✅ Setup Complete!"
echo "=================================="
echo ""
echo "Configuration detected:"
echo "  Python: $PYTHON_VERSION"
echo "  Install path: /opt/kairo/vps-ocr-service"
echo "  Logs: /var/log/ocr-service"
echo "  Temp: /tmp/ocr-service"
echo ""
echo "Your configuration:"
echo "  Config file: /opt/kairo/vps-ocr-service/.env"
DATABASE_URL=$(grep "^DATABASE_URL=" /opt/kairo/vps-ocr-service/.env 2>/dev/null | cut -d'=' -f2-)
if [ ! -z "$DATABASE_URL" ]; then
    # Mask password in output
    MASKED_URL=$(echo "$DATABASE_URL" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')
    echo "  Database: $MASKED_URL"
else
    echo "  Database: ⚠️  NOT CONFIGURED"
fi
echo ""
echo "Next steps:"
echo ""
echo "1. Verify configuration (especially DATABASE_URL):"
echo "   sudo nano /opt/kairo/vps-ocr-service/.env"
echo ""
echo "2. Start the service:"
echo "   sudo systemctl start ocr-service"
echo ""
echo "3. Enable auto-start on boot:"
echo "   sudo systemctl enable ocr-service"
echo ""
echo "4. Check service status:"
echo "   sudo systemctl status ocr-service"
echo ""
echo "5. View logs:"
echo "   sudo journalctl -u ocr-service -f"
echo ""
echo "6. Test the service:"
echo "   curl http://localhost:8000/health"
echo ""
