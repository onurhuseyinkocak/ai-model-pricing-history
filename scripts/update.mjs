// Pulls the latest daily snapshot from vibecodingturkey.com/models and refreshes data/.
// Git history of data/latest.* is the full snapshot history; data/price-changes.csv is the append-only change log.
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';

export const SOURCE = 'https://vibecodingturkey.com/models/data/latest.json';
export const COLS = [
  'model_id', 'name', 'provider', 'mode', 'input_per_mtok', 'output_per_mtok', 'cache_read_per_mtok', 'cache_write_per_mtok',
  'cache_write_1h_per_mtok', 'max_input', 'max_output', 'tier_threshold', 'tier_input_per_mtok', 'tier_output_per_mtok',
  'tier_cache_read_per_mtok', 'batch_input_per_mtok', 'batch_output_per_mtok', 'flex_input_per_mtok', 'flex_output_per_mtok',
  'priority_input_per_mtok', 'priority_output_per_mtok', 'ultrafast_input_per_mtok', 'ultrafast_output_per_mtok',
  'supports_vision', 'supports_function_calling', 'supports_reasoning', 'supports_prompt_caching', 'supports_pdf_input',
  'deprecation_date', 'successor_model', 'source_url', 'page',
];
const TRACKED = COLS.filter((c) => !['model_id', 'name', 'provider', 'source_url', 'page'].includes(c));
const cell = (v) => (v === null || v === undefined ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const csv = (head, rows) => [head.join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n') + '\n';

// One row per changed field, plus added/removed models.
export function changes(prev, next) {
  const out = [], a = new Map(prev.models.map((m) => [m.model_id, m])), b = new Map(next.models.map((m) => [m.model_id, m]));
  for (const [id, m] of b) {
    const o = a.get(id);
    if (!o) { out.push([next.date, id, 'model', '', 'added']); continue; }
    for (const k of TRACKED) if ((o[k] ?? null) !== (m[k] ?? null)) out.push([next.date, id, k, o[k] ?? '', m[k] ?? '']);
  }
  for (const id of a.keys()) if (!b.has(id)) out.push([next.date, id, 'model', 'listed', 'removed']);
  return out;
}

export function write(dir, snap, prev) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snap.date) || !Array.isArray(snap.models) || snap.models.length < 100) throw new Error('suspicious snapshot');
  const log = `${dir}/price-changes.csv`;
  if (!existsSync(log)) writeFileSync(log, 'date,model_id,field,old,new\n');
  if (prev) appendFileSync(log, changes(prev, snap).map((r) => r.map(cell).join(',') + '\n').join(''));
  const models = [...snap.models].sort((x, y) => x.model_id.localeCompare(y.model_id));
  // One model per line keeps daily git diffs readable.
  const { models: _, ...meta } = snap;
  writeFileSync(`${dir}/latest.json`, JSON.stringify(meta, null, 1).replace(/\n}$/, ',\n "models": [\n') + models.map((m) => JSON.stringify(m)).join(',\n') + '\n ]\n}\n');
  writeFileSync(`${dir}/latest.csv`, csv(['date', ...COLS], models.map((m) => [snap.date, ...COLS.map((c) => m[c])])));
  const tasks = snap.tasks.map((t) => t.key);
  writeFileSync(`${dir}/task-costs.csv`, csv(['date', 'model_id', 'name', ...tasks.map((k) => `${k}_usd`)], models.filter((m) => m.input_per_mtok > 0 && m.output_per_mtok > 0).map((m) => [snap.date, m.model_id, m.name, ...tasks.map((k) => m.task_costs_usd[k])])));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = new URL('../data', import.meta.url).pathname;
  const res = await fetch(SOURCE, { headers: { 'user-agent': 'ai-model-pricing-history' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const snap = await res.json();
  const prev = existsSync(`${dir}/latest.json`) ? JSON.parse(readFileSync(`${dir}/latest.json`, 'utf8')) : null;
  if (prev && prev.date >= snap.date) { console.log(`no new snapshot (have ${prev.date})`); process.exit(0); }
  write(dir, snap, prev);
  console.log(`snapshot ${snap.date}: ${snap.models.length} models`);
}
