#!/bin/bash

# Kairo VPS OCR Service - Setup Script
# Run this script on your VPS to install and configure the OCR service

set -e  # Exit on error

echo "=================================="
echo "Kairo VPS OCR Service Setup"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo "❌ Please run as root (use sudo)"
   exit 1
fi

# 1. Update system
echo "[1/8] Updating system packages..."
apt-get update
apt-get upgrade -y

# 2. Install system dependencies
echo "[2/8] Installing system dependencies..."
apt-get install -y \
    python3.10 \
    python3-pip \
    python3.10-venv \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    git \
    supervisor

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
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Copy files as ocruser
sudo -u ocruser cp -r "$SCRIPT_DIR"/* /opt/kairo/vps-ocr-service/

# 6. Create Python virtual environment
echo "[6/8] Creating Python virtual environment..."
sudo -u ocruser python3.10 -m venv /opt/kairo/vps-ocr-service/venv

# 7. Install Python dependencies
echo "[7/8] Installing Python dependencies (this may take 5-10 minutes)..."
sudo -u ocruser /opt/kairo/vps-ocr-service/venv/bin/pip install --upgrade pip
sudo -u ocruser /opt/kairo/vps-ocr-service/venv/bin/pip install -r /opt/kairo/vps-ocr-service/requirements.txt

# 8. Set up environment file
echo "[8/8] Setting up environment configuration..."
if [ ! -f /opt/kairo/vps-ocr-service/.env ]; then
    cp /opt/kairo/vps-ocr-service/.env.example /opt/kairo/vps-ocr-service/.env
    chown ocruser:ocruser /opt/kairo/vps-ocr-service/.env
    chmod 600 /opt/kairo/vps-ocr-service/.env

    echo ""
    echo "⚠️  IMPORTANT: Edit /opt/kairo/vps-ocr-service/.env with your configuration"
    echo ""
    echo "Required settings:"
    echo "  - DATABASE_URL (Supabase connection string)"
    echo "  - VPS_INSTANCE_ID (unique ID for this VPS)"
    echo "  - WEBHOOK_SECRET (if using webhooks)"
    echo ""
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
echo "Next steps:"
echo ""
echo "1. Edit configuration:"
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
