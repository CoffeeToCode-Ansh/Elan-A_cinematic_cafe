# Élan — The Jaipur Palace Cafe

**Industry:** Cafe / Luxury Hospitality
**Objective:** A cinematic cafe in Kensington, London, reimagining Jaipur's royal palace heritage through a European lens — "Gastro-Indian-European" cuisine, for guests who expect discretion and craft over volume.

**Note on names:** the brand story you shared referenced several real public figures (as chefs, architects, and guest testimonials). To keep the site honest, every name, quote, and collaborator on the live site is fictional — the menu, interiors, and philosophy from your document are otherwise represented faithfully.

## Technologies Used
- **HTML5** — semantic structure
- **CSS3** — custom properties, Flexbox/Grid, responsive breakpoints, component roundness (pill buttons, soft-radius cards/frames)
- **JavaScript (ES6+)** — nav, cursor, magnetic buttons, accordion, slider, video controls, form validation
- **GSAP + ScrollTrigger** — orchestrated hero load-in, scroll reveals, animated counters
- **Three.js + Cannon-es** — physics-driven hero: brass orbs under real gravity, colliding against each other and invisible boundary walls, click-to-spawn new orbs, camera parallax on cursor
- **Real cinemagraph video** — four royalty-free slow-motion loops (Mixkit) of coffee, wine, champagne, and food finishing, used as the "moving picture" elements requested

## Sections
1. **Hero** — physics scene layered over a faint ambient coffee-pour video loop, orchestrated GSAP text reveal
2. **About** — Jaipur-palace-meets-Kensington story, animated counters (years, origins sourced, guest rating)
3. **Offerings (Services)** — coffee, wine & champagne, patisserie, degustation, private dining, concierge
4. **Menu (new, a real flip-book)** — a cover page listing all 7 chapters as tiles (Starters, Mains, Pasta & Risotto, Salads, Desserts, The Amber Lounge, Chai Khana). Clicking a tile flips the book open to that chapter's own page (28 dishes total across the book, each with a real price and an "Add to reservation" button). Each chapter page has a "← Cover" button and Previous/Next chapter arrows to turn pages in sequence; arrow keys (← →) and Escape also work.
5. **Why Élan** — advantages, "Atithi Devo Bhava" philosophy, member benefits list
6. **Offerings (Signature Experiences)** — six cards, each a real video (hover to play) instead of a static photo: coffee pour, wine pour, pastry dusting, a menu-page flip, a candlelit table, and a waiter in motion
7. **Voices (Testimonials)** — auto-advancing slider with dot navigation (fictional guests)
8. **FAQ** — accordion
9. **Reserve (Contact)** — reservation form with live validation, opening hours table, location/contact details (from your document)
10. **Footer** — nav links, working Instagram link, functional newsletter signup, copyright

## Video Sources (all free, no attribution required — Mixkit Free License)
Used on the six Offerings cards (hover to play):
- Coffee: "Pouring Coffee into a Drip Filter on Wooden Table" — mixkit.co/free-stock-video/pouring-coffee-into-a-drip-filter-on-wooden-table-100257
- Wine: "A constant stream of red wine falling into an elegant wineglass" — mixkit.co/free-stock-video/a-constant-stream-of-red-wine-falling-into-a-elegant-52406
- Pastry: "Dusting Sugar on Fresh Donut" — mixkit.co/free-stock-video/dusting-sugar-on-fresh-donut-100268
- Degustation menu: "Book being leafed through, seen in detail" — mixkit.co/free-stock-video/book-being-leafed-through-seen-in-detail-3819
- Private dining: "Candlelit Autumn Table in Chiaroscuro" — mixkit.co/free-stock-video/candlelit-autumn-table-in-chiaroscuro-101565
- Concierge service: "Waiter carries a cup of coffee to customer" — mixkit.co/free-stock-video/waiter-carries-a-cup-of-coffee-to-customer-219

## Interactive Features (11, exceeds the 3 minimum)
1. Custom brass cursor + magnetic hover on all buttons (desktop)
2. Scroll-aware navbar + mobile slide-in menu
3. **A real flip-book menu**: click a chapter tile on the cover, the book flips to that page; Previous/Next chapter arrows and ← → / Esc keys turn pages
4. **"Add to reservation"** on every dish/drink — writes the item straight into the reservation form's message field, scrolls there, and focuses it
5. FAQ accordion
6. **Hover-to-play offering cards**: each Signature Experience card plays a real muted video the moment your cursor lands on it, and pauses/resets when you leave — on touch devices it plays automatically once scrolled into view instead
7. Auto-playing testimonial slider with dot navigation and manual controls
8. Reservation form with real-time validation (required fields, email format, party-size range)
9. Animated counters on scroll (years, origins, rating)
10. Back-to-top button (appears after scrolling, smooth-scrolls to hero)
11. Footer newsletter signup with email validation

Every button on the site now does something real — no `href="#"` dead links remain; all anchors resolve to an actual section, and every `<button>` has a working click handler.

Plus the **3D Physics interactions** (Advanced Track requirements, met in the hero):
- Real gravity + realistic collisions between orbs and invisible boundary walls (Cannon-es)
- **Click-to-spawn**: clicking anywhere in the hero drops a new physics orb from the cursor's x-position
- Continuous gentle-drift force so orbs stay in constant, believable motion
- Camera parallax that reacts to cursor movement
- Graceful degradation: object count drops from 20 → 9 and shadows disable under 760px; physics/motion pauses when `prefers-reduced-motion` is set; render opacity drops when the hero scrolls out of view

## GSAP Animations Used
- Orchestrated hero load-in timeline (eyebrow → title lines → subhead → CTAs → scroll cue)
- `ScrollTrigger`-based fade/slide-up reveals across every section
- Scroll-triggered animated number counters
- `quickTo`-driven custom cursor and magnetic-button easing

## How to Run
Open `index.html` directly in any modern browser, or serve the folder locally:
```
npx serve .
```
No build step required — GSAP, Three.js, and Cannon-es load via CDN/import map; all six offering-card videos stream directly from Mixkit's CDN.

## Notes on Design Choices
- Departed from the flat, zero-radius version you uploaded: buttons are now pill-shaped, cards and video frames use soft radii (16–28px), per the brief's "component roundness" requirement, while keeping the brass structural lines for the European-luxury identity.
- Body cursor is hidden in favor of the custom brass ring/dot cursor on desktop; falls back to the native cursor on touch devices.
- Address defaults to Lucknow, Uttar Pradesh — update freely to your venue's real location.

## Developer / Team
Built for the SuuSri AI Web Development Task Assignment — Restaurant/Café track (re-scoped to Cafe per brief) + 3D Dynamic Physics (Advanced Track) elements woven into the hero.
