/* ============================================================
   Price Monitor — fetch + cheerio (no headless browser)
   ------------------------------------------------------------
   Fetches the competitor page over HTTP and parses the price
   from the server-rendered HTML, then suggests a reprice
   (2% undercut, never below the floor price).

   No Playwright/Chromium — works instantly on serverless.
   Trade-off: only sees server-rendered HTML; pages that render
   the price purely client-side (heavy SPAs) won't expose it.

   Deps: cheerio
   ============================================================ */
import * as cheerio from 'cheerio';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const PRICE_SELECTORS = [
  '[data-testid="price"]',
  '[data-price]',
  '.price',
  '.product-price',
  '.offer-price',
  '#price',
  '#priceblock_ourprice',
  'span.a-price .a-offscreen',                                  // Amazon
  '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen', // Amazon
  '.price__current',                                            // Shopify
  'span[data-product-price]',                                   // Shopify
  '.woocommerce-Price-amount',                                  // WooCommerce
  '.x-price-primary span',                                      // eBay
  '[itemprop="price"]',                                         // schema.org / Walmart
  'meta[property="product:price:amount"]',                      // OpenGraph product
  'meta[property="og:price:amount"]',
];

function parsePrice(raw) {
  if (!raw) return null;
  const cleaned = String(raw)
    .replace(/[^\d.,]/g, '')
    .replace(/,(\d{2})$/, '.$1')
    .replace(/,/g, '');
  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? null : value;
}

// Fetch HTML with a timeout and a browser-like UA.
async function fetchHtml(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function scrapePrice(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const pageTitle = $('title').first().text().trim();

  let rawText = null;
  let price = null;

  for (const selector of PRICE_SELECTORS) {
    const el = $(selector).first();
    if (el.length) {
      rawText = (el.attr('content') || el.text() || el.attr('data-price') || '').trim();
      price = parsePrice(rawText);
      if (price !== null && price > 0) break;
    }
  }

  // Fallback: scan body text for a "$NN.NN" pattern.
  if (price === null) {
    const bodyText = $('body').text();
    const m = bodyText.match(/[$€£]\s?(\d{1,5}(?:[.,]\d{2})?)/);
    if (m) { rawText = m[0]; price = parsePrice(m[1]); }
  }

  return { price, rawText: rawText || 'Price not found', pageTitle, scrapedAt: new Date().toISOString(), url };
}

function calculateRepricingSuggestion(competitorPrice, myCurrentPrice, floorPrice = 0) {
  const undercutTarget = +(competitorPrice * 0.98).toFixed(2);
  const suggestion = Math.max(undercutTarget, floorPrice);
  const delta = +(suggestion - myCurrentPrice).toFixed(2);

  let action, reasoning;
  if (suggestion < myCurrentPrice) {
    action = 'LOWER_PRICE';
    reasoning = `Competitor is at $${competitorPrice.toFixed(2)}. Suggest lowering to $${suggestion.toFixed(2)} (2% undercut) to stay competitive.`;
  } else if (suggestion > myCurrentPrice) {
    action = 'RAISE_PRICE';
    reasoning = `Competitor is at $${competitorPrice.toFixed(2)}, which is above your current price. You can raise to $${suggestion.toFixed(2)} and still win on price.`;
  } else {
    action = 'HOLD_PRICE';
    reasoning = `Your price of $${myCurrentPrice.toFixed(2)} is already optimal relative to the competitor.`;
  }
  return { suggestion, action, delta, reasoning };
}

export async function runPriceMonitorDemo({ competitorUrl, myCurrentPrice, floorPrice = 0 }) {
  try {
    const scraped = await scrapePrice(competitorUrl);

    if (scraped.price === null) {
      return {
        success: false,
        competitorPrice: null,
        rawText: scraped.rawText,
        pageTitle: scraped.pageTitle,
        scrapedAt: scraped.scrapedAt,
        repricing: null,
        error: 'Could not read a price from that page. It may load the price with JavaScript, require login, or use an unsupported layout. Try a product page that shows the price in plain HTML.',
      };
    }

    const repricing = calculateRepricingSuggestion(scraped.price, myCurrentPrice, floorPrice);
    return {
      success: true,
      competitorPrice: scraped.price,
      rawText: scraped.rawText,
      pageTitle: scraped.pageTitle,
      scrapedAt: scraped.scrapedAt,
      repricing,
    };
  } catch (err) {
    return {
      success: false,
      competitorPrice: null,
      rawText: null,
      pageTitle: null,
      scrapedAt: new Date().toISOString(),
      repricing: null,
      error: err.name === 'AbortError' ? 'The page took too long to respond.' : (err.message || 'Could not fetch that URL.'),
    };
  }
}

export { scrapePrice, calculateRepricingSuggestion };
