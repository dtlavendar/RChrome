// call once during init()
async cleanupOldSummaries(days = 7, maxEntries = 100) {
  if (!chrome.storage) return;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  chrome.storage.local.get(null, all => {
    // Filter keys that belong to us
    const pairs = Object.entries(all)
      .filter(([k, v]) => k.startsWith('summary_'));

    // 1) age-based delete
    pairs
      .filter(([_, v]) => v.ts && v.ts < cutoff)
      .forEach(([k]) => chrome.storage.local.remove(k));

    // 2) size-based prune (keep newest N)
    if (pairs.length > maxEntries) {
      pairs
        .sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0))         // newest first
        .slice(maxEntries)                                        // overflow
        .forEach(([k]) => chrome.storage.local.remove(k));
    }
  });
}

// ... in init():
await this.cleanupOldSummaries(); 