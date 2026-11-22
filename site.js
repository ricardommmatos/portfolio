
const menu = document.querySelector('#menu');
const languageButtons = document.querySelectorAll('[data-language]');
const translatedText = Array.from(document.querySelectorAll('[data-pt]'), element => ({
  element,
  pt: element.dataset.pt,
  en: element.textContent
}));
const translatedAltText = Array.from(document.querySelectorAll('img[data-alt-pt]'), image => ({
  image, en: image.alt, pt: image.dataset.altPt
}));

const lisbonClocks = document.querySelectorAll('[data-lisbon-clock]');
const lisbonTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Lisbon',
  hour12: true,
  hour: 'numeric',
  minute: '2-digit'
});

function updateLisbonClock() {
  const now = new Date();
  const parts = lisbonTime.formatToParts(now);
  const hour = Number(parts.find(part => part.type === 'hour').value) % 12;
  const period = parts.find(part => part.type === 'dayPeriod').value;
  const minute = parts.find(part => part.type === 'minute').value;
  const timeValue = `${String(hour + (period === 'PM' ? 12 : 0)).padStart(2, '0')}:${minute}`;
  const displayTime = lisbonTime.format(now);
  for (const clock of lisbonClocks) {
    clock.textContent = displayTime;
    clock.dateTime = timeValue;
  }
}
if (lisbonClocks.length) {
  updateLisbonClock();
  setInterval(updateLisbonClock, 1000);
}

for (const year of document.querySelectorAll('[data-current-year]')) {
  year.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', year: 'numeric' }).format(new Date());
}

const contactPhrase = document.querySelector('[data-contact-phrase]');
const contactPhrases = {
  en: ['talk', 'create', 'connect'],
  pt: ['conversar', 'criar', 'ligar-nos']
};
let contactPhraseIndex = 0;

function showContactPhrase() {
  if (contactPhrase) contactPhrase.textContent = contactPhrases[document.documentElement.lang][contactPhraseIndex];
}

function applyLanguage(language) {
  document.documentElement.lang = language;
  showContactPhrase();
  for (const { element, pt, en } of translatedText) {
    element.textContent = language === 'en' ? en : pt;
  }
  for (const { image, en, pt } of translatedAltText) image.alt = language === 'en' ? en : pt;
  for (const option of languageButtons) {
    option.setAttribute('aria-pressed', String(option.dataset.language === language));
  }
  for (const link of document.querySelectorAll('a[href$=".html"], a[data-page]')) {
    const destination = link.getAttribute('href').split('?')[0];
    link.href = language === 'pt' ? destination + '?lang=pt' : destination;
  }
}
for (const button of languageButtons) {
  button.addEventListener('click', () => {
    applyLanguage(button.dataset.language);
    renderPointer();
  });
}
applyLanguage(new URLSearchParams(location.search).get('lang') === 'pt' ? 'pt' : 'en');

const skills = document.querySelector('.skills:not(.skills-fall)');
if (skills && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    skills.classList.add('is-visible');
    observer.disconnect();
  }, { threshold: 0.35 });
  observer.observe(skills);
}

const menuButton = document.querySelector('#menu-button');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
if (contactPhrase) {
  setInterval(() => {
    if (!reducedMotion.matches && !document.hidden) {
      contactPhraseIndex = (contactPhraseIndex + 1) % contactPhrases.en.length;
      showContactPhrase();
      contactPhrase.animate(
        [{ opacity: 0, transform: 'translateY(.16em)' }, { opacity: 1, transform: 'none' }],
        { duration: 300, easing: 'ease-out' }
      );
    }
  }, 2800);
}

const closeMenuButton = menu.querySelector('.panel form button');
const hasNativeDialog = typeof menu.showModal === 'function';

menuButton.addEventListener('click', () => {
  if (menu.hasAttribute('open')) return;
  if (hasNativeDialog) {
    menu.showModal();
  } else {
    menu.classList.add('menu-fallback');
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('open', '');
    document.documentElement.classList.add('has-menu-fallback');
    closeMenuButton.focus();
  }
  menuButton.setAttribute('aria-expanded', 'true');
});

function finishMenuClose() {
  menuButton.setAttribute('aria-expanded', 'false');
  if (hasNativeDialog) {
    menu.close();
  } else {
    menu.removeAttribute('open');
    document.documentElement.classList.remove('has-menu-fallback');
    menuButton.focus({ preventScroll: true });
  }
}

