// ============================================================================
// BUILD SCRIPT WITH FILE HASHING
// Generates content-based hashes for cache busting
// ============================================================================

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const config = {
  production: process.env.NODE_ENV === 'production',
  analyze: process.argv.includes('--analyze')
};

console.log('🚀 Building with content hashing...\n');

// Generate content hash
function generateHash(content) {
  return crypto
    .createHash('md5')
    .update(content)
    .digest('hex')
    .substring(0, 8);
}

// Main bundle with hashing
async function buildMain() {
  try {
    // Build without hash first
    const result = await esbuild.build({
      entryPoints: ['main.js'],
      bundle: true,
      minify: config.production,
      sourcemap: config.production ? false : true,
      target: ['es2020', 'chrome90', 'firefox88', 'safari14'],
      outfile: 'dist/main.bundle.temp.js',
      format: 'esm',
      treeShaking: true,
      metafile: config.analyze,
      loader: {
        '.js': 'js',
        '.jsx': 'jsx'
      },
      define: {
        'process.env.NODE_ENV': config.production ? '"production"' : '"development"'
      },
      banner: {
        js: '// Limitless Productions - Bundled with esbuild'
      },
      logLevel: 'info'
    });

    // Read the built file
    const content = fs.readFileSync('dist/main.bundle.temp.js', 'utf8');
    
    // Generate hash
    const hash = generateHash(content);
    const hashedFilename = `main.bundle.${hash}.js`;
    const hashedPath = path.join('dist', hashedFilename);

    // Rename with hash
    fs.renameSync('dist/main.bundle.temp.js', hashedPath);

    // Also create a non-hashed version for development
    if (!config.production) {
      fs.copyFileSync(hashedPath, 'dist/main.bundle.js');
    }

    const size = fs.statSync(hashedPath).size;
    const sizeKB = (size / 1024).toFixed(2);

    console.log('✅ Main bundle created successfully');
    console.log(`📦 Bundle: ${hashedFilename}`);
    console.log(`📦 Size: ${sizeKB}KB`);

    // Update HTML with hashed filename
    updateHTMLReferences('main.bundle.js', hashedFilename);

    if (config.analyze && result.metafile) {
      fs.writeFileSync('dist/meta.json', JSON.stringify(result.metafile, null, 2));
      console.log('📊 Bundle analysis saved to dist/meta.json');
    }

    return { filename: hashedFilename, hash, size };
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Performance bundle with hashing
async function buildPerformance() {
  try {
    await esbuild.build({
      entryPoints: ['performance-optimization.js'],
      bundle: true,
      minify: config.production,
      sourcemap: config.production ? false : true,
      target: ['es2020'],
      outfile: 'dist/performance.bundle.temp.js',
      format: 'esm',
      treeShaking: true,
      logLevel: 'info'
    });

    const content = fs.readFileSync('dist/performance.bundle.temp.js', 'utf8');
    const hash = generateHash(content);
    const hashedFilename = `performance.bundle.${hash}.js`;
    const hashedPath = path.join('dist', hashedFilename);

    fs.renameSync('dist/performance.bundle.temp.js', hashedPath);

    if (!config.production) {
      fs.copyFileSync(hashedPath, 'dist/performance.bundle.js');
    }

    const size = fs.statSync(hashedPath).size;
    console.log(`✅ Performance bundle: ${hashedFilename} (${(size / 1024).toFixed(2)}KB)`);

    updateHTMLReferences('performance.bundle.js', hashedFilename);

    return { filename: hashedFilename, hash, size };
  } catch (error) {
    console.error('❌ Performance bundle failed:', error);
  }
}

// Update HTML files with hashed filenames
function updateHTMLReferences(oldFilename, newFilename) {
  const htmlFiles = ['index.html', 'journal.html', 'privacy.html', 'terms.html'];
  
  htmlFiles.forEach(file => {
    if (!fs.existsSync(file)) return;
    
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace script src
    content = content.replace(
      new RegExp(`src=["']([^"']*?)${oldFilename}["']`, 'g'),
      `src="$1${newFilename}"`
    );
    
    // Replace module imports
    content = content.replace(
      new RegExp(`from ["']([^"']*?)${oldFilename}["']`, 'g'),
      `from "$1${newFilename}"`
    );
    
    fs.writeFileSync(file, content);
  });
  
  console.log(`📝 Updated HTML references: ${oldFilename} → ${newFilename}`);
}

// Generate manifest with all hashed files
function generateManifest(builds) {
  const manifest = {
    version: Date.now(),
    files: {}
  };

  builds.forEach(build => {
    if (build) {
      const originalName = build.filename.replace(/\.[a-f0-9]{8}\./, '.');
      manifest.files[originalName] = {
        hashed: build.filename,
        hash: build.hash,
        size: build.size
      };
    }
  });

  fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
  console.log('📋 Generated manifest.json');
}

// Build CSS with hashing
async function buildCSS() {
  const { execSync } = require('child_process');
  
  try {
    // Build Tailwind CSS
    execSync('npx tailwindcss -i ./src/input.css -o ./dist/styles.temp.css --minify', {
      stdio: 'inherit'
    });

    const content = fs.readFileSync('dist/styles.temp.css', 'utf8');
    const hash = generateHash(content);
    const hashedFilename = `styles.${hash}.css`;
    const hashedPath = path.join('dist', hashedFilename);

    fs.renameSync('dist/styles.temp.css', hashedPath);

    if (!config.production) {
      fs.copyFileSync(hashedPath, 'dist/styles.css');
    }

    const size = fs.statSync(hashedPath).size;
    console.log(`✅ CSS bundle: ${hashedFilename} (${(size / 1024).toFixed(2)}KB)`);

    updateHTMLReferences('styles.css', hashedFilename);

    return { filename: hashedFilename, hash, size };
  } catch (error) {
    console.error('❌ CSS build failed:', error);
    return null;
  }
}

// Build all
async function buildAll() {
  // Create dist directory
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }

  const builds = await Promise.all([
    buildMain(),
    buildPerformance(),
    buildCSS()
  ]);

  // Generate manifest
  generateManifest(builds);

  console.log('\n✨ Build complete with content hashing!\n');
  
  // Calculate total size
  const totalSize = builds.reduce((sum, build) => {
    return sum + (build ? build.size : 0);
  }, 0);

  console.log(`📦 Total bundle size: ${(totalSize / 1024).toFixed(2)}KB`);
  console.log(`🗜️  Estimated gzipped: ${(totalSize * 0.3 / 1024).toFixed(2)}KB`);
  
  console.log('\n🎯 Cache Strategy:');
  console.log('   Static assets (JS/CSS): Cache FOREVER (immutable)');
  console.log('   HTML files: No cache (must-revalidate)');
  console.log('   Images/Videos: Cache FOREVER (immutable)');
  console.log('   Fonts: Cache FOREVER (immutable)');
}

buildAll();
