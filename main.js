'use strict';

/* ─── NAVBAR SCROLL ─────────────────────── */
const navbar = document.getElementById('navbar');
const banner = document.getElementById('urgentBanner');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ─── SIDEBAR & NAV LOGIC (Menu Lateral) ── */
const hamburger = document.getElementById('hamburger');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar(e) {
  if (e) e.preventDefault();
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
  document.body.style.overflow = '';
}

if (hamburger) hamburger.addEventListener('click', openSidebar);
if (sidebarToggle) sidebarToggle.addEventListener('click', openSidebar);
if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

sidebar.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', (e) => {
    if (!a.classList.contains('sidebar-cat-link')) {
      closeSidebar();
    }
  });
});

/* ─── SEARCH INPUT SYNC & CATEGORIES ────── */
const navSearchInput = document.getElementById('navSearchInput');
const productSearch = document.getElementById('productSearch');
const categorySelect = document.getElementById('productCategory');

if (navSearchInput && productSearch) {
  navSearchInput.addEventListener('input', (e) => {
    productSearch.value = e.target.value;
    productSearch.dispatchEvent(new Event('input', { bubbles: true }));
  });

  navSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = document.getElementById('productos');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

document.querySelectorAll('.sidebar-cat-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const cat = link.getAttribute('data-cat');
    if (categorySelect) {
      categorySelect.value = cat;
      categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    closeSidebar();
    const target = document.getElementById('productos');
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 350);
    }
  });
});

/* ─── OFFERS CAROUSEL ───────────────────── */
(function() {
  const track = document.getElementById('offersTrack');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');
  if (!track || !prevBtn || !nextBtn) return;

  // Shuffle offer cards on each page load/refresh
  const offerCards = Array.from(track.querySelectorAll('.offer-card'));
  if (offerCards.length > 1) {
    for (let i = offerCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [offerCards[i], offerCards[j]] = [offerCards[j], offerCards[i]];
    }
    offerCards.forEach(card => track.appendChild(card));
  }

  const scrollAmount = 300;

  nextBtn.addEventListener('click', () => {
    track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  });
  prevBtn.addEventListener('click', () => {
    track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  });

  // Auto-scroll every 4 seconds
  let autoScroll = setInterval(() => {
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }, 4000);

  // Pause auto-scroll on hover
  track.addEventListener('mouseenter', () => clearInterval(autoScroll));
  track.addEventListener('mouseleave', () => {
    autoScroll = setInterval(() => {
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, 4000);
  });
})();

/* ─── PRODUCTS FILTER & PAGINATION ──────── */
(function() {
  const searchInput = document.getElementById('productSearch');
  const categorySelect = document.getElementById('productCategory');
  const productsGrid = document.getElementById('productsGrid');
  const paginationControls = document.getElementById('paginationControls');
  
  if (!productsGrid || !searchInput || !categorySelect || !paginationControls) return;

  const ITEMS_PER_PAGE = 6;
  let currentPage = 1;
  let allProducts = Array.from(productsGrid.querySelectorAll('.product-card'));

  // Randomize product display order on each page visit/refresh
  if (allProducts.length > 1) {
    for (let i = allProducts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allProducts[i], allProducts[j]] = [allProducts[j], allProducts[i]];
    }
    allProducts.forEach(card => productsGrid.appendChild(card));
  }

  function filterAndPaginate() {
    const searchTerm = searchInput.value.toLowerCase();
    const category = categorySelect.value.toLowerCase();
    
    // Filter
    let filteredProducts = allProducts.filter(card => {
      const title = card.querySelector('h3').textContent.toLowerCase();
      const desc = card.querySelector('p').textContent.toLowerCase();
      const tag = card.querySelector('.product-tag').textContent.toLowerCase();
      
      const matchesSearch = title.includes(searchTerm) || desc.includes(searchTerm);
      const matchesCategory = category === 'all' || tag.includes(category) || category.includes(tag) || tag.includes(category.split(' ')[0]);
      
      return matchesSearch && matchesCategory;
    });

    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    // Render
    allProducts.forEach(card => card.classList.add('hidden-product'));
    filteredProducts.slice(startIndex, endIndex).forEach(card => card.classList.remove('hidden-product'));

    // Controls
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    paginationControls.innerHTML = '';
    if (totalPages <= 1) return;

    const scrollToProducts = () => {
      const target = document.getElementById('productos');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '«';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => { currentPage--; filterAndPaginate(); scrollToProducts(); });
    paginationControls.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = `page-btn ${currentPage === i ? 'active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => { currentPage = i; filterAndPaginate(); scrollToProducts(); });
      paginationControls.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = '»';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => { currentPage++; filterAndPaginate(); scrollToProducts(); });
    paginationControls.appendChild(nextBtn);
  }

  searchInput.addEventListener('input', () => { currentPage = 1; filterAndPaginate(); });
  categorySelect.addEventListener('change', () => { currentPage = 1; filterAndPaginate(); });

  // Init
  filterAndPaginate();
})();

/* ─── SCROLL REVEAL ─────────────────────── */
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const siblings = entry.target.parentElement.querySelectorAll('.reveal');
      let delay = 0;
      siblings.forEach((sib, idx) => { if (sib === entry.target) delay = idx * 80; });
      setTimeout(() => entry.target.classList.add('visible'), delay);
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
revealEls.forEach(el => revealObs.observe(el));

/* ─── HERO PARALLAX ─────────────────────── */
const heroBg = document.querySelector('.hero-bg img');
if (heroBg) {
  window.addEventListener('scroll', () => {
    heroBg.style.transform = `scale(1.05) translateY(${window.scrollY * 0.25}px)`;
  }, { passive: true });
}

/* ─── PARTICLE CANVAS (Hero — Light theme) ─ */
(function() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], animId;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize, { passive: true });
  const COUNT = window.innerWidth < 600 ? 30 : 50;
  const COLORS = ['rgba(0,184,100,', 'rgba(0,144,204,', 'rgba(124,77,255,'];
  function rand(a, b) { return Math.random() * (b - a) + a; }
  function Particle() { this.reset(); }
  Particle.prototype.reset = function() {
    this.x = rand(0, W); this.y = rand(0, H); this.r = rand(0.8, 2);
    this.alpha = rand(0.06, 0.2); this.vx = rand(-0.2, 0.2); this.vy = rand(-0.3, -0.08);
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)]; this.life = rand(0.001, 0.003);
  };
  for (let i = 0; i < COUNT; i++) particles.push(new Particle());
  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.alpha + ')'; ctx.fill();
      p.x += p.vx; p.y += p.vy; p.alpha -= p.life;
      if (p.alpha <= 0 || p.y < -10) p.reset();
    });
    animId = requestAnimationFrame(draw);
  }
  const heroSection = document.getElementById('hero');
  const pauseObs = new IntersectionObserver(entries => {
    entries[0].isIntersecting ? (animId = requestAnimationFrame(draw)) : cancelAnimationFrame(animId);
  });
  heroSection ? pauseObs.observe(heroSection) : draw();
})();

/* ─── CTA CANVAS (Light theme) ──────────── */
(function() {
  const canvas = document.getElementById('ctaCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, nodes = [], animId2;
  function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener('resize', resize, { passive: true });
  for (let i = 0; i < 30; i++) {
    nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4 });
  }
  function drawNet() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160) {
          ctx.beginPath(); ctx.strokeStyle = `rgba(0,184,100,${0.06 * (1 - dist / 160)})`;
          ctx.lineWidth = 0.8; ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
        }
      }
    }
    nodes.forEach(n => {
      ctx.beginPath(); ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,184,100,0.15)'; ctx.fill();
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });
    animId2 = requestAnimationFrame(drawNet);
  }
  const ctaSection = document.getElementById('cta-final');
  const obs2 = new IntersectionObserver(entries => {
    entries[0].isIntersecting ? (animId2 = requestAnimationFrame(drawNet)) : cancelAnimationFrame(animId2);
  });
  ctaSection ? obs2.observe(ctaSection) : drawNet();
})();

/* ─── SMOOTH SCROLL ─────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

/* ─── PRODUCT CARD 3D TILT ──────────────── */
document.querySelectorAll('.product-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    card.style.transform = `perspective(800px) rotateX(${-dy * 4}deg) rotateY(${dx * 4}deg) translateY(-8px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.5s ease';
    setTimeout(() => card.style.transition = '', 500);
  });
});

