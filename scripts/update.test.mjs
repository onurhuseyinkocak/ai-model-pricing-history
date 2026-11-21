import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { changes, write } from './update.mjs';

const mk = (date, models) => ({ date, tasks: [{ key: 'chat' }], models });
const m = (id, input, extra = {}) => ({ model_id: id, name: null, input_per_mtok: input, output_per_mtok: 2, task_costs_usd: { chat: 0.01 }, ...extra });

test('change log: price change, added, removed; unchanged fields ignored', () => {
  const a = mk('2026-11-21', [m('x/a', 1), m('x/b', 1)]), b = mk('2026-11-22', [m('x/a', 1.5), m('x/c', 1)]);
  assert.deepEqual(changes(a, b), [['2026-11-22', 'x/a', 'input_per_mtok', 1, 1.5], ['2026-11-22', 'x/c', 'model', '', 'added'], ['2026-11-22', 'x/b', 'model', 'listed', 'removed']]);
});

test('write: valid JSON, CSV quoting, refuses tiny feeds', () => {
  const dir = mkdtempSync(tmpdir() + '/p-');
  const models = Array.from({ length: 120 }, (_, i) => m(`x/m${i}`, 1, { source_url: 'https://a,b' }));
  write(dir, mk('2026-11-21', models), null);
  assert.equal(JSON.parse(readFileSync(dir + '/latest.json', 'utf8')).models.length, 120);
  assert.match(readFileSync(dir + '/latest.csv', 'utf8'), /"https:\/\/a,b"/);
  assert.equal(readFileSync(dir + '/price-changes.csv', 'utf8'), 'date,model_id,field,old,new\n');
  assert.throws(() => write(dir, mk('2026-11-22', models.slice(0, 5)), null));
});
