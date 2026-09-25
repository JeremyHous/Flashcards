# Flashcards

A small flashcard web app built with plain HTML, CSS and JavaScript. No framework, no build step, no server.

## Features

- Create, rename and delete decks
- Add a card with a question and an answer
- Edit or delete any card from the deck's card list
- Review mode: each card shows the question first; click it or press `Space` to flip to the answer
- Mark each card as **Known** (`2`) or **Still learning** (`1`); the status is shown in the card list
- "Review still learning" only shows cards you haven't mastered; "Review all" shows every card
- Export / import all decks as a JSON file
- Light and dark mode, works on mobile

## Data

Everything is saved in the browser's `localStorage` under the key `flashcards.v1`. Data stays on the device and browser you used; clearing site data deletes it. Use **Export** to make a backup.

## Run locally

Open `index.html` in a browser. No install needed.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select your branch (e.g. `master`) and the `/ (root)` folder, then save.
4. The site will be available at `https://<username>.github.io/<repo>/`.

## Files

| File         | Purpose                                   |
|--------------|-------------------------------------------|
| `index.html` | Page shell and the edit-card dialog       |
| `styles.css` | Styling, including dark mode              |
| `app.js`     | Data storage, views, routing, study logic |
