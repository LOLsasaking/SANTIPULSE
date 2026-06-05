/* ============================================================
   Lead Scraper — fetch + cheerio (no headless browser)
   ------------------------------------------------------------
   Fetches a directory/listing page over HTTP and extracts
   business names / emails / phones / websites from the
   server-rendered HTML, deduped by email.

   No Playwright/Chromium — works instantly on serverless.
   Trade-off: only sees server-rendered HTML.

   Deps: cheerio
   ============================================================ */
import * as cheerio from 'cheerio';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

const LISTING_SELECTORS = {
  container: [
    '.business-listing', '.result', '.biz-listing-large',
    '[data-testid="serp-ia-card"]', '.organic__item', '.v-card',
    'article', '.listing', '.company-card', '.profile-card',
  ],
  name: [
    'h2', 'h3', 'h4', '.business-name', '.biz-name', '.company-name',
    '[data-testid="biz-name"]', '.result-title', '.name',
  ],
  phone: ['.phone', '[data-testid="phone-number"]', '.biz-phone', '.telephone', '[itemprop="telephone"]'],
  website: ["a[href^='http']:not([href*='yelp']):not([href*='google']):not([href*='facebook'])"],
};

function extractEmails(text) {
  return [...new Set((text.match(EMAIL_REGEX) || []).map((e) => e.toLowerCase()))];
}
function extractPhones(text) {
  return [...new Set(text.match(PHONE_REGEX) || [])];
}

async function fetchHtml(url, timeoutMs = 14000) {
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

function extractLeadsFromHTML(html, sourceUrl) {
  const $ = cheerio.load(html);
  const leads = [];

  let containers = $();
  for (const sel of LISTING_SELECTORS.container) {
    containers = $(sel);
    if (containers.length >= 2) break;
  }

  if (containers.length >= 2) {
    containers.each((_, el) => {
      const block = $(el);
      const blockText = block.text();
      const blockHtml = block.html() || '';

      let name = null;
      for (const sel of LISTING_SELECTORS.name) {
        const nameEl = block.find(sel).first();
        if (nameEl.length) { name = nameEl.text().trim(); break; }
      }

      const mailtoLinks = block.find("a[href^='mailto:']");
      let email = null;
      if (mailtoLinks.length) {
        email = mailtoLinks.first().attr('href').replace('mailto:', '').split('?')[0].toLowerCase();
      } else {
        email = extractEmails(blockHtml)[0] || null;
      }

      let phone = null;
      for (const sel of LISTING_SELECTORS.phone) {
        const phoneEl = block.find(sel).first();
        if (phoneEl.length) { phone = phoneEl.text().trim(); break; }
      }
      if (!phone) phone = extractPhones(blockText)[0] || null;

      let website = null;
      for (const sel of LISTING_SELECTORS.website) {
        const linkEl = block.find(sel).first();
        if (linkEl.length) {
          const href = linkEl.attr('href');
          if (href && href.startsWith('http')) { website = href; break; }
        }
      }

      if (name || email || phone) leads.push({ name, email, phone, website, source: sourceUrl });
    });
  }

  if (leads.length === 0) {
    const fullHtml = $('body').html() || '';
    const fullText = $('body').text();
    const emails = extractEmails(fullHtml);
    const phones = extractPhones(fullText);
    emails.forEach((email, i) => {
      leads.push({ name: null, email, phone: phones[i] || null, website: sourceUrl, source: sourceUrl });
    });
  }

  return leads;
}

function deduplicateLeads(leads) {
  const seen = new Set();
  const deduped = [];
  let noEmailCount = 0;
  for (const lead of leads) {
    if (lead.email) {
      if (!seen.has(lead.email)) { seen.add(lead.email); deduped.push(lead); }
    } else if (noEmailCount < 10) {
      deduped.push(lead);
      noEmailCount++;
    }
  }
  return deduped;
}

export async function runLeadScraperDemo({ targetUrl, maxLeads = 10 }) {
  try {
    const html = await fetchHtml(targetUrl);
    const $ = cheerio.load(html);
    const pageTitle = $('title').first().text().trim();

    const rawLeads = extractLeadsFromHTML(html, targetUrl);
    const deduped = deduplicateLeads(rawLeads);
    const leads = deduped.slice(0, maxLeads);

    return { success: true, leads, totalFound: deduped.length, pageTitle, scrapedAt: new Date().toISOString() };
  } catch (err) {
    return {
      success: false,
      leads: [],
      totalFound: 0,
      pageTitle: null,
      scrapedAt: new Date().toISOString(),
      error: err.name === 'AbortError' ? 'The page took too long to respond.' : (err.message || 'Could not fetch that URL.'),
    };
  }
}

export { extractLeadsFromHTML, deduplicateLeads };
