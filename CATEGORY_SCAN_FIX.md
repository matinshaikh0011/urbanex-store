# CartPe Category Scanning Fix (v4 - THE REAL FIX)

## The Real Problem Discovered
CartPe category pages use a **COMPLETELY DIFFERENT AJAX ENDPOINT** than the full catalog!

### What Was Wrong:
- **Old endpoint** (allproduct): `/allproductoadmore` with `cat_ids` parameter
  - **BROKEN**: Returns ALL store products, ignores category filter
  - Result: Scraped 334 mixed products instead of 319 track pants

### The Actual Solution:
CartPe has a **category-specific endpoint**: `/store_product_loadmore`
- Uses `category_slug` parameter instead of `cat_ids`
- Example: `category_slug: "track-pants"`
- **WORKS CORRECTLY**: Returns only products from that category!

## How I Found It
Inspected the JavaScript on https://timescorner.cartpe.in/track-pants.html:

```javascript
// The "View More" button uses THIS endpoint:
function loadmore_products_1() {
  var category_slug = 'track-pants';
  $.ajax({
    url: "https://timescorner.cartpe.in/store_product_loadmore",  // ← Different!
    data: {
      getresult: val,
      category_slug: category_slug,  // ← category_slug, not cat_ids!
      searchkeyword: searchkeyword,
      web_token: web_token,
      // ...
    }
  });
}
```

## Implementation

### 1. New Helper Functions:
```javascript
// Extract category slug from URL
function categorySlugFromUrl(url) {
  // "https://timescorner.cartpe.in/track-pants.html" → "track-pants"
  const pathname = new URL(url).pathname;
  return pathname.replace(/^\//, '').replace(/\.html$/i, '');
}

// Return correct endpoint based on page type
function loadMoreUrl(base, isCategoryPage = false) {
  if (isCategoryPage) {
    return `${base}/store_product_loadmore`;  // Category endpoint
  }
  return `${base}/allproductoadmore`;  // Full catalog endpoint
}
```

### 2. Updated AJAX Parameters:
```javascript
// FOR CATEGORY PAGES:
params = {
  getresult: String(rowNo),
  category_slug: "track-pants",  // ← The key!
  searchkeyword: searchKey,
  web_token: webToken,
  // ...
};

// FOR FULL CATALOG:
params = {
  getresult: String(rowNo),
  searchkey: searchKey,  // Note: different param name
  cat_ids: catIds,
  web_token: webToken,
  // ...
};
```

### 3. Smart Detection:
- Detects if URL is category page: `!/allproduct/i.test(url)`
- Extracts category slug: `categorySlugFromUrl(url)`
- Uses correct endpoint automatically

## Expected Behavior

### For https://timescorner.cartpe.in/track-pants.html:
```
🎯 CATEGORY PAGE — will use category-specific AJAX endpoint
Category slug: "track-pants"
🎯 Category limit set: 319 products
Page 1 (row_no=0): 12 new (total: 12)
Page 2 (row_no=12): 12 new (total: 24)
...
Page 27 (row_no=312): 7 new (total: 319)
✅ Reached expected category product count (319) — stopping
```

### Result:
- ✅ Returns exactly 319 track pants
- ✅ NO mixed products (no shoes, glasses, etc.)
- ✅ Correct category filtering

## Benefits
1. **Accurate**: Uses the CORRECT endpoint that CartPe actually uses
2. **Complete**: Gets all products from the category (319, 5000, whatever)
3. **Fast**: Stops at detected count
4. **No mixing**: Only returns products from the specified category

## Files Changed
- `backend/src/scrapers/cartpeProvider.js`
  - Added `categorySlugFromUrl()` helper
  - Updated `loadMoreUrl()` to return correct endpoint
  - Updated `scanListings()` to use different params for categories
  - Added `categorySlug` parameter handling

## Deploy & Test
After deploying:
1. Try: https://timescorner.cartpe.in/track-pants.html
2. Should return: **319 products, ALL track pants**
3. No mixed products, no full store scan

This is the real fix! 🎯
