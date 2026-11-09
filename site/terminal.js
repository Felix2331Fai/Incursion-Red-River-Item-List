'use strict';

const list = document.getElementById('list');
const search = document.getElementById('item-search');
const status = document.getElementById('search-status');
const emptyState = document.getElementById('empty-state');
const toast = document.getElementById('toast');
const groups = Array.from(list.querySelectorAll('details'));
const categories = Array.from(list.querySelectorAll('.category'));
const rows = Array.from(list.querySelectorAll('.row'));
let savedOpenState = null;
let toastTimer;

// Treat underscores and hyphens like spaces, so "ak 12" finds "AK-12".
function normalize(value) {
  return value.normalize('NFKC').toLowerCase().replace(/[_\s-]+/g, ' ').trim();
}

const searchIndex = new Map(rows.map(row => {
  const labels = [];
  for (let parent = row.parentElement; parent && parent !== list; parent = parent.parentElement) {
    if (parent.dataset.label) labels.push(parent.dataset.label);
  }
  return [row, normalize([row.dataset.item, row.dataset.aliases || '', ...labels].join(' '))];
}));

function updateSearch() {
  const terms = normalize(search.value).split(' ').filter(Boolean);
  if (terms.length && savedOpenState === null) {
    savedOpenState = new Map(groups.map(group => [group, group.open]));
  }

  let count = 0;
  for (const row of rows) {
    row.hidden = !terms.every(term => searchIndex.get(row).includes(term));
    if (!row.hidden) count++;
  }
  // Children first: hide empty weapon groups and their parent categories.
  for (const group of [...groups].reverse()) {
    group.hidden = !Array.from(group.querySelectorAll('.row')).some(row => !row.hidden);
    if (terms.length) group.open = !group.hidden;
    else if (savedOpenState !== null) group.open = savedOpenState.get(group);
  }
  if (!terms.length) savedOpenState = null;
  emptyState.hidden = count !== 0;
  status.textContent = terms.length
    ? `${count} of ${rows.length} item entries match.`
    : `${rows.length} item entries in ${categories.length} sections. Expand a section to browse.`;
}

function setAllOpen(open) {
  for (const group of groups) {
    if (!group.hidden) group.open = open;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 2200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Keep local file use and browsers without Clipboard API support working.
    const field = document.createElement('textarea');
    const previousFocus = document.activeElement;
    field.value = text;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.focus();
    field.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      field.remove();
      if (previousFocus) previousFocus.focus();
    }
  }
}

list.addEventListener('click', async event => {
  const button = event.target.closest('.qbtn, .item-copy');
  if (!button || !list.contains(button)) return;
  const row = button.closest('.row');
  const command = `AddItem ${row.dataset.item} ${button.dataset.qty || '1'}`;
  const copied = await copyText(command);
  showToast(copied ? `Copied: ${command}` : `Could not copy. Command: ${command}`);
});

search.addEventListener('input', updateSearch);
search.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    search.value = '';
    updateSearch();
  }
});
document.getElementById('clear-search').addEventListener('click', () => {
  search.value = '';
  updateSearch();
  search.focus();
});
document.getElementById('expand-all').addEventListener('click', () => setAllOpen(true));
document.getElementById('collapse-all').addEventListener('click', () => setAllOpen(false));
for (const id of ['item-search', 'clear-search', 'expand-all', 'collapse-all']) {
  document.getElementById(id).disabled = false;
}
updateSearch();