/* ─── FAQ ACCORDION ─────────────────────── */
document.querySelectorAll('.faq-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const content = btn.nextElementSibling;
    const isActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('active');
      i.querySelector('.faq-content').style.maxHeight = null;
    });
    if (!isActive) {
      item.classList.add('active');
      content.style.maxHeight = content.scrollHeight + 'px';
    }
  });
});

/* ─── STICKY CTA VISIBILITY ─────────────── */
const stickyCta = document.getElementById('stickyCta');
if (stickyCta) {
  window.addEventListener('scroll', () => {
    stickyCta.classList.toggle('show', window.scrollY > 600);
  }, { passive: true });
}

/* ─── ACTIVE NAV LINK ───────────────────── */
const sections = document.querySelectorAll('section[id]');
const navLinksAll = document.querySelectorAll('.nav-links a');
const sectionObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinksAll.forEach(a => a.classList.remove('active'));
      const link = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
      if (link) link.classList.add('active');
    }
  });
}, { threshold: 0.35 });
sections.forEach(s => sectionObs.observe(s));

/* ─── RIPPLE EFFECT ─────────────────────── */
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.style.cssText = `position:absolute;border-radius:50%;width:120px;height:120px;background:rgba(255,255,255,.2);top:${e.clientY-rect.top-60}px;left:${e.clientX-rect.left-60}px;transform:scale(0);animation:ripple .6s ease-out forwards;pointer-events:none`;
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  });
});

// Inject ripple keyframe
const styleSheet = document.createElement('style');
styleSheet.textContent = `@keyframes ripple{to{transform:scale(2.5);opacity:0}}`;
document.head.appendChild(styleSheet);

/* ─── COUNTDOWN TIMER ───────────────────── */
document.querySelectorAll('.countdown').forEach(el => {
  let time = parseInt(el.getAttribute('data-time'), 10) || 0;
  if (time <= 0) return;
  const updateTimer = () => {
    if (time <= 0) return;
    time--;
    const h = Math.floor(time / 3600).toString().padStart(2, '0');
    const m = Math.floor((time % 3600) / 60).toString().padStart(2, '0');
    const s = (time % 60).toString().padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
  };
  setInterval(updateTimer, 1000);
});

console.log('%cEntrenaMente 🧠⚡', 'color:#00b864;font-size:18px;font-weight:900');
