#!/bin/bash

# ============================================================================
# Generate Test Fixtures for E2E Tests
# ============================================================================
# This script creates placeholder images and documents for testing
# ============================================================================

set -e

echo "🎨 Generating E2E test fixtures..."
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check for ImageMagick
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install imagemagick
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y imagemagick
    else
        echo "❌ Please install ImageMagick manually"
        exit 1
    fi
fi

# 1. Generate delivery-proof.jpg (~1MB)
echo "📸 Creating delivery-proof.jpg..."
convert -size 1024x768 \
  canvas:white \
  -pointsize 30 -fill '#333333' \
  -gravity North -annotate +0+50 "Delivery Proof Test Image" \
  -pointsize 20 -fill '#666666' \
  -gravity Center -annotate +0+0 "Construction materials delivered\nTest fixture for E2E tests" \
  -pointsize 16 -fill '#999999' \
  -gravity South -annotate +0+30 "$(date '+%Y-%m-%d %H:%M:%S')" \
  -quality 85 \
  delivery-proof.jpg

# 2. Generate damaged-product.jpg (~1MB)
echo "📸 Creating damaged-product.jpg..."
convert -size 1024x768 \
  canvas:white \
  -pointsize 30 -fill '#cc0000' \
  -gravity North -annotate +0+50 "Damaged Product Evidence" \
  -pointsize 20 -fill '#ff3333' \
  -gravity Center -annotate +0+0 "Product shows visible damage\nTest fixture for dispute flow" \
  -pointsize 16 -fill '#999999' \
  -gravity South -annotate +0+30 "$(date '+%Y-%m-%d %H:%M:%S')" \
  -quality 85 \
  damaged-product.jpg

# 3. Generate large-photo.jpg (>5MB)
echo "📸 Creating large-photo.jpg (>5MB)..."
convert -size 4000x3000 \
  canvas:white \
  -pointsize 80 -fill '#333333' \
  -gravity North -annotate +0+150 "Large Test Image" \
  -pointsize 50 -fill '#666666' \
  -gravity Center -annotate +0+0 "This image exceeds 5MB size limit\nUsed to test file size validation" \
  -pointsize 40 -fill '#999999' \
  -gravity South -annotate +0+100 "$(date '+%Y-%m-%d %H:%M:%S')" \
  -quality 98 \
  large-photo.jpg

# 4. Generate document.pdf
echo "📄 Creating document.pdf..."
cat > temp.txt << EOF
Test PDF Document

This is an invalid file type for delivery proof uploads.

Purpose: Test file type validation
Created: $(date '+%Y-%m-%d %H:%M:%S')

This PDF should be rejected when uploaded as delivery proof
because only images (JPEG, PNG) are accepted.
EOF

if command -v ps2pdf &> /dev/null; then
    enscript -B -p temp.ps temp.txt 2>/dev/null || true
    ps2pdf temp.ps document.pdf 2>/dev/null || true
    rm -f temp.ps temp.txt
elif command -v pandoc &> /dev/null; then
    pandoc temp.txt -o document.pdf
    rm -f temp.txt
else
    # Fallback: create minimal PDF manually
    cat > document.pdf << 'PDFEOF'
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000315 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
406
%%EOF
PDFEOF
    rm -f temp.txt
fi

# Verify files were created
echo ""
echo "✅ Fixtures generated successfully!"
echo ""
echo "Files created:"
ls -lh delivery-proof.jpg damaged-product.jpg large-photo.jpg document.pdf

echo ""
echo "File sizes:"
echo "  delivery-proof.jpg:  $(du -h delivery-proof.jpg | cut -f1)"
echo "  damaged-product.jpg: $(du -h damaged-product.jpg | cut -f1)"
echo "  large-photo.jpg:     $(du -h large-photo.jpg | cut -f1)"
echo "  document.pdf:        $(du -h document.pdf | cut -f1)"

# Verify large photo is actually >5MB
LARGE_SIZE=$(stat -f%z large-photo.jpg 2>/dev/null || stat -c%s large-photo.jpg 2>/dev/null || echo 0)
if [ "$LARGE_SIZE" -lt 5242880 ]; then
    echo ""
    echo "⚠️  Warning: large-photo.jpg is smaller than 5MB"
    echo "   Regenerating with higher quality..."
    convert -size 4000x3000 \
      canvas:white \
      -pointsize 80 -fill '#333333' \
      -gravity North -annotate +0+150 "Large Test Image" \
      -pointsize 50 -fill '#666666' \
      -gravity Center -annotate +0+0 "This image exceeds 5MB size limit" \
      -quality 100 \
      large-photo.jpg
fi

echo ""
echo "🎯 Test fixtures ready for E2E tests!"
