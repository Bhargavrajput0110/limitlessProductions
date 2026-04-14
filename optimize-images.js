// ============================================================================
// IMAGE OPTIMIZATION SCRIPT
// Converts images to WebP and AVIF, creates responsive sizes
// ============================================================================

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  inputDir: './public/images',
  outputDir: './public/images/optimized',
  formats: ['webp', 'avif'],
  sizes: [640, 1024, 1920, 2560], // Responsive breakpoints
  quality: {
    webp: 85,
    avif: 80,
    jpeg: 85
  }
};

// Ensure output directory exists
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// Get all image files
function getImageFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && item !== 'optimized') {
      files.push(...getImageFiles(fullPath));
    } else if (/\.(jpg|jpeg|png)$/i.test(item)) {
      files.push(fullPath);
    }
  });

  return files;
}

// Optimize single image
async function optimizeImage(inputPath) {
  const relativePath = path.relative(config.inputDir, inputPath);
  const name = path.parse(relativePath).name;
  const dir = path.dirname(relativePath);
  
  // Create subdirectory structure
  const outputSubDir = path.join(config.outputDir, dir);
  if (!fs.existsSync(outputSubDir)) {
    fs.mkdirSync(outputSubDir, { recursive: true });
  }

  console.log(`\n🖼️  Processing: ${relativePath}`);

  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    console.log(`   Original: ${metadata.width}x${metadata.height} - ${(metadata.size / 1024).toFixed(2)}KB`);

    const results = [];

    // Generate responsive sizes
    for (const size of config.sizes) {
      // Skip if image is smaller than target size
      if (metadata.width < size) continue;

      // WebP
      if (config.formats.includes('webp')) {
        const webpPath = path.join(outputSubDir, `${name}-${size}w.webp`);
        await sharp(inputPath)
          .resize(size, null, { withoutEnlargement: true })
          .webp({ quality: config.quality.webp })
          .toFile(webpPath);
        
        const webpSize = fs.statSync(webpPath).size;
        results.push({ format: 'webp', size, bytes: webpSize });
      }

      // AVIF
      if (config.formats.includes('avif')) {
        const avifPath = path.join(outputSubDir, `${name}-${size}w.avif`);
        await sharp(inputPath)
          .resize(size, null, { withoutEnlargement: true })
          .avif({ quality: config.quality.avif })
          .toFile(avifPath);
        
        const avifSize = fs.statSync(avifPath).size;
        results.push({ format: 'avif', size, bytes: avifSize });
      }
    }

    // Generate full-size optimized versions
    const webpFullPath = path.join(outputSubDir, `${name}.webp`);
    await sharp(inputPath)
      .webp({ quality: config.quality.webp })
      .toFile(webpFullPath);

    const avifFullPath = path.join(outputSubDir, `${name}.avif`);
    await sharp(inputPath)
      .avif({ quality: config.quality.avif })
      .toFile(avifFullPath);

    // Calculate savings
    const originalSize = metadata.size;
    const webpSize = fs.statSync(webpFullPath).size;
    const avifSize = fs.statSync(avifFullPath).size;
    const webpSavings = ((1 - webpSize / originalSize) * 100).toFixed(1);
    const avifSavings = ((1 - avifSize / originalSize) * 100).toFixed(1);

    console.log(`   ✅ WebP: ${(webpSize / 1024).toFixed(2)}KB (${webpSavings}% smaller)`);
    console.log(`   ✅ AVIF: ${(avifSize / 1024).toFixed(2)}KB (${avifSavings}% smaller)`);
    console.log(`   📐 Generated ${results.length} responsive variants`);

    return {
      original: relativePath,
      originalSize,
      webpSize,
      avifSize,
      variants: results.length
    };
  } catch (error) {
    console.error(`   ❌ Error processing ${relativePath}:`, error.message);
    return null;
  }
}

// Main function
async function optimizeAll() {
  console.log('🚀 Starting image optimization...\n');
  console.log(`📁 Input: ${config.inputDir}`);
  console.log(`📁 Output: ${config.outputDir}`);
  console.log(`🎨 Formats: ${config.formats.join(', ')}`);
  console.log(`📐 Sizes: ${config.sizes.join(', ')}`);

  const imageFiles = getImageFiles(config.inputDir);
  console.log(`\n📊 Found ${imageFiles.length} images to optimize\n`);

  const results = [];
  for (const file of imageFiles) {
    const result = await optimizeImage(file);
    if (result) results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 OPTIMIZATION SUMMARY');
  console.log('='.repeat(60));

  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalWebP = results.reduce((sum, r) => sum + r.webpSize, 0);
  const totalAVIF = results.reduce((sum, r) => sum + r.avifSize, 0);
  const totalVariants = results.reduce((sum, r) => sum + r.variants, 0);

  console.log(`\n📁 Images processed: ${results.length}`);
  console.log(`📐 Responsive variants: ${totalVariants}`);
  console.log(`\n💾 Original total: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB`);
  console.log(`💾 WebP total: ${(totalWebP / 1024 / 1024).toFixed(2)}MB (${((1 - totalWebP / totalOriginal) * 100).toFixed(1)}% smaller)`);
  console.log(`💾 AVIF total: ${(totalAVIF / 1024 / 1024).toFixed(2)}MB (${((1 - totalAVIF / totalOriginal) * 100).toFixed(1)}% smaller)`);
  console.log(`\n💰 Total savings: ${((totalOriginal - totalAVIF) / 1024 / 1024).toFixed(2)}MB\n`);

  // Generate HTML snippet
  console.log('📝 Example usage:\n');
  if (results.length > 0) {
    const example = results[0];
    const name = path.parse(example.original).name;
    console.log(`<picture>`);
    console.log(`  <source type="image/avif" srcset="`);
    config.sizes.forEach(size => {
      console.log(`    /public/images/optimized/${name}-${size}w.avif ${size}w,`);
    });
    console.log(`  " sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px">`);
    console.log(`  <source type="image/webp" srcset="`);
    config.sizes.forEach(size => {
      console.log(`    /public/images/optimized/${name}-${size}w.webp ${size}w,`);
    });
    console.log(`  " sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px">`);
    console.log(`  <img src="${example.original}" alt="" loading="lazy" decoding="async">`);
    console.log(`</picture>\n`);
  }

  console.log('✨ Optimization complete!\n');
}

// Run if called directly
if (require.main === module) {
  optimizeAll().catch(console.error);
}

module.exports = { optimizeImage, optimizeAll };
