# CLAUDE.md

Flashcards study tool: users create question/answer cards in decks, flip them in review mode, and mark each as Known or Still learning.

## Hard constraints

- Plain HTML, CSS and JavaScript only. No frameworks, libraries, npm, bundlers or build step.
- No server or database. All data lives in the browser's `localStorage`.
- Hosted on GitHub Pages as static files from the repo root. Keep all asset paths **relative** (`styles.css`, not `/styles.css`) so the site works under `https://<user>.github.io/<repo>/`.
- Must also work when `index.html` is opened directly from disk (`file://`).

## Files

- `index.html`: page shell, the edit-card `<dialog>`, and the toast element. Views are rendered into `<main id="app">`.
- `styles.css`: all styling. Colors are CSS variables on `:root`, redefined in `@media (prefers-color-scheme: dark)`. Use the tokens, never hard-coded colors.
- `app.js`: all logic, organised in sections: Storage → Helpers → Views → Card edit dialog → Import/export → Routing.

## Architecture

- **Rendering:** each view function (`renderHome`, `renderDeck`, `renderReview`) rebuilds the whole view through `render(...)` using the `el(tag, props, ...children)` helper. Re-render after changing state; there is no diffing.
- **Routing:** hash-based, handled in `route()`:
  - `#/`: deck list
  - `#/deck/<id>`: a deck's cards, the add form, and the edit/delete buttons
  - `#/review/<id>`: review cards that are Still learning
  - `#/review/<id>/all`: review every card
- **Keyboard:** only the review view sets `keyHandler` (`Space`/`Enter` flip, `1` = Still learning, `2` = Known). `render()` resets it. The global listener ignores keys while typing in fields or while the dialog is open.

## Data model

Stored under the `localStorage` key `flashcards.v1` (the key stays the same even though the schema is now version 2):

```js
{ version: 2, decks: [{ id, name, createdAt, cards: [{ id, question, answer, status: 'known' | 'learning' }] }] }
```

- Always write through `save()`. It catches storage errors and shows a toast.
- `normalizeData()` checks and cleans **both** saved data and imported JSON. It also converts v1 cards (`front`/`back`, `box`/`due`). If you change the schema, bump `version` and add the conversion there so existing users' data keeps loading.
- Imported decks get fresh ids so they never collide with existing ones.

## Conventions

- Put user text into the page only as text (`text:` prop or string children in `el`), never via `innerHTML`.
- Keep the style: 2-space indent, single quotes, semicolons, `const`/arrow functions, short section comments.
- Keep the layout usable at phone width, and keep keyboard and ARIA support when changing interactions.
- Update `README.md` when features change.

## Testing

There are no automated tests, and Node is not installed on this machine. Check changes by opening `index.html` in a browser and walking through: add card → review (flip with click and with Space) → mark Known / Still learning → edit and delete a card → reload the page to confirm it persists.