function closeMenu() {
  if (!menu.hasAttribute('open') || menu.classList.contains('is-closing')) return;
  if (reducedMotion.matches) {
    finishMenuClose();
    return;
  }
  menu.classList.add('is-closing');
  const panel = menu.querySelector('.panel');
  const finishClosing = () => {
    panel.removeEventListener('animationend', finishClosing);
    clearTimeout(closeTimeout);
    menu.classList.remove('is-closing');
    if (menu.hasAttribute('open')) finishMenuClose();
  };
  const closeTimeout = setTimeout(finishClosing, 300);
  panel.addEventListener('animationend', finishClosing);
}

menu.addEventListener('cancel', event => {
  event.preventDefault();
  closeMenu();
});
menu.querySelector('form').addEventListener('submit', event => {
  event.preventDefault();
  closeMenu();
});
menu.addEventListener('click', event => {
  if (event.target === menu) closeMenu();
});
for (const link of menu.querySelectorAll('nav a')) {
  link.addEventListener('click', finishMenuClose);
}

if (!hasNativeDialog) {
  const menuControls = menu.querySelectorAll('button, a[href]');
  const lastMenuControl = menuControls[menuControls.length - 1];
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    }
    if (event.key === 'Tab') {
      const edge = event.shiftKey ? closeMenuButton : lastMenuControl;
      const destination = event.shiftKey ? lastMenuControl : closeMenuButton;
      if (document.activeElement === edge) {
        event.preventDefault();
        destination.focus();
      }
    }
  });
}

const pointer = document.createElement('div');
pointer.className = 'site-pointer';
pointer.setAttribute('aria-hidden', 'true');
const pointerLabel = document.createElement('span');
pointerLabel.className = 'site-pointer-label';
pointer.append(pointerLabel);
document.body.append(pointer);

const pointerStyle = document.documentElement.classList;
let pointerPosition;
let displayedPosition;
let pointerFrame;
const mousePointer = matchMedia('(any-hover:hover) and (any-pointer:fine)');

function animatePointer() {
  pointerFrame = undefined;
  if (!pointerPosition) return;
  const { x, y } = pointerPosition;
  const previous = displayedPosition ?? pointerPosition;
  const follow = .18;
  const close = Math.hypot(x - previous.x, y - previous.y) < .5;
  displayedPosition = close || reducedMotion.matches ? pointerPosition : {
    x: previous.x + (x - previous.x) * follow,
    y: previous.y + (y - previous.y) * follow
  };
  pointer.style.transform = `translate3d(${displayedPosition.x}px, ${displayedPosition.y}px, 0) translate(-50%, -50%)`;
  if (displayedPosition !== pointerPosition) pointerFrame = requestAnimationFrame(animatePointer);
}

function renderPointer() {
  if (!pointerPosition) return;
  const { x, y } = pointerPosition;
  const target = document.elementFromPoint(x, y);
  const project = target?.closest('a.project-card');
  const media = !project && target?.closest('img,video,.portrait-surface');
  const text = !project && !media && target?.closest('a,button,h1,h2,h3,p,dt,dd,li');
  pointer.classList.toggle('is-project', Boolean(project));
  pointer.classList.toggle('is-media', Boolean(media));
  pointer.classList.toggle('is-text', Boolean(text));
  const label = project
    ? (document.documentElement.lang === 'en' ? 'View project' : 'Ver projeto')
    : '';
  if (pointerLabel.textContent !== label) pointerLabel.textContent = label;
}

function hidePointer() {
  pointerPosition = undefined;
  displayedPosition = undefined;
  cancelAnimationFrame(pointerFrame);
  pointerFrame = undefined;
  pointerStyle.remove('has-site-pointer');
}

window.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || !mousePointer.matches) {
    hidePointer();
    return;
  }
  const layer = menu.hasAttribute('open') ? menu : document.body;
  if (pointer.parentElement !== layer) layer.append(pointer);
  pointerPosition = { x: event.clientX, y: event.clientY };
  renderPointer();
  if (pointerFrame === undefined) animatePointer();
  pointerStyle.add('has-site-pointer');
}, { passive: true });
window.addEventListener('scroll', renderPointer, { capture: true, passive: true });
document.documentElement.addEventListener('pointerleave', hidePointer);
window.addEventListener('blur', hidePointer);
window.addEventListener('pointercancel', hidePointer);
mousePointer.addEventListener('change', hidePointer);
menu.addEventListener('close', hidePointer);
document.querySelector('#menu-button').addEventListener('click', hidePointer);

