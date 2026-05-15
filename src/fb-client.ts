// Facebook MCP Client - Multi-Page Token Management
// User token → auto-exchanges for page tokens on init (ALL pages cached)
// Page operations use per-page token; Marketing API uses user token

const USER_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || '';
const DEFAULT_PAGE_ID = process.env.FACEBOOK_PAGE_ID || '';
const API_VERSION = process.env.FB_API_VERSION || 'v25.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// Multi-page token cache: pageId → { token, name, category }
interface PageInfo {
  id: string;
  name: string;
  category?: string;
  token: string;
}
const pageCache = new Map<string, PageInfo>();
let defaultPageId = DEFAULT_PAGE_ID;
let initScopes: string[] = [];

// --- Token Exchange & Init ---

async function init(): Promise<{ pageId: string; pageName: string; scopes: string[]; pageCount: number }> {
  if (!USER_TOKEN) throw new Error('FACEBOOK_ACCESS_TOKEN env var is required');

  // 1. Debug token to check scopes
  initScopes = await getTokenScopes();
  console.log(`[fb-client] Token scopes: ${initScopes.join(', ')}`);

  const recommended = [
    'pages_read_engagement', 'pages_manage_posts', 'pages_read_user_content',
    'read_insights', 'pages_manage_metadata', 'ads_read', 'ads_management',
    'business_management', 'pages_messaging'
  ];
  const missing = recommended.filter(s => !initScopes.includes(s));
  if (missing.length > 0) {
    console.warn(`[fb-client] ⚠️  Missing recommended scopes: ${missing.join(', ')}`);
  }

  // 2. Get ALL page tokens via /me/accounts (paginate to get all)
  let url = `${BASE_URL}/me/accounts?fields=id,name,access_token,category&limit=100&access_token=${USER_TOKEN}`;
  let allPages: any[] = [];
  
  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to get page accounts: ${res.status} ${body}`);
    }
    const data = await res.json() as any;
    const pages = data.data || [];
    allPages = allPages.concat(pages);
    url = data.paging?.next || '';
  }

  if (allPages.length === 0) {
    console.warn('[fb-client] ⚠️  No pages found. Page operations will use user token (limited).');
    return { pageId: defaultPageId, pageName: '(none)', scopes: initScopes, pageCount: 0 };
  }

  // 3. Cache ALL page tokens
  for (const page of allPages) {
    pageCache.set(page.id, {
      id: page.id,
      name: page.name,
      category: page.category,
      token: page.access_token,
    });
    console.log(`[fb-client] ✅ Cached token for "${page.name}" (${page.id})`);
  }

  // 4. Set default page
  if (DEFAULT_PAGE_ID && pageCache.has(DEFAULT_PAGE_ID)) {
    defaultPageId = DEFAULT_PAGE_ID;
  } else {
    defaultPageId = allPages[0].id;
    if (DEFAULT_PAGE_ID) {
      console.warn(`[fb-client] ⚠️  FACEBOOK_PAGE_ID ${DEFAULT_PAGE_ID} not found. Defaulting to "${allPages[0].name}" (${allPages[0].id})`);
    }
  }

  const defaultPage = pageCache.get(defaultPageId)!;
  console.log(`[fb-client] ✅ Default page: "${defaultPage.name}" (${defaultPage.id})`);
  console.log(`[fb-client] ✅ Total pages cached: ${pageCache.size}`);

  return { 
    pageId: defaultPage.id, 
    pageName: defaultPage.name, 
    scopes: initScopes, 
    pageCount: pageCache.size 
  };
}

async function getTokenScopes(): Promise<string[]> {
  try {
    const url = `${BASE_URL}/debug_token?input_token=${USER_TOKEN}&access_token=${USER_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as any;
    return data.data?.scopes || [];
  } catch {
    return [];
  }
}

// --- Multi-page token resolution ---

// Resolve a page name or ID → canonical page ID
// Accepts: exact page ID, partial/case-insensitive page name, or undefined (→ default)
function resolvePageId(nameOrId?: string): string {
  if (!nameOrId) return defaultPageId;

  // 1. Exact ID match
  if (pageCache.has(nameOrId)) return nameOrId;

  // 2. Case-insensitive name match (partial OK)
  const lower = nameOrId.toLowerCase();
  for (const [id, info] of pageCache) {
    if (info.name.toLowerCase().includes(lower)) return id;
  }

  // 3. Unknown — return as-is (may be a valid ID not yet cached)
  console.warn(`[fb-client] ⚠️  Could not resolve page "${nameOrId}" by name or ID. Using as-is.`);
  return nameOrId;
}

function getTokenForPage(nameOrId?: string): string {
  const id = resolvePageId(nameOrId);
  const info = pageCache.get(id);
  if (info) return info.token;
  // Fall back to system user token
  return USER_TOKEN;
}

function getPageId(nameOrId?: string): string {
  return resolvePageId(nameOrId);
}

function getAllPages(): PageInfo[] {
  return Array.from(pageCache.values());
}

// --- Page API (uses per-page token) ---

async function fbFetch(path: string, options: RequestInit = {}, pageId?: string): Promise<any> {
  const token = getTokenForPage(pageId);
  const separator = path.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${path}${separator}access_token=${token}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook API error ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

async function fbPost(path: string, body: Record<string, any>, pageId?: string): Promise<any> {
  return fbFetch(path, { method: 'POST', body: JSON.stringify(body) }, pageId);
}

async function fbDelete(path: string, pageId?: string): Promise<any> {
  return fbFetch(path, { method: 'DELETE' }, pageId);
}

// --- Marketing API (uses user token — not page-specific) ---

async function marketingFetch(path: string, options: RequestInit = {}): Promise<any> {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${path}${separator}access_token=${USER_TOKEN}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook Marketing API error ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

async function marketingPost(path: string, body: Record<string, any>): Promise<any> {
  return marketingFetch(path, { method: 'POST', body: JSON.stringify(body) });
}

async function marketingDelete(path: string): Promise<any> {
  return marketingFetch(path, { method: 'DELETE' });
}

// --- Getters ---

function getPageToken(pageId?: string): string {
  return getTokenForPage(pageId);
}

// Backward compat exports
const PAGE_ACCESS_TOKEN = ''; // Deprecated - use getPageToken()
const MARKETING_TOKEN = USER_TOKEN;

export {
  init,
  fbFetch, fbPost, fbDelete,
  marketingFetch, marketingPost, marketingDelete,
  getPageId, getPageToken, getTokenForPage, getTokenScopes,
  getAllPages, resolvePageId,
  PAGE_ACCESS_TOKEN, BASE_URL, MARKETING_TOKEN, USER_TOKEN, API_VERSION,
  PageInfo,
};
