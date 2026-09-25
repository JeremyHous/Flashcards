'use strict';

/* ---------- Storage ---------- */

const STORAGE_KEY = 'flashcards.v1';
const KNOWN = 'known';
const LEARNING = 'learning';

let state = load();

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function newCard(question, answer) {
  return { id: uid(), question, answer, status: LEARNING };
}

function newDeck(name, cards = []) {
  return { id: uid(), name, createdAt: Date.now(), cards };
}

function sampleData() {
  return {
    version: 2,
    decks: [
      newDeck('Sample: World capitals', [
        newCard('What is the capital of France?', 'Paris'),
        newCard('What is the capital of Japan?', 'Tokyo'),
        newCard('What is the capital of Lithuania?', 'Vilnius'),
        newCard('What is the capital of Canada?', 'Ottawa'),
        newCard('What is the capital of Australia?', 'Canberra'),
      ]),
    ],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = normalizeData(JSON.parse(raw));
      if (data) return data;
    }
  } catch (err) {
    console.warn('Could not load saved data:', err);
  }
  return sampleData();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Could not save data:', err);
    toast('⚠️ Could not save — browser storage may be full or disabled.');
  }
}

// Validates and cleans up data (used for both saved data and imports).
// Also upgrades v1 cards, which used front/back instead of question/answer.
function normalizeData(data) {
  if (!data || !Array.isArray(data.decks)) return null;
  const decks = data.decks
    .filter((d) => d && typeof d.name === 'string')
    .map((d) => ({
      id: typeof d.id === 'string' ? d.id : uid(),
      name: d.name.trim() || 'Untitled deck',
      createdAt: Number(d.createdAt) || Date.now(),
      cards: (Array.isArray(d.cards) ? d.cards : [])
        .map((c) => c && {
          id: typeof c.id === 'string' ? c.id : uid(),
          question: typeof c.question === 'string' ? c.question : c.front,
          answer: typeof c.answer === 'string' ? c.answer : c.back,
          status: c.status === KNOWN ? KNOWN : LEARNING,
        })
        .filter((c) => c && typeof c.question === 'string' && typeof c.answer === 'string'),
    }));
  return { version: 2, decks };
}

/* ---------- Helpers ---------- */

const app = document.getElementById('app');
const cardDialog = document.getElementById('card-dialog');
const cardForm = document.getElementById('card-form');
const toastEl = document.getElementById('toast');

// Keyboard handler for the current view (only the review view uses one).
let keyHandler = null;

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

let toastTimer;
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

function findDeck(id) {
  return state.decks.find((d) => d.id === id);
}

