const MAX_CACHE_ENTRIES = 200;

const detailItemCache = new Map();
const detailItemListeners = new Map();
const cipDetailCache = new Map();

const makeFallbackKey = (item = {}) =>
  `${item?.processOrder || ""}__${item?.packageType || ""}__${item?.date || ""}`;

const buildCacheKey = (item = {}) => {
  if (!item || typeof item !== "object") return "";
  const id = item.id ?? item._id;
  if (id !== null && id !== undefined && String(id).trim() !== "") {
    return String(id);
  }
  const fallback = makeFallbackKey(item);
  return fallback.trim() ? fallback : "";
};

const pruneCacheIfNeeded = () => {
  if (detailItemCache.size <= MAX_CACHE_ENTRIES) return;
  const overflow = detailItemCache.size - MAX_CACHE_ENTRIES;
  let removed = 0;
  for (const key of detailItemCache.keys()) {
    detailItemCache.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
};

const notifyDetailItemListeners = (key, item) => {
  const normalized = String(key || "").trim();
  if (!normalized) return;
  const listeners = detailItemListeners.get(normalized);
  if (!listeners || listeners.size === 0) return;
  for (const listener of listeners) {
    try {
      listener(item);
    } catch (e) {
      // keep notifying other listeners
    }
  }
};

export const putCiltDetailItemInCache = (item, keyOverride) => {
  const key = String(keyOverride || buildCacheKey(item) || "");
  if (!key) return "";
  detailItemCache.set(key, item);
  pruneCacheIfNeeded();
  notifyDetailItemListeners(key, item);
  return key;
};

export const getCiltDetailItemFromCache = (key) => {
  const normalized = String(key || "").trim();
  if (!normalized) return null;
  return detailItemCache.get(normalized) || null;
};

export const resolveCiltDetailItem = (params = {}) => {
  const routeItem = params?.item;
  const cacheKey = params?.detailCacheKey;
  const cached = getCiltDetailItemFromCache(cacheKey);
  return cached || routeItem || {};
};

export const subscribeCiltDetailItem = (key, listener) => {
  const normalized = String(key || "").trim();
  if (!normalized || typeof listener !== "function") return () => {};
  const current = detailItemListeners.get(normalized) || new Set();
  current.add(listener);
  detailItemListeners.set(normalized, current);
  return () => {
    const listeners = detailItemListeners.get(normalized);
    if (!listeners) return;
    listeners.delete(listener);
    if (listeners.size === 0) {
      detailItemListeners.delete(normalized);
    }
  };
};

const buildCipKey = (id) => {
  const normalized = String(id ?? "").trim();
  return normalized ? normalized : "";
};

export const putCipDetailInCache = (data, idOverride) => {
  const fallbackId = data?.id ?? data?.cipReportId ?? data?.cip_id;
  const key = buildCipKey(idOverride ?? fallbackId);
  if (!key) return "";
  cipDetailCache.set(key, data || null);
  if (cipDetailCache.size > MAX_CACHE_ENTRIES) {
    const overflow = cipDetailCache.size - MAX_CACHE_ENTRIES;
    let removed = 0;
    for (const oldKey of cipDetailCache.keys()) {
      cipDetailCache.delete(oldKey);
      removed += 1;
      if (removed >= overflow) break;
    }
  }
  return key;
};

export const getCipDetailFromCache = (id) => {
  const key = buildCipKey(id);
  if (!key) return null;
  return cipDetailCache.get(key) || null;
};
