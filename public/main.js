gsap.registerPlugin(ScrollTrigger);

/* ============================================
   Custom brass cursor (desktop only)
   ============================================ */
const cursorDot = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');
const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

if (!isTouch && cursorDot && cursorRing) {
  const setDot = gsap.quickTo(cursorDot, 'x', { duration: 0.12, ease: 'power3.out' });
  const setDotY = gsap.quickTo(cursorDot, 'y', { duration: 0.12, ease: 'power3.out' });
  const setRing = gsap.quickTo(cursorRing, 'x', { duration: 0.35, ease: 'power3.out' });
  const setRingY = gsap.quickTo(cursorRing, 'y', { duration: 0.35, ease: 'power3.out' });

  window.addEventListener('pointermove', (e) => {
    setDot(e.clientX); setDotY(e.clientY);
    setRing(e.clientX); setRingY(e.clientY);
  });

  document.querySelectorAll('a, button, .card, .cine-card').forEach(el => {
    el.addEventListener('mouseenter', () => cursorRing.classList.add('hovering'));
    el.addEventListener('mouseleave', () => cursorRing.classList.remove('hovering'));
  });
}

/* ============================================
   Magnetic buttons (luxury micro-interaction)
   ============================================ */
if (!isTouch) {
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top - rect.height / 2;
      gsap.to(btn, { x: relX * 0.25, y: relY * 0.4, duration: 0.4, ease: 'power3.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

/* ============================================
   Nav behavior
   ============================================ */
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', open);
});

navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
  });
});

/* ============================================
   Scroll progress rail
   ============================================ */
const progressFill = document.getElementById('progressFill');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
  progressFill.style.width = scrolled + '%';
}, { passive: true });

/* ============================================
   Hero — orchestrated load-in
   ============================================ */
window.addEventListener('DOMContentLoaded', () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.set('.hero-title .line', { yPercent: 130 })
    .from('.eyebrow.reveal-word', { opacity: 0, y: 16, duration: 0.9 }, 0.1)
    .to('.hero-title .line', { yPercent: 0, duration: 1.3, stagger: 0.12 }, 0.35)
    .from('.hero-sub.reveal-fade', { opacity: 0, y: 16, duration: 1 }, 0.9)
    .from('.hero-actions.reveal-fade', { opacity: 0, y: 16, duration: 1 }, 1.05)
    .from('.hero-scroll', { opacity: 0, duration: 1 }, 1.3);
});

/* ============================================
   Scroll reveals
   ============================================ */
gsap.utils.toArray('.reveal-up').forEach((el) => {
  gsap.from(el, {
    opacity: 0,
    y: 34,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: el,
      start: 'top 88%',
      toggleActions: 'play none none reverse'
    }
  });
});

/* ============================================
   Animated counters
   ============================================ */
gsap.utils.toArray('.stat-num').forEach((el) => {
  const target = parseInt(el.dataset.count, 10);
  const decimalDivisor = el.dataset.decimal ? parseInt(el.dataset.decimal, 10) : null;
  ScrollTrigger.create({
    trigger: el,
    start: 'top 90%',
    once: true,
    onEnter: () => {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 1.6,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = decimalDivisor ? (obj.val / 10).toFixed(1) : Math.round(obj.val);
        }
      });
    }
  });
});

/* ============================================
   Menu flip-book (interactive feature — workable menu)
   ============================================ */
const menuBook = document.getElementById('menuBook');
const coverLeaf = document.getElementById('coverLeaf');
const categoryLeaves = Array.from(document.querySelectorAll('.category-leaf'));
const chapterOrder = ['starters', 'mains', 'pasta', 'salads', 'desserts', 'lounge', 'chai'];
let currentLeaf = coverLeaf;

function getLeaf(cat) {
  return cat === 'cover' ? coverLeaf : categoryLeaves.find(l => l.dataset.panel === cat);
}

function flipTo(target) {
  if (!target || target === currentLeaf) return;
  const outgoing = currentLeaf;

  gsap.timeline()
    .to(outgoing, {
      rotateY: -100, opacity: 0, duration: 0.5, ease: 'power2.in', transformOrigin: 'left center'
    })
    .set(outgoing, { rotateY: 0, zIndex: 1, pointerEvents: 'none' })
    .fromTo(target,
      { rotateY: 100, opacity: 0, transformOrigin: 'left center' },
      { rotateY: 0, opacity: 1, duration: 0.55, ease: 'power2.out', zIndex: 5, pointerEvents: 'auto' },
      '-=0.15'
    );

  currentLeaf = target;
  ScrollTrigger.refresh();
}

