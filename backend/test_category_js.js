// Extract JavaScript to find the real Load More logic for categories
import axios from 'axios';

const testUrl = 'https://timescorner.cartpe.in/track-pants.html';

async function extractLoadMoreLogic() {
  console.log(`Fetching: ${testUrl}\n`);
  
  const { data: html } = await axios.get(testUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 15000,
  });
  
  // Extract all <script> tags
  const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  
  console.log(`Found ${scriptMatches.length} script tags\n`);
  
  // Find scripts that mention loadmore or allproduct
  const relevantScripts = scriptMatches.filter(script => 
    /loadmore|allproduct|getresult|cat_id/i.test(script)
  );
  
  console.log(`=== Relevant Scripts (${relevantScripts.length}) ===\n`);
  
  relevantScripts.forEach((script, i) => {
    // Clean up the script
    const clean = script
      .replace(/<script[^>]*>/, '')
      .replace(/<\/script>/, '')
      .trim();
    
    if (clean.length > 100 && clean.length < 5000) {
      console.log(`\n━━━ Script ${i + 1} ━━━`);
      console.log(clean.substring(0, 2000));
      if (clean.length > 2000) console.log('\n... (truncated)');
    }
  });
}

extractLoadMoreLogic().catch(console.error);
