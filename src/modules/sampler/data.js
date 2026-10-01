export function createData() {
  return { assetId: '', name: '', duration: 0, peaks: [] };
}
/** @param {Record<string,unknown>} saved */
export function restoreData(saved) {
  const d = /** @type {Record<string,unknown>} */ (
      saved.data && typeof saved.data === 'object' ? saved.data : {}
    ),
    base = createData();
  if (typeof d.assetId !== 'string' || !d.assetId || d.assetId.length > 128) return base;
  return {
    assetId: d.assetId,
    name: typeof d.name === 'string' ? d.name.slice(0, 240) : 'Sample',
    duration:
      typeof d.duration === 'number' && Number.isFinite(d.duration)
        ? Math.max(0, Math.min(120, d.duration))
        : 0,
    peaks: Array.isArray(d.peaks)
      ? d.peaks.slice(0, 96).map((n) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0))
      : [],
  };
}