function countStatus(deck) {
  const known = deck.cards.filter((c) => c.status === KNOWN).length;
  return { known, learning: deck.cards.length - known };
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function statusBadge(status) {
  return status === KNOWN
    ? el('span', { class: 'badge known', text: '✓ Known' })
    : el('span', { class: 'badge learning', text: 'Still learning' });
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function render(...nodes) {
  keyHandler = null;
  app.replaceChildren(...nodes);
}

/* ---------- Views ---------- */

function renderHome() {
  document.title = 'Flashcards';

  const nameInput = el('input', {
    type: 'text', name: 'name', placeholder: 'New deck name', maxlength: '100',
    required: true, 'aria-label': 'New deck name',
  });
  const createForm = el('form', {
    class: 'row panel',
    onsubmit: (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      if (!name) return;
      const deck = newDeck(name);
      state.decks.push(deck);
      save();
      location.hash = `#/deck/${deck.id}`;
    },
  }, nameInput, el('button', { type: 'submit', class: 'primary', text: 'Create deck' }));

  const list = state.decks.length
    ? el('ul', { class: 'deck-list' }, state.decks.map((deck) => {
        const { known, learning } = countStatus(deck);
        return el('li', { class: 'panel deck-item' },
          el('div', { class: 'info' },
            el('a', { class: 'name', href: `#/deck/${deck.id}`, text: deck.name }),
            el('div', { class: 'muted' },
              plural(deck.cards.length, 'card'),
              deck.cards.length > 0 && ` · ${known} known · ${learning} still learning`,
            ),
          ),
          el('a', { class: 'button', href: `#/deck/${deck.id}`, text: 'Open' }),
          el('a', {
            class: 'button primary',
            href: `#/review/${deck.id}${learning ? '' : '/all'}`,
            text: 'Review',
            'aria-disabled': deck.cards.length ? null : 'true',
            onclick: (e) => { if (!deck.cards.length) { e.preventDefault(); toast('Add some cards first.'); } },
          }),
        );
      }))
    : el('p', { class: 'empty panel', text: 'No decks yet — create your first one above.' });

  const fileInput = el('input', {
    type: 'file', accept: 'application/json,.json', class: 'visually-hidden',
    onchange: (e) => importFile(e.target.files[0]),
  });

  render(
    el('h1', { text: 'Your decks' }),
    createForm,
    list,
    el('div', { class: 'row' },
      el('button', { type: 'button', onclick: exportData, text: '⬇️ Export' }),
      el('button', { type: 'button', onclick: () => fileInput.click(), text: '⬆️ Import' }),
      fileInput,
    ),
  );
}

function renderDeck(deck) {
  document.title = `${deck.name} · Flashcards`;
  const { known, learning } = countStatus(deck);

  const question = el('textarea', { name: 'question', rows: '2', required: true });
  const answer = el('textarea', { name: 'answer', rows: '2', required: true });
  const addForm = el('form', {
    class: 'panel',
    onsubmit: (e) => {
      e.preventDefault();
      const q = question.value.trim();
      const a = answer.value.trim();
      if (!q || !a) return;
      deck.cards.push(newCard(q, a));
      save();
      renderDeck(deck);
      toast('Card added');
      app.querySelector('textarea[name="question"]').focus();
    },
  },
    el('label', {}, 'Question', question),
    el('label', {}, 'Answer', answer),
    el('button', { type: 'submit', class: 'primary', text: 'Add card' }),
  );

  const cards = deck.cards.length
    ? el('ul', { class: 'card-list' }, deck.cards.map((card) =>
        el('li', { class: 'panel card-item' },
          el('div', { class: 'side' }, el('small', { text: 'Question' }), card.question),
          el('div', { class: 'side' }, el('small', { text: 'Answer' }), card.answer),
          el('div', { class: 'tools' },
            statusBadge(card.status),
            el('div', { class: 'row' },
              el('button', { type: 'button', class: 'small', text: 'Edit', onclick: () => openCardDialog(deck, card) }),
              el('button', {
                type: 'button', class: 'small danger', text: 'Delete',
                onclick: () => {
                  if (!confirm('Delete this card?')) return;
                  deck.cards = deck.cards.filter((c) => c.id !== card.id);
                  save();
                  renderDeck(deck);
                  toast('Card deleted');
                },
              }),
            ),
          ),
        ),
      ))
    : el('p', { class: 'empty panel', text: 'This deck has no cards yet. Add your first one above.' });

  render(
    el('a', { class: 'back', href: '#/', text: '← All decks' }),
    el('h1', { text: deck.name }),
    el('div', { class: 'row' },
      el('span', { class: 'muted' },
        plural(deck.cards.length, 'card'), ` · ${known} known · ${learning} still learning`),
      el('span', { class: 'spacer' }),
      el('button', {
        type: 'button', class: 'small', text: 'Rename',
        onclick: () => {
          const name = prompt('Rename deck', deck.name);
          if (name && name.trim()) {
            deck.name = name.trim().slice(0, 100);
            save();
            renderDeck(deck);
          }
        },
      }),
      el('button', {
        type: 'button', class: 'small danger', text: 'Delete deck',
        onclick: () => {
          if (!confirm(`Delete "${deck.name}" and all its cards?`)) return;
          state.decks = state.decks.filter((d) => d.id !== deck.id);
          save();
          location.hash = '#/';
        },
      }),
    ),
    el('div', { class: 'row', style: 'margin: 16px 0' },
      el('button', {
        type: 'button', class: 'primary', disabled: learning === 0,
        text: `Review still learning (${learning})`,
        onclick: () => { location.hash = `#/review/${deck.id}`; },
      }),
      el('button', {
        type: 'button', disabled: deck.cards.length === 0, text: `Review all (${deck.cards.length})`,
        onclick: () => { location.hash = `#/review/${deck.id}/all`; },
      }),
    ),
    el('h2', { text: 'Add a card' }),
    addForm,
    el('h2', { text: 'Cards' }),
    cards,
  );
}

function renderReview(deck, all) {
  document.title = `Review ${deck.name} · Flashcards`;
  const queue = shuffle(deck.cards.filter((c) => all || c.status === LEARNING));
  const total = queue.length;
  let index = 0;
  let flipped = false;
  let markedKnown = 0;

  if (total === 0) {
    render(
      el('a', { class: 'back', href: `#/deck/${deck.id}`, text: `← ${deck.name}` }),
      el('div', { class: 'panel done' },
        el('div', { class: 'big', text: '🎉' }),
        el('h2', { text: deck.cards.length ? 'You know every card!' : 'This deck is empty' }),
        el('p', { class: 'muted', text: deck.cards.length ? 'Review them all again to keep them fresh.' : 'Add some cards to start reviewing.' }),
        el('div', { class: 'row', style: 'justify-content:center' },
          deck.cards.length > 0 && el('a', { class: 'button primary', href: `#/review/${deck.id}/all`, text: 'Review all' }),
          el('a', { class: 'button', href: `#/deck/${deck.id}`, text: 'Back to deck' }),
        ),
      ),
    );
    return;
  }

  function mark(status) {
    queue[index].status = status;
    if (status === KNOWN) markedKnown++;
    save();
    index++;
    flipped = false;
    show();
  }

  function flip() {
    flipped = !flipped;
    show();
  }

  function show() {
    const card = queue[index];
    if (!card) {
      const stillLearning = total - markedKnown;
      render(
        el('div', { class: 'panel done' },
          el('div', { class: 'big', text: '✅' }),
          el('h2', { text: 'Review complete' }),
          el('p', { class: 'muted', text: `${markedKnown} known · ${stillLearning} still learning` }),
          el('div', { class: 'row', style: 'justify-content:center' },
            countStatus(deck).learning > 0 &&
              el('a', {
                class: 'button primary', href: `#/review/${deck.id}`, text: 'Review still learning',
                // The hash may already point here, in which case hashchange won't fire.
                onclick: (e) => {
                  e.preventDefault();
                  if (location.hash === `#/review/${deck.id}`) renderReview(deck, false);
                  else location.hash = `#/review/${deck.id}`;
                },
              }),
            el('a', { class: 'button', href: `#/deck/${deck.id}`, text: 'Back to deck' }),
          ),
        ),
      );
      return;
    }

    const actions = flipped
      ? [
          el('button', { type: 'button', class: 'learning', onclick: () => mark(LEARNING) }, 'Still learning ', el('kbd', { text: '1' })),
          el('button', { type: 'button', class: 'success', onclick: () => mark(KNOWN) }, 'Known ', el('kbd', { text: '2' })),
        ]
      : [el('button', { type: 'button', class: 'primary', onclick: flip }, 'Show answer ', el('kbd', { text: 'Space' }))];

    render(
      el('div', { class: 'study-top' },
        el('a', { class: 'back', style: 'margin:0', href: `#/deck/${deck.id}`, text: `← ${deck.name}` }),
        el('span', { class: 'muted', text: `Card ${index + 1} of ${total}` }),
      ),
      el('div', {
        class: 'progress', role: 'progressbar', 'aria-label': 'Review progress',
        'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(index),
      }, el('div', { style: `width:${(index / total) * 100}%` })),
      el('button', {
        type: 'button',
        class: `flashcard${flipped ? ' flipped' : ''}`,
        'aria-label': flipped ? `Answer: ${card.answer}. Click to flip back.` : `Question: ${card.question}. Click to show answer.`,
        onclick: flip,
      },
        el('span', { class: 'inner' },
          el('span', { class: 'face front', 'aria-hidden': 'true' }, el('small', { text: 'Question' }), card.question),
          el('span', { class: 'face back', 'aria-hidden': 'true' }, el('small', { text: 'Answer' }), card.answer),
        ),
      ),
      el('div', { class: 'study-actions' }, actions),
      el('p', { class: 'hint', text: flipped ? 'Press 1 for Still learning or 2 for Known.' : 'Click the card or press Space to flip.' }),
    );

    keyHandler = (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      else if (flipped && e.key === '1') mark(LEARNING);
      else if (flipped && e.key === '2') mark(KNOWN);
    };
  }

  show();
}

/* ---------- Card edit dialog ---------- */

let editing = null;

function openCardDialog(deck, card) {
  editing = { deck, card };
  cardForm.question.value = card.question;
  cardForm.answer.value = card.answer;
  cardDialog.showModal();
}

cardForm.addEventListener('submit', (e) => {
  if (e.submitter && e.submitter.value === 'save' && editing) {
    const q = cardForm.question.value.trim();
    const a = cardForm.answer.value.trim();
    if (!q || !a) { e.preventDefault(); return; }
    editing.card.question = q;
    editing.card.answer = a;
    save();
    renderDeck(editing.deck);
    toast('Card updated');
  }
  editing = null;
});

/* ---------- Import / export ---------- */

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `flashcards-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = normalizeData(JSON.parse(reader.result));
    } catch {
      data = null;
    }
    if (!data || !data.decks.length) {
      toast('That file does not contain any flashcard decks.');
      return;
    }
    if (!confirm(`Import ${plural(data.decks.length, 'deck')}? They will be added to your existing decks.`)) return;
    // Give imported decks and cards fresh ids so they never clash with existing ones.
    for (const deck of data.decks) {
      deck.id = uid();
      deck.cards.forEach((c) => { c.id = uid(); });
      state.decks.push(deck);
    }
    save();
    renderHome();
    toast(`Imported ${plural(data.decks.length, 'deck')}`);
  };
  reader.readAsText(file);
}

/* ---------- Routing ---------- */

function route() {
  const [view, id, mode] = location.hash.replace(/^#\/?/, '').split('/');
  const deck = id && findDeck(id);
  if (view === 'deck' && deck) renderDeck(deck);
  else if (view === 'review' && deck) renderReview(deck, mode === 'all');
  else renderHome();
  app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

document.addEventListener('keydown', (e) => {
  if (!keyHandler || cardDialog.open || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = e.target.tagName;
  // Let focused buttons and fields handle their own keys.
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (tag === 'BUTTON' && (e.key === ' ' || e.key === 'Enter'))) return;
  keyHandler(e);
});

// Keep multiple open tabs in sync.
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    state = load();
    route();
  }
});

window.addEventListener('hashchange', route);
save();
route();