document.querySelectorAll('.cover-tile').forEach(tile => {
  tile.addEventListener('click', () => flipTo(getLeaf(tile.dataset.cat)));
});

document.querySelectorAll('.page-back-btn').forEach(btn => {
  btn.addEventListener('click', () => flipTo(coverLeaf));
});

document.querySelectorAll('.page-next').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    const idx = chapterOrder.indexOf(btn.closest('.category-leaf').dataset.panel);
    flipTo(getLeaf(chapterOrder[idx + 1]));
  });
});

document.querySelectorAll('.page-prev').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    const idx = chapterOrder.indexOf(btn.closest('.category-leaf').dataset.panel);
    flipTo(getLeaf(chapterOrder[idx - 1]));
  });
});

// Keyboard: arrow keys turn pages, Escape returns to cover
document.addEventListener('keydown', (e) => {
  if (currentLeaf === coverLeaf) return;
  const idx = chapterOrder.indexOf(currentLeaf.dataset.panel);
  if (e.key === 'Escape') flipTo(coverLeaf);
  else if (e.key === 'ArrowRight' && idx < chapterOrder.length - 1) flipTo(getLeaf(chapterOrder[idx + 1]));
  else if (e.key === 'ArrowLeft' && idx > 0) flipTo(getLeaf(chapterOrder[idx - 1]));
});

/* ============================================
   "Add to reservation" — sends a dish straight
   into the reservation form's message field
   ============================================ */
document.querySelectorAll('.menu-add').forEach(btn => {
  btn.addEventListener('click', () => {
    const dish = btn.dataset.dish;
    const messageField = document.getElementById('message');
    const existing = messageField.value.trim();
    const line = `• ${dish}`;
    messageField.value = existing ? `${existing}\n${line}` : `Please prepare / hold for us:\n${line}`;

    btn.textContent = 'Added ✓';
    btn.classList.add('added');
    setTimeout(() => {
      btn.textContent = '+ Add to reservation';
      btn.classList.remove('added');
    }, 1800);

    document.getElementById('reserve').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => messageField.focus(), 500);
  });
});

/* ============================================
   Back to top (interactive feature)
   ============================================ */
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 700);
}, { passive: true });
backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ============================================
   Footer newsletter signup (interactive feature)
   ============================================ */
const newsletterForm = document.getElementById('newsletterForm');
const newsletterMsg = document.getElementById('newsletterMsg');
newsletterForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const emailInput = document.getElementById('newsletterEmail');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
  if (valid) {
    newsletterMsg.textContent = 'Thank you — welcome to the Élan journal.';
    newsletterForm.reset();
  } else {
    newsletterMsg.textContent = 'Please enter a valid email address.';
  }
  setTimeout(() => { newsletterMsg.textContent = ''; }, 5000);
});

/* ============================================
   FAQ accordion (interactive feature)
   ============================================ */
document.querySelectorAll('.faq-item').forEach(item => {
  item.addEventListener('click', () => item.classList.toggle('active'));
});

/* ============================================
   Cinematic video mute toggles (interactive feature)
   ============================================ */
document.querySelectorAll('[data-mute-toggle]').forEach(btn => {
  const video = btn.closest('.cine-card').querySelector('video');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.muted = !video.muted;
    btn.innerHTML = video.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
  });
});

/* ============================================
   Testimonial slider (interactive feature)
   ============================================ */
const voiceTrack = document.getElementById('voiceTrack');
const voiceSlides = voiceTrack.querySelectorAll('.voice-slide');
const voiceDots = document.getElementById('voiceDots');
const voicePrev = document.getElementById('voicePrev');
const voiceNext = document.getElementById('voiceNext');
let voiceIndex = 0;
let voiceTimer;

voiceSlides.forEach((_, i) => {
  const dot = document.createElement('button');
  if (i === 0) dot.classList.add('active');
  dot.addEventListener('click', () => goToVoice(i));
  voiceDots.appendChild(dot);
});

