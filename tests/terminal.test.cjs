const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const html = readFileSync(join(__dirname, '../Incursion_Terminal.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const snapshot = JSON.parse(readFileSync(join(__dirname, '../data/vendor-row-ids.json'), 'utf8'));

// A small DOM adapter exercises the inline application against the actual catalog
// without installing browser dependencies. Native layout/folding still needs a
// browser smoke test; this adapter only models the DOM APIs used by the script.
class Element {
  constructor(tag, attrs = {}, parent = null) {
    this.tag = tag;
    this.attrs = attrs;
    this.parentElement = parent;
    this.children = [];
    this.dataset = Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith('data-')).map(([key, value]) => [key.slice(5), value]));
    this.open = false;
    this.hidden = false;
    this.disabled = 'disabled' in attrs;
    this.style = {};
    this.textContent = '';
    this.value = '';
    this.listeners = {};
    if (parent) parent.children.push(this);
  }
  matches(selector) {
    return selector.split(',').some(part => {
      part = part.trim();
      return part.startsWith('.') ? (this.attrs.class || '').split(' ').includes(part.slice(1)) : this.tag === part;
    });
  }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector); }
  contains(element) { return element === this || this.children.some(child => child.contains(element)); }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  async fire(type, extra = {}) { return this.listeners[type]?.({ target: this, ...extra }); }
  appendChild(child) { child.parentElement = this; this.children.push(child); }
  remove() { this.parentElement.children = this.parentElement.children.filter(child => child !== this); }
  focus() { this.document.activeElement = this; }
  select() {}
}

