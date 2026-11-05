const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const vm = require('node:vm');

const html = readFileSync(join(__dirname, '../Incursion_Terminal.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

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
test('preserves all original item entries and quantities, including duplicates', () => {
  assert.equal(rowIDs.length, 637);
  assert.equal(createHash('sha256').update(JSON.stringify(rowIDs)).digest('hex'), '9ac53d2535fa4446a72e783f61f4b3c50e8ea684f2738d02171526fa868eea75');
  const { rows } = setup();
  for (const row of rows) {
    assert.deepEqual(row.querySelectorAll('.qbtn').map(button => button.dataset.qty), ['1', '10', '100', '1000']);
    assert.ok(row.querySelectorAll('.qbtn').every(button => button.dataset.item === row.dataset.item));
    assert.equal(row.querySelectorAll('.item-copy').length, 1);
  }
});

test('starts with all 19 categories and 32 weapon groups collapsed', () => {
  const { list, groups, document } = setup();
  assert.equal(list.querySelectorAll('.category').length, 19);
  assert.equal(list.querySelectorAll('.weapon-group').length, 32);
  assert.ok(groups.every(group => !group.open && !group.hidden));
  assert.equal(document.getElementById('item-search').disabled, false);
});

test('finds items inside closed groups, combines words and normalizes separators', async () => {
  const app = setup();
  await app.search('AK_12 muzzle');
  assert.deepEqual(app.rows.filter(row => !row.hidden).map(row => row.dataset.item), ['AK-12_545x39_Muzzle']);
  assert.ok(app.groups.filter(group => !group.hidden).every(group => group.open));
  assert.equal(app.groups.filter(group => !group.hidden).length, 2);
  await app.search('fn five seven');
  assert.equal(app.rows.filter(row => !row.hidden).length, 7);
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
  assert.match(app.document.getElementById('search-status').textContent, /^0 of 637/);
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
  const row = app.rows.find(row => row.dataset.item === 'AUG A3');
  await app.list.fire('click', { target: row.querySelectorAll('.item-copy')[0] });
  await app.list.fire('click', { target: row.querySelectorAll('.qbtn')[3] });
  assert.deepEqual(app.copied, ['AddItem AUG A3 1', 'AddItem AUG A3 1000']);
  assert.equal(app.document.getElementById('toast').textContent, 'Copied: AddItem AUG A3 1000');
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