function goToVoice(i) {
  voiceIndex = (i + voiceSlides.length) % voiceSlides.length;
  voiceTrack.style.transform = `translateX(-${voiceIndex * 100}%)`;
  voiceDots.querySelectorAll('button').forEach((d, idx) => d.classList.toggle('active', idx === voiceIndex));
  resetVoiceTimer();
}
function resetVoiceTimer() {
  clearInterval(voiceTimer);
  voiceTimer = setInterval(() => goToVoice(voiceIndex + 1), 6500);
}
voiceNext.addEventListener('click', () => goToVoice(voiceIndex + 1));
voicePrev.addEventListener('click', () => goToVoice(voiceIndex - 1));
resetVoiceTimer();

/* ============================================
   Reservation form — client-side validation +
   real submission to the SMTP contact API
   (Frontend → API → Backend → SMTP → Company Email)
   ============================================ */
const reserveForm = document.getElementById('reserveForm');
const formFeedback = document.getElementById('formFeedback');

/*
 * Where the reservation API lives.
 *
 *  - Deployed on Vercel: '' (empty) → the form posts to "/api/contact" on the
 *    SAME site it was loaded from. Works on the production URL, branch
 *    aliases and preview deployments, and needs no CORS setup.
 *  - Local development: the page is served on a different port than the API
 *    (e.g. localhost:3000 or Live Server on :5500), so it must call the API
 *    at http://localhost:4000 (run `npm run dev` in the API folder, and add
 *    the page's origin to ALLOWED_ORIGIN in .env).
 *
 * Never end this value with a "/" — it would produce "//api/contact",
 * which Vercel redirects, and browsers reject redirects on CORS preflights.
 */
const API_BASE_URL = (() => {
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  return isLocal && location.port !== '4000' ? 'http://localhost:4000' : '';
})().replace(/\/+$/, '');

const CONTACT_ENDPOINT = `${API_BASE_URL}/api/contact`;

function setFeedback(html, isError) {
  formFeedback.classList.add('visible');
  formFeedback.classList.toggle('error', !!isError);
  formFeedback.innerHTML = html;
}

reserveForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // ---- client-side validation (fast feedback) ----
  let valid = true;
  reserveForm.querySelectorAll('.field').forEach(field => {
    const input = field.querySelector('input, textarea');
    if (!input || !input.hasAttribute('required')) return;
    let fieldValid = input.value.trim().length > 0;

    if (input.type === 'email' && fieldValid) {
      fieldValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    }
    if (input.type === 'number' && fieldValid) {
      const n = Number(input.value);
      fieldValid = n >= Number(input.min) && n <= Number(input.max);
    }

    field.classList.toggle('invalid', !fieldValid);
    if (!fieldValid) valid = false;
  });

  if (!valid) {
    setFeedback('<i class="fas fa-exclamation-circle"></i> Please fix the errors above.', true);
    return;
  }

  // ---- real submission to the backend ----
  const submitBtn = reserveForm.querySelector('button[type="submit"]');
  const originalBtnHTML = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';

  const payload = {
    fullName: document.getElementById('fullName').value.trim(),
    emailAddr: document.getElementById('emailAddr').value.trim(),
    fparty: Number(document.getElementById('fparty').value),
    message: document.getElementById('message').value.trim(),
    company: '', // honeypot — always empty for real users
  };

  // Give up after 20s so the button never stays stuck on "Sending…"
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    // The API always answers in JSON, but be safe if something else replies (e.g. an HTML 404)
    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success) {
      setFeedback('<i class="fas fa-check-circle"></i> Thank you — a member of our team will reach out shortly.', false);
      reserveForm.reset();
      setTimeout(() => formFeedback.classList.remove('visible'), 6000);
    } else if (result.errors) {
      // Backend caught something the client-side check missed
      Object.keys(result.errors).forEach(fieldName => {
        const input = reserveForm.querySelector(`[name="${fieldName}"], #${fieldName}`);
        input?.closest('.field')?.classList.add('invalid');
      });
      setFeedback('<i class="fas fa-exclamation-circle"></i> Please fix the errors above.', true);
    } else {
      setFeedback('<i class="fas fa-exclamation-circle"></i> ' + (result.error || 'Something went wrong. Please try again.'), true);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      setFeedback('<i class="fas fa-exclamation-circle"></i> The request took too long. Please try again.', true);
    } else {
      setFeedback('<i class="fas fa-exclamation-circle"></i> Couldn\'t reach the server. Please check your connection and try again.', true);
    }
  } finally {
    clearTimeout(timeoutId);
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHTML;
  }
});

reserveForm.querySelectorAll('input, textarea').forEach(input => {
  input.addEventListener('input', () => {
    input.closest('.field').classList.remove('invalid');
  });
});