const portraitFrame = document.querySelector('.portrait-tilt');
if (portraitFrame) {
  const resetPortrait = () => {
    portraitFrame.classList.remove('is-tilting');
    for (const property of ['--portrait-x', '--portrait-y', '--portrait-scale', '--light-x', '--light-y']) {
      portraitFrame.style.removeProperty(property);
    }
  };

  portraitFrame.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
    const bounds = portraitFrame.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    portraitFrame.style.setProperty('--portrait-x', `${(.5 - y) * 24}deg`);
    portraitFrame.style.setProperty('--portrait-y', `${(x - .5) * 24}deg`);
    portraitFrame.style.setProperty('--portrait-scale', '1.045');
    portraitFrame.style.setProperty('--light-x', `${x * 100}%`);
    portraitFrame.style.setProperty('--light-y', `${y * 100}%`);
    portraitFrame.classList.add('is-tilting');
  });
  portraitFrame.addEventListener('pointerleave', resetPortrait);
  portraitFrame.addEventListener('pointercancel', resetPortrait);
  window.addEventListener('blur', resetPortrait);
  reducedMotion.addEventListener('change', resetPortrait);
}

const fallingSkills = document.querySelector('.skills-fall');

function dropSkills(container) {
  if (reducedMotion.matches) return;

  let width = container.clientWidth;
  const height = container.clientHeight;
  const labels = [...container.children].map((element, index, all) => {
    const { width: w, height: h } = element.getBoundingClientRect();
    const spread = (index * 7 % all.length + .5) / all.length;
    return {
      element, w, h, x: (width - w) * spread, y: 0,
      vx: (index % 5 - 2) * 52, vy: 0, angle: (index % 5 - 2) * .21,
      spin: (index % 3 - 1) * 2.2, delay: index * .046
    };
  });
  container.style.height = `${height}px`;
  container.classList.add('is-simulating');
  const interactions = new AbortController();
  const options = { signal: interactions.signal };
  let drag;

  function paint(label) {
    label.element.style.transform = `translate3d(${label.x}px,${label.y}px,0) rotate(${label.angle}rad)`;
  }

  function wake() {
    remaining = 3.2;
    if (frame !== undefined) return;
    lastTime = undefined;
    frame = requestAnimationFrame(tick);
  }

  // Resolve overlap along the shortest side so labels can pile up or slide apart.
  function collide(a, b) {
    const dx = b.x + b.w / 2 - a.x - a.w / 2;
    const dy = b.y + b.h / 2 - a.y - a.h / 2;
    const overlapX = (a.w + b.w) / 2 - Math.abs(dx);
    const overlapY = (a.h + b.h) / 2 - Math.abs(dy);
    if (overlapX <= 0 || overlapY <= 0) return;

    const horizontal = overlapX < overlapY;
    const axis = horizontal ? 'x' : 'y';
    const speed = horizontal ? 'vx' : 'vy';
    const direction = (horizontal ? dx : dy) < 0 ? -1 : 1;
    const separation = (horizontal ? overlapX : overlapY) * direction / 2;
    const aFree = a !== drag?.label;
    const bFree = b !== drag?.label;
    if (aFree) a[axis] -= separation * (bFree ? 1 : 2);
    if (bFree) b[axis] += separation * (aFree ? 1 : 2);
    const approach = (a[speed] - b[speed]) * direction;
    if (approach <= 0) return;
    const impulse = approach * .63 * direction;
    const twist = direction * Math.min(1.7, approach / 260);
    if (aFree) {
      a[speed] -= impulse;
      a.spin -= twist;
    }
    if (bFree) {
      b[speed] += impulse;
      b.spin += twist;
    }
  }

  function keepInBounds(label, bounce = true) {
    const sin = Math.abs(Math.sin(label.angle));
    const cos = Math.abs(Math.cos(label.angle));
    const extraX = (label.w * cos + label.h * sin - label.w) / 2;
    const extraY = (label.h * cos + label.w * sin - label.h) / 2;
    const left = 6 + extraX;
    const right = Math.max(left, width - label.w - left);
    const top = 12 + extraY;
    const floor = Math.max(top, height - label.h - 16 - extraY);

    if (label.x < left || label.x > right) {
      label.x = Math.max(left, Math.min(right, label.x));
      if (bounce) label.vx *= -.38;
    }
    if (label.y < top) {
      label.y = top;
      if (bounce && label.vy < 0) label.vy *= -.3;
    }
    if (label.y > floor) {
      label.y = floor;
      if (bounce) {
        label.vy = label.vy > 45 ? -label.vy * .32 : 0;
        label.vx *= .82;
        label.spin *= .78;
      }
    }
  }

  let frame;
  let lastTime;
  let elapsed = 0;
  let remaining = 0;

  function reset() {
    cancelAnimationFrame(frame);
    container.classList.remove('is-simulating');
    container.style.removeProperty('height');
    for (const { element } of labels) {
      element.style.removeProperty('transform');
      element.style.removeProperty('visibility');
    }
    if (drag) {
      const { label, id } = drag;
      label.element.classList.remove('is-held');
      if (label.element.hasPointerCapture(id)) label.element.releasePointerCapture(id);
    }
    interactions.abort();
  }

  function tick(time) {
    frame = undefined;
    const dt = Math.min(.024, (time - (lastTime ?? time)) / 1000);
    lastTime = time;
    elapsed += dt;
    remaining -= dt;
    const active = labels.filter(label => elapsed >= label.delay);
    for (const label of active) {
      if (label === drag?.label) continue;
      label.vy += 1150 * dt;
      label.x += label.vx * dt;
      label.y += label.vy * dt;
      label.angle = Math.max(-.55, Math.min(.55, label.angle + label.spin * dt));
      label.spin *= .98;
      keepInBounds(label);
    }
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) collide(active[i], active[j]);
      }
      for (const label of active) if (label !== drag?.label) keepInBounds(label);
    }
    for (const label of active) {
      label.element.style.removeProperty('visibility');
      paint(label);
    }
    if (remaining > 0 || drag) frame = requestAnimationFrame(tick);
  }

  function release(event) {
    if (drag?.id !== event.pointerId) return;
    const { label, id, lastMove } = drag;
    const throwLabel = event.type === 'pointerup' && event.timeStamp - lastMove < 100;
    if (!throwLabel) label.vx = label.vy = 0;
    label.spin = Math.max(-5, Math.min(5, label.vx / 100));
    drag = undefined;
    label.element.classList.remove('is-held');
    if (label.element.hasPointerCapture(id)) label.element.releasePointerCapture(id);
    wake();
  }

  for (const label of labels) {
    keepInBounds(label, false);
    label.element.style.visibility = 'hidden';
    paint(label);
    label.element.addEventListener('pointerdown', event => {
      if (drag || event.button !== 0) return;
      event.preventDefault();
      label.element.setPointerCapture(event.pointerId);
      label.element.classList.add('is-held');
      label.vx = label.vy = 0;
      drag = { label, id: event.pointerId, x: event.clientX, y: event.clientY, lastMove: event.timeStamp };
      wake();
    }, options);
    label.element.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      const seconds = Math.max(.008, (event.timeStamp - drag.lastMove) / 1000);
      label.x += dx;
      label.y += dy;
      label.vx = Math.max(-850, Math.min(850, dx / seconds));
      label.vy = Math.max(-850, Math.min(850, dy / seconds));
      label.angle = Math.max(-.55, Math.min(.55, label.angle + dx * .006));
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.lastMove = event.timeStamp;
      keepInBounds(label, false);
      paint(label);
      wake();
    }, options);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      label.element.addEventListener(type, release, options);
    }
  }

  window.addEventListener('resize', () => {
    width = container.clientWidth;
    for (const label of labels) keepInBounds(label);
    wake();
  }, options);
  reducedMotion.addEventListener('change', reset, options);
  wake();
}

if (fallingSkills && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    dropSkills(fallingSkills);
  }, { threshold: .3 });
  observer.observe(fallingSkills);
}

const projectFilters = document.querySelectorAll('[data-project-filter]');
const projectItems = document.querySelectorAll('[data-project-category]');

for (const button of projectFilters) {
  button.addEventListener('click', () => {
    const category = button.dataset.projectFilter;
    for (const filter of projectFilters) {
      filter.setAttribute('aria-pressed', String(filter === button));
    }
    for (const item of projectItems) {
      const categories = item.dataset.projectCategory.split(' ');
      item.hidden = category !== 'all' && !categories.includes(category);
    }
    renderPointer();
  });
}
