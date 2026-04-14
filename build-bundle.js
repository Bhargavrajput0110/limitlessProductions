// ============================================================================
// BUILD SCRIPT - Bundle all dependencies for production
// ============================================================================

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  production: process.env.NODE_ENV === 'production',
  analyze: process.argv.includes('--analyze')
};

console.log('🚀 Building production bundle...\n');

// Main bundle
async function buildMain() {
  try {
    const result = await esbuild.build({
      entryPoints: ['main.js'],
      bundle: true,
      minify: config.production,
      sourcemap: config.production ? false : true,
      target: ['es2020', 'chrome90', 'firefox88', 'safari14'],
      outfile: 'dist/main.bundle.js',
      format: 'esm',
      splitting: false, // Disable for single file output
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

    const size = fs.statSync('dist/main.bundle.js').size;
    const sizeKB = (size / 1024).toFixed(2);
    const sizeMB = (size / 1024 / 1024).toFixed(2);

    console.log('✅ Main bundle created successfully');
    console.log(`📦 Bundle size: ${sizeKB}KB (${sizeMB}MB)`);

    if (config.analyze && result.metafile) {
      fs.writeFileSync('dist/meta.json', JSON.stringify(result.metafile, null, 2));
      console.log('📊 Bundle analysis saved to dist/meta.json');
      
      // Print top 10 largest modules
      const modules = Object.entries(result.metafile.inputs)
        .map(([path, info]) => ({ path, size: info.bytes }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 10);

      console.log('\n📈 Top 10 largest modules:');
      modules.forEach((mod, i) => {
        console.log(`${i + 1}. ${mod.path} - ${(mod.size / 1024).toFixed(2)}KB`);
      });
    }

    return result;
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Performance optimization bundle
async function buildPerformance() {
  try {
    await esbuild.build({
      entryPoints: ['performance-optimization.js'],
      bundle: true,
      minify: config.production,
      sourcemap: config.production ? false : true,
      target: ['es2020'],
      outfile: 'dist/performance.bundle.js',
      format: 'esm',
      treeShaking: true,
      logLevel: 'info'
    });

    const size = fs.statSync('dist/performance.bundle.js').size;
    console.log(`✅ Performance bundle: ${(size / 1024).toFixed(2)}KB`);
  } catch (error) {
    console.error('❌ Performance bundle failed:', error);
  }
}

// Build all
async function buildAll() {
  // Create dist directory
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }

  await Promise.all([
    buildMain(),
    buildPerformance()
  ]);

  console.log('\n✨ Build complete!\n');
  
  // Calculate total size
  const totalSize = fs.readdirSync('dist')
    .filter(file => file.endsWith('.js'))
    .reduce((sum, file) => {
      return sum + fs.statSync(path.join('dist', file)).size;
    }, 0);

  console.log(`📦 Total bundle size: ${(totalSize / 1024).toFixed(2)}KB`);
  
  // Compression estimate
  const gzipEstimate = totalSize * 0.3; // Rough estimate
  console.log(`🗜️  Estimated gzipped: ${(gzipEstimate / 1024).toFixed(2)}KB`);
}

buildAll();
