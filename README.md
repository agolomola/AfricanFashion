# 🌍 AfricanFashion

> **Wear the Heartbeat of Africa** — a fully functional single-page e-commerce web app celebrating authentic African fashion.

![AfricanFashion banner](https://img.shields.io/badge/AfricanFashion-v1.0-E85D04?style=for-the-badge&logo=data:image/svg+xml;base64,)

---

## ✨ Features

- **Hero section** with animated tagline, statistics bar, and smooth-scroll CTA
- **12 products** across four authentic categories: Ankara, Kente, Dashiki, Accessories
- **Live category filter** — instantly filter the product grid by category
- **Shopping cart drawer** — slide-in cart with:
  - Add / increase / decrease / remove items
  - Real-time item count badge with bounce animation
  - Subtotal + automatic free-shipping threshold ($100)
  - Checkout confirmation toast
- **About section** — story of the brand with artisan values grid
- **Newsletter sign-up** with email validation feedback
- **Responsive design** — fully mobile-friendly (hamburger nav on small screens)
- **Toast notifications** for add-to-cart and other actions
- **Accessible** — ARIA roles, labels, live regions and keyboard (Escape) support
- **Zero dependencies** — pure HTML, CSS and vanilla JavaScript

---

## 🗂️ Project Structure

```
AfricanFashion/
├── index.html   # Single-page application markup
├── styles.css   # All styles (CSS Grid, Flexbox, custom properties)
├── main.js      # Product data, rendering, cart logic, event handlers
├── README.md
└── LICENSE
```

---

## 🚀 How to Run

No build step required — just open the file in any modern browser:

```bash
# Option 1 – double-click or drag-and-drop
open index.html

# Option 2 – quick local server with Python
python3 -m http.server 8080
# then visit http://localhost:8080

# Option 3 – quick local server with Node.js (npx)
npx serve .
```

---

## 🎨 Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Markup     | Semantic HTML5 with ARIA accessibility      |
| Styling    | Vanilla CSS3 (Grid, Flexbox, custom props)  |
| Logic      | Vanilla JavaScript ES6+ (no frameworks)     |
| Images     | CSS gradient + emoji (no external assets)   |
| Fonts      | System font stack (no external CDN)         |

---

## 🖌️ Colour Palette

| Name         | Hex       | Usage                        |
|--------------|-----------|------------------------------|
| Deep Orange  | `#E85D04` | Primary CTA, accents         |
| Gold         | `#F48C06` | Hover states, gradients      |
| Dark Brown   | `#370617` | Navigation, headings, footer |
| Cream        | `#FFBA08` | Highlights, stat numbers     |
| Forest Green | `#006400` | Dashiki cards, success state |

---

## 📦 Product Categories

- **Ankara** – vibrant wax-print garments (wrap dress, peplum top, midi skirt)
- **Kente** – royal hand-woven Ghanaian cloth (ceremonial robe, kufi cap, scarf)
- **Dashiki** – embroidered West African tunics (tunic, Agbada set, kaftan)
- **Accessories** – handcrafted jewellery & bags (beaded necklace, leather bag, bracelet)

---

## 📄 License

Distributed under the terms of the [LICENSE](LICENSE) file in this repository.
African Fashion