function setup({ clipboard = true, legacyCopy = true } = {}) {
  const body = new Element('body');
  const elements = [body];
  const stack = [body];
  const markup = html.replace(/<(script|style)>[\s\S]*?<\/\1>/g, '');
  for (const token of markup.matchAll(/<\/?([\w-]+)\b([^>]*)>/g)) {
    const [full, tag, raw] = token;
    if (['html', 'head', 'body'].includes(tag)) continue;
    if (full.startsWith('</')) { stack.pop(); continue; }
    const attrs = {};
    for (const attr of raw.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attrs[attr[1]] = attr[2] || '';
    const element = new Element(tag, attrs, stack.at(-1));
    elements.push(element);
    if (!['meta', 'input', 'hr', 'br', 'link'].includes(tag)) stack.push(element);
  }
  const copied = [];
  const document = {
    body,
    activeElement: null,
    getElementById: id => elements.find(element => element.attrs.id === id),
    createElement: tag => { const element = new Element(tag); element.document = document; return element; },
    execCommand: command => {
      assert.equal(command, 'copy');
      copied.push(body.children.at(-1).value);
      return legacyCopy;
    }
  };
  for (const element of elements) element.document = document;
  const navigator = clipboard ? { clipboard: { writeText: async text => copied.push(text) } } : {};
  const context = vm.createContext({ document, navigator, setTimeout: () => 0, clearTimeout: () => {} });
  vm.runInContext(script, context);
  return {
    document, copied, context,
    list: document.getElementById('list'),
    search: async value => { document.getElementById('item-search').value = value; await document.getElementById('item-search').fire('input'); },
    groups: document.getElementById('list').querySelectorAll('details'),
    rows: document.getElementById('list').querySelectorAll('.row')
  };
}

const rowIDs = [...html.matchAll(/class="row"[^>]*data-item="([^"]+)"/g)].map(match => match[1]);
test('contains every exported row ID and explicitly retains unmatched legacy IDs', () => {
  const { rows } = setup();
  const ids = rows.map(row => row.dataset.item);
  assert.equal(snapshot.source.table, 'DT_Vendor_Old');
  assert.equal(snapshot.source.gameVersion, null);
  assert.equal(snapshot.source.rowCount, 825);
  assert.equal(snapshot.itemIds.length, 825);
  assert.equal(new Set(snapshot.itemIds).size, 825);
  assert.equal(rows.length, 841);
  assert.deepEqual(new Set(ids), new Set([...snapshot.itemIds, ...snapshot.legacyIds]));
  for (const row of rows) {
    assert.match(row.dataset.item, /^[a-zA-Z0-9_-]+$/);
    assert.deepEqual(row.querySelectorAll('.qbtn').map(button => button.dataset.qty), ['1', '10', '100', '1000']);
    assert.ok(row.querySelectorAll('.qbtn').every(button => button.dataset.item === row.dataset.item));
    assert.equal(row.querySelectorAll('.item-copy').length, 1);
    const legacy = snapshot.legacyIds.includes(row.dataset.item);
    assert.equal(row.dataset.source, legacy ? 'legacy' : 'vendor-export');
    assert.equal(row.querySelectorAll('.legacy-tag').length, legacy ? 1 : 0);
  }
  assert.equal(rows.filter(row => row.dataset.source === 'legacy').length, 7);
  for (const [id, count] of Object.entries(snapshot.originalSharedEntryCounts)) {
    assert.equal(ids.filter(value => value === id).length, count);
  }
  assert.equal(ids.filter(value => value === 'Daniel_Defense_M-LOK_Vertical_Foregrip').length, 1);
});

test('starts with all 21 categories and 38 weapon groups collapsed', () => {
  const { list, groups, document } = setup();
  assert.equal(list.querySelectorAll('.category').length, 21);
  assert.equal(list.querySelectorAll('.weapon-group').length, 38);
  assert.ok(groups.every(group => !group.open && !group.hidden));
  assert.equal(document.getElementById('item-search').disabled, false);
});

test('finds items inside closed groups, combines words and normalizes separators', async () => {
  const app = setup();
  await app.search('AK_12 545x39 muzzle');
  assert.deepEqual(app.rows.filter(row => !row.hidden).map(row => row.dataset.item), ['AK-12_545x39_Muzzle']);
  assert.ok(app.groups.filter(group => !group.hidden).every(group => group.open));
  assert.equal(app.groups.filter(group => !group.hidden).length, 2);
  await app.search('fn five seven');
  assert.equal(app.rows.filter(row => !row.hidden).length, 8);
  await app.search('cUrReNcIeS');
  assert.equal(app.rows.filter(row => !row.hidden).length, 2);
});

test('reports no results and restores the previous open state when cleared', async () => {
  const app = setup();
  app.groups[1].open = true;
  app.groups[2].open = true;
  const before = app.groups.map(group => group.open);
  await app.search('no-such-item-123456');
  assert.ok(app.rows.every(row => row.hidden));
  assert.ok(app.groups.every(group => group.hidden));
  assert.equal(app.document.getElementById('empty-state').hidden, false);
  assert.match(app.document.getElementById('search-status').textContent, /^0 of 841/);
  await app.search('cash');
  await app.document.getElementById('clear-search').fire('click');
  assert.deepEqual(app.groups.map(group => group.open), before);
  assert.ok(app.rows.every(row => !row.hidden));
  assert.equal(app.document.activeElement, app.document.getElementById('item-search'));
});

test('expand/collapse controls and Escape work together with search', async () => {
  const app = setup();
  await app.document.getElementById('expand-all').fire('click');
  assert.ok(app.groups.every(group => group.open));
  await app.document.getElementById('collapse-all').fire('click');
  assert.ok(app.groups.every(group => !group.open));
  await app.search('cash');
  await app.document.getElementById('collapse-all').fire('click');
  assert.ok(app.groups.every(group => !group.open));
  let prevented = false;
  await app.document.getElementById('item-search').fire('keydown', { key: 'Escape', preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.ok(app.rows.every(row => !row.hidden));
  assert.ok(app.groups.every(group => !group.open));
});

test('copies the exact item ID and quantity via item-name and quantity buttons', async () => {
  const app = setup();
  const row = app.rows.find(row => row.dataset.item === 'AUG_A3');
  await app.list.fire('click', { target: row.querySelectorAll('.item-copy')[0] });
  await app.list.fire('click', { target: row.querySelectorAll('.qbtn')[3] });
  assert.deepEqual(app.copied, ['AddItem AUG_A3 1', 'AddItem AUG_A3 1000']);
  assert.equal(app.document.getElementById('toast').textContent, 'Copied: AddItem AUG_A3 1000');
});

test('falls back when Clipboard API is unavailable and reports copy failure honestly', async () => {
  for (const success of [true, false]) {
    const app = setup({ clipboard: false, legacyCopy: success });
    const button = app.rows[0].querySelectorAll('.item-copy')[0];
    button.focus();
    await app.list.fire('click', { target: button });
    assert.deepEqual(app.copied, ['AddItem Cash 1']);
    assert.equal(app.document.activeElement, button);
    assert.equal(app.document.body.querySelectorAll('textarea').length, 0);
    assert.match(app.document.getElementById('toast').textContent, success ? /^Copied:/ : /^Could not copy\./);
  }
});

test('uses a relative root redirect and has no external runtime dependencies', () => {
  const index = readFileSync(join(__dirname, '../index.html'), 'utf8');
  assert.match(index, /content="0; url=Incursion_Terminal\.html"/);
  assert.match(index, /href="Incursion_Terminal\.html"/);
  assert.doesNotMatch(html, /<(?:script|link|img)[^>]+(?:src|href)="https?:/);
  assert.doesNotMatch(html, /\bfetch\(/);
});

test('uses exact corrected IDs while keeping previous spellings searchable', async () => {
  const app = setup();
  for (const [oldID, id] of Object.entries(snapshot.corrections)) {
    assert.ok(!app.rows.some(row => row.dataset.item === oldID), oldID);
    await app.search(oldID);
    const row = app.rows.find(row => row.dataset.item === id && !row.hidden);
    assert.ok(row, `${oldID} should find ${id}`);
    await app.list.fire('click', { target: row.querySelectorAll('.qbtn')[2] });
    assert.equal(app.copied.at(-1), `AddItem ${id} 100`);
  }
  await app.search('surefire mini scout flashlight');
  assert.deepEqual(app.rows.filter(row => !row.hidden).map(row => row.dataset.item), ['SureFire_Mini_Scout_Flashight']);
});

test('keeps headings and recording-backpack warnings out of copied commands', async () => {
  const app = setup();
  assert.ok(!app.rows.some(row => row.dataset.item === 'Monstera Weapon Parts'));
  const monstera = app.groups.find(group => group.dataset.label === 'Monstera Weapon Parts');
  assert.equal(monstera.querySelectorAll('.row').length, 2);
  const backpack = app.rows.find(row => row.dataset.item === 'Recording_Backpack');
  assert.equal(backpack.querySelectorAll('.row-note').length, 1);
  await app.list.fire('click', { target: backpack.querySelectorAll('.item-copy')[0] });
  assert.equal(app.copied.at(-1), 'AddItem Recording_Backpack 1');
  assert.doesNotMatch(app.copied.at(-1), /WARNING|spawned/);
});

test('displayed group counts match their actual nested rows', () => {
  const app = setup();
  const summaries = [...html.matchAll(/<details class="[^"]+" data-label="([^"]+)">\s*<summary>.*?<span class="secCount">(\d+) items<\/span>/g)];
  assert.equal(summaries.length, app.groups.length);
  for (const [, label, count] of summaries) {
    const group = app.groups.find(group => group.dataset.label === label);
    assert.ok(group, label);
    assert.equal(group.querySelectorAll('.row').length, Number(count), label);
  }
});

test('plain-text catalog matches terminal IDs and build commands use reconciled IDs', () => {
  const plain = readFileSync(join(__dirname, '../Item_List.htm'), 'utf8');
  const ids = plain.split(/\r?\n/).filter(line => /^[a-zA-Z0-9_-]+$/.test(line));
  assert.deepEqual(ids, rowIDs);
  assert.match(plain, /Recording_Backpack\n  WARNING/);
  const builds = readFileSync(join(__dirname, '../Weapon builds by Firestar.htm'), 'utf8');
  const commands = [...builds.matchAll(/\badditem\s+(\S+)\s+(\d+)/gi)];
  assert.ok(commands.length > 0);
  const allowed = new Set([...snapshot.itemIds, ...snapshot.legacyIds]);
  for (const [, id] of commands) assert.ok(allowed.has(id), id);
  for (const oldID of Object.keys(snapshot.corrections)) {
    assert.ok(!commands.some(command => command[1] === oldID), oldID);
  }
});
