# E2E Test Fixtures

This directory contains test fixtures (images, documents) used in E2E tests.

## Required Files

### Images for Delivery Proof Tests

#### 1. delivery-proof.jpg
- **Purpose**: Valid delivery proof photo
- **Specs**:
  - Format: JPEG
  - Size: 500KB - 2MB
  - Dimensions: 1024x768 or higher
  - Content: Photo of delivered materials at construction site
- **Used in**:
  - `payment-escrow-flow.spec.ts`
  - `delivery-confirmation.spec.ts`

#### 2. damaged-product.jpg
- **Purpose**: Evidence photo for dispute creation
- **Specs**:
  - Format: JPEG
  - Size: 500KB - 2MB
  - Dimensions: 1024x768 or higher
  - Content: Photo showing damaged construction materials
- **Used in**:
  - `payment-escrow-flow.spec.ts`

#### 3. large-photo.jpg
- **Purpose**: Oversized photo to test size limits
- **Specs**:
  - Format: JPEG
  - Size: >5MB (to trigger size validation)
  - Dimensions: 4000x3000 or higher
- **Used in**:
  - `delivery-confirmation.spec.ts`

### Documents

#### 4. document.pdf
- **Purpose**: Invalid file type for delivery proof
- **Specs**:
  - Format: PDF
  - Size: Any
  - Content: Any document (invoice, receipt, etc.)
- **Used in**:
  - `delivery-confirmation.spec.ts`

## Creating Test Fixtures

### Option 1: Use Real Photos
1. Take photos of construction materials/sites
2. Resize appropriately
3. Name according to the specifications above

### Option 2: Generate Placeholder Images

```bash
# Install imagemagick
brew install imagemagick

# Generate delivery-proof.jpg (1MB)
convert -size 1024x768 xc:gray -pointsize 40 -fill black \
  -annotate +50+400 "Delivery Proof Test Image" \
  -quality 85 delivery-proof.jpg

# Generate damaged-product.jpg (1MB)
convert -size 1024x768 xc:gray -pointsize 40 -fill red \
  -annotate +50+400 "Damaged Product Evidence" \
  -quality 85 damaged-product.jpg

# Generate large-photo.jpg (>5MB)
convert -size 4000x3000 xc:gray -pointsize 80 -fill black \
  -annotate +200+1500 "Large Test Image (>5MB)" \
  -quality 95 large-photo.jpg

# Generate document.pdf
echo "Test PDF Document" | ps2pdf - document.pdf
```

### Option 3: Download From Assets
Download sample images from the project's test assets repository (if available).

## Environment Setup

Make sure these fixtures exist before running E2E tests:

```bash
cd apps/web/e2e/fixtures
ls -lh
# Should show:
# delivery-proof.jpg
# damaged-product.jpg
# large-photo.jpg
# document.pdf
```

## CI/CD Integration

For CI/CD pipelines, fixtures can be:
1. Committed to the repository (small files only)
2. Downloaded from a CDN/S3 bucket during test setup
3. Generated on-the-fly using scripts

## Security Note

Do not use real customer photos or sensitive data in test fixtures. All fixtures should be:
- Non-sensitive
- Publicly shareable
- Clearly marked as test data
