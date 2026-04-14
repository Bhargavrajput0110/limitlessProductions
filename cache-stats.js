// ============================================================================
// CACHE STATISTICS TOOL
// Check service worker cache performance
// ============================================================================

const puppeteer = require('puppeteer');

async function getCacheStats(url = 'http://localhost:3000') {
  console.log('🔍 Checking cache statistics...\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Enable request interception
  await page.setRequestInterception(true);
  
  const stats = {
    total: 0,
    cached: 0,
    network: 0,
    resources: []
  };
  
  page.on('request', (request) => {
    request.continue();
  });
  
  page.on('response', (response) => {
    const url = response.url();
    const fromCache = response.fromCache();
    const fromServiceWorker = response.fromServiceWorker();
    
    stats.total++;
    
    if (fromCache || fromServiceWorker) {
      stats.cached++;
    } else {
      stats.network++;
    }
    
    stats.resources.push({
      url: url.substring(url.lastIndexOf('/') + 1),
      cached: fromCache || fromServiceWorker,
      size: response.headers()['content-length'] || 'unknown'
    });
  });
  
  // First visit
  console.log('📊 First Visit (Cold Cache)');
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  const firstVisit = { ...stats };
  stats.total = 0;
  stats.cached = 0;
  stats.network = 0;
  stats.resources = [];
  
  // Second visit
  console.log('\n📊 Second Visit (Warm Cache)');
  await page.reload({ waitUntil: 'networkidle2' });
  
  const secondVisit = { ...stats };
  
  await browser.close();
  
  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('CACHE PERFORMANCE REPORT');
  console.log('='.repeat(60));
  
  console.log('\n📈 First Visit (Cold Cache):');
  console.log(`   Total Requests: ${firstVisit.total}`);
  console.log(`   From Network: ${firstVisit.network}`);
  console.log(`   From Cache: ${firstVisit.cached}`);
  console.log(`   Cache Hit Rate: ${((firstVisit.cached / firstVisit.total) * 100).toFixed(1)}%`);
  
  console.log('\n📈 Second Visit (Warm Cache):');
  console.log(`   Total Requests: ${secondVisit.total}`);
  console.log(`   From Network: ${secondVisit.network}`);
  console.log(`   From Cache: ${secondVisit.cached}`);
  console.log(`   Cache Hit Rate: ${((secondVisit.cached / secondVisit.total) * 100).toFixed(1)}%`);
  
  console.log('\n💾 Cached Resources:');
  secondVisit.resources
    .filter(r => r.cached)
    .forEach(r => {
      console.log(`   ✅ ${r.url}`);
    });
  
  console.log('\n🌐 Network Resources:');
  secondVisit.resources
    .filter(r => !r.cached)
    .forEach(r => {
      console.log(`   ❌ ${r.url}`);
    });
  
  console.log('\n' + '='.repeat(60));
  
  const improvement = ((secondVisit.cached / secondVisit.total) * 100).toFixed(1);
  if (improvement >= 90) {
    console.log('🎉 Excellent! Cache hit rate > 90%');
  } else if (improvement >= 70) {
    console.log('✅ Good! Cache hit rate > 70%');
  } else {
    console.log('⚠️  Warning: Cache hit rate < 70%');
    console.log('   Consider reviewing your caching strategy.');
  }
}

// Run if called directly
if (require.main === module) {
  const url = process.argv[2] || 'http://localhost:3000';
  getCacheStats(url).catch(console.error);
}

module.exports = { getCacheStats };
