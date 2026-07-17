import { readFile, writeFile } from 'node:fs/promises';

const sources = [
  { file: 'preview.html', act: 1, title: 'Диагностика' },
  { file: 'preview (1).html', act: 2, title: 'Multica' },
  { file: 'preview (2).html', act: 3, title: 'Внедрение' },
];

const sourceHtml = await Promise.all(sources.map(({ file }) => readFile(file, 'utf8')));

function extract(html, pattern, label) {
  const match = html.match(pattern);
  if (!match) throw new Error(`Не удалось извлечь ${label}`);
  return match[1].trim();
}

function actMap(currentAct) {
  const rows = sources.map(({ act, title }) => {
    const state = act < currentAct ? 'past' : act === currentAct ? 'current' : 'future';
    const labelId = state === 'current' ? ` id="a${currentAct}-s1"` : '';
    const titleMarkup = state === 'future' ? '' : `<span class="act-map-title">${title}</span>`;
    return `
      <div class="act-map-row ${state}">
        <span class="act-map-index">0${act}</span>
        <div class="act-map-copy">
          <span class="act-map-label"${labelId}>Акт ${act}</span>
          ${titleMarkup}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="inner act-opener-inner">
      <div class="act-map" aria-label="Структура презентации">${rows}
      </div>
      <p class="act-opener-note">От личной магии к инженерному процессу</p>
    </div>`;
}

function prepareSlides(html, act) {
  let slides = extract(html, /<main class="slides">([\s\S]*?)<\/main>/, `слайды акта ${act}`);
  slides = slides.replace(/<section class="([^"]*\bslide\b[^"]*)"([^>]*)>/g, (full, classes, rest) => {
    const cleanClasses = classes.split(/\s+/).filter(Boolean).filter((name) => name !== 'active');
    if (!cleanClasses.includes(`act-${act}`)) cleanClasses.push(`act-${act}`);
    return `<section class="${cleanClasses.join(' ')}" data-act="${act}"${rest}>`;
  });
  slides = slides
    .replace(/aria-labelledby="s(\d+)"/g, `aria-labelledby="a${act}-s$1"`)
    .replace(/id="s(\d+)"/g, `id="a${act}-s$1"`);

  if (act === 1) {
    slides = slides.replace(
      /<section class="([^"]*\bact-1\b[^"]*)"([^>]*)>(\s*<div class="inner">\s*<span class="kicker">Вывод группы)/g,
      '<section class="$1 conclusion-slide"$2 data-kind="conclusion">$3',
    );
  }

  let openerReplaced = false;
  slides = slides.replace(/<section class="([^"]*\bslide\b[^"]*\bhero\b[^"]*)"([^>]*)>([\s\S]*?)<\/section>/, (full, classes, rest) => {
    openerReplaced = true;
    return `<section id="act-${act}" class="${classes} act-opener"${rest}>${actMap(act)}\n    </section>`;
  });
  if (!openerReplaced) throw new Error(`Не найден титульный слайд акта ${act}`);
  return slides;
}

const styles = sourceHtml.map((html, index) => {
  const css = extract(html, /<style>([\s\S]*?)<\/style>/, `стили ${sources[index].file}`);
  return `/* Исходные стили акта ${index + 1} */\n${css}`;
}).join('\n\n');

const slides = sourceHtml.map((html, index) => prepareSlides(html, index + 1)).join('\n\n');

const coverSlide = `
      <section id="intro" class="slide hero cover-slide" data-act="0" data-accent="green" aria-labelledby="cover-title">
        <div class="inner cover-inner">
          <p class="cover-eyebrow">Презентация</p>
          <h1 class="cover-title" id="cover-title">От личной магии<br>к инженерному процессу</h1>
          <div class="cover-meta" aria-label="Автор и студия">
            <div><span>Автор</span><strong>Сергей Морозов</strong></div>
            <div><span>Студия</span><strong>Nord Studio</strong></div>
            <div><span>Компания</span><strong>MY.GAMES</strong></div>
          </div>
        </div>
      </section>`;

const unifiedCss = `
    /* Единая навигация */
    .toolbar { grid-template-columns:minmax(260px,1fr) auto auto; }
    .act-jumps { display:flex; align-items:center; gap:7px; }
    .act-jump { min-width:62px; font-weight:760; }
    .act-jump[aria-current="true"] { border-color:rgba(67,221,167,.75); color:#eafff7; background:rgba(67,221,167,.15); box-shadow:inset 0 0 0 1px rgba(67,221,167,.08); }

    /* Самый первый слайд */
    .cover-slide { --accent:var(--green); background:#05070b; overflow:hidden; }
    .cover-slide::after { content:""; position:absolute; inset:0; z-index:-2; background:radial-gradient(circle at 76% 34%,rgba(67,221,167,.18),transparent 24%),radial-gradient(circle at 83% 74%,rgba(115,168,255,.12),transparent 28%),linear-gradient(112deg,rgba(5,7,11,.99),rgba(5,7,11,.76) 61%,rgba(5,7,11,.96)),repeating-linear-gradient(90deg,transparent 0 110px,rgba(255,255,255,.025) 111px 112px),repeating-linear-gradient(0deg,transparent 0 110px,rgba(255,255,255,.022) 111px 112px); }
    .cover-inner { display:grid; align-content:center; min-height:calc(100svh - var(--toolbar-h) - 84px); }
    .cover-eyebrow { margin:0 0 24px; color:var(--green); font-size:13px; font-weight:850; letter-spacing:.2em; text-transform:uppercase; }
    .cover-title { max-width:1320px; margin:0; color:#fff; font-size:clamp(58px,8.3vw,132px); line-height:.86; font-weight:920; letter-spacing:-.055em; }
    .cover-title::first-line { color:#fff; }
    .cover-meta { display:flex; flex-wrap:wrap; gap:clamp(22px,4vw,62px); margin-top:clamp(42px,6vh,74px); padding-top:20px; border-top:1px solid rgba(255,255,255,.14); }
    .cover-meta div { display:grid; gap:5px; min-width:150px; }
    .cover-meta span { color:var(--subtle); font-size:11px; font-weight:820; letter-spacing:.13em; text-transform:uppercase; }
    .cover-meta strong { color:#eef5fb; font-size:clamp(16px,1.4vw,21px); font-weight:760; }

    /* Титульная карта актов */
    .act-opener { --accent:var(--green); background:#06080d; overflow:hidden; }
    .act-opener::after { content:""; position:absolute; inset:0; z-index:-2; background:radial-gradient(circle at 78% 44%,rgba(67,221,167,.13),transparent 27%),linear-gradient(115deg,rgba(6,8,13,.99),rgba(6,8,13,.80) 58%,rgba(6,8,13,.96)),repeating-linear-gradient(90deg,transparent 0 110px,rgba(255,255,255,.025) 111px 112px),repeating-linear-gradient(0deg,transparent 0 110px,rgba(255,255,255,.022) 111px 112px); }
    .act-opener-inner { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:end; gap:42px; }
    .act-map { position:relative; display:grid; gap:clamp(16px,2.2vh,28px); max-width:1180px; padding-left:clamp(28px,4vw,58px); }
    .act-map::before { content:""; position:absolute; left:9px; top:14px; bottom:14px; width:1px; background:linear-gradient(var(--green),rgba(255,255,255,.13)); }
    .act-map-row { position:relative; display:grid; grid-template-columns:58px minmax(0,1fr); align-items:start; gap:18px; transition:opacity 180ms ease,transform 180ms ease; }
    .act-map-row::before { content:""; position:absolute; left:calc(-1 * clamp(28px,4vw,58px) + 3px); top:13px; width:13px; height:13px; border:2px solid rgba(255,255,255,.24); border-radius:50%; background:#06080d; }
    .act-map-index { padding-top:5px; color:var(--subtle); font-size:13px; font-weight:850; letter-spacing:.18em; }
    .act-map-copy { display:grid; gap:3px; }
    .act-map-label { color:var(--text); font-size:clamp(30px,3.1vw,50px); line-height:1; font-weight:900; letter-spacing:-.035em; }
    .act-map-title { color:var(--muted); font-size:clamp(17px,1.55vw,24px); line-height:1.2; font-weight:720; }
    .act-map-row.current { grid-template-columns:72px minmax(0,1fr); padding:clamp(5px,1vh,12px) 0; }
    .act-map-row.current::before { left:calc(-1 * clamp(28px,4vw,58px)); top:24px; width:19px; height:19px; border-color:var(--green); background:var(--green); box-shadow:0 0 0 7px rgba(67,221,167,.12),0 0 42px rgba(67,221,167,.34); }
    .act-map-row.current .act-map-index { padding-top:10px; color:var(--green); }
    .act-map-row.current .act-map-label { color:#fff; font-size:clamp(62px,8.4vw,132px); line-height:.82; }
    .act-map-row.current .act-map-title { color:#fff; font-size:clamp(30px,4vw,64px); line-height:1.02; font-weight:860; letter-spacing:-.035em; }
    .act-map-row.past { opacity:.64; }
    .act-map-row.past .act-map-label { font-size:clamp(22px,2.2vw,34px); }
    .act-map-row.past .act-map-title { font-size:clamp(15px,1.25vw,20px); }
    .act-map-row.future { opacity:.23; }
    .act-map-row.future .act-map-label { color:#9aa4b3; }
    .act-opener-note { margin:0 0 4px; color:var(--subtle); font-size:13px; font-weight:760; letter-spacing:.04em; writing-mode:vertical-rl; transform:rotate(180deg); text-transform:uppercase; }

    /* Смысловые остановки между группами проблем в первом акте. */
    .conclusion-slide { isolation:isolate; overflow:hidden; padding-block:28px; background:linear-gradient(108deg,color-mix(in srgb,var(--accent) 13%,#070a10),#070a10 58%,color-mix(in srgb,var(--accent) 7%,#070a10)); box-shadow:inset 9px 0 0 color-mix(in srgb,var(--accent) 82%,white); }
    .conclusion-slide::after { content:"ВЫВОД"; position:fixed; z-index:-1; right:clamp(20px,5vw,76px); bottom:clamp(18px,4vh,46px); color:color-mix(in srgb,var(--accent) 10%,transparent); font-size:clamp(100px,19vw,310px); line-height:.72; font-weight:950; letter-spacing:-.08em; pointer-events:none; }
    .conclusion-slide .inner { position:relative; }
    .conclusion-slide .kicker { margin-bottom:18px; padding:9px 13px; border:0; border-left:5px solid var(--accent); border-radius:0 8px 8px 0; color:#07100d; background:color-mix(in srgb,var(--accent) 88%,white); box-shadow:0 12px 34px color-mix(in srgb,var(--accent) 17%,transparent); font-size:14px; letter-spacing:.11em; }
    .act-1.conclusion-slide .title { max-width:1330px; margin-bottom:16px; font-size:clamp(44px,4.8vw,78px); line-height:.9; color:#fff; text-wrap:balance; }
    .act-1.conclusion-slide .lead { max-width:1180px; color:#c9d3df; font-size:clamp(17px,1.55vw,24px); line-height:1.28; }
    .conclusion-slide .manifest-lines { gap:8px; margin-top:18px; }
    .conclusion-slide .manifest-lines div { padding:12px 14px; border-left:3px solid color-mix(in srgb,var(--accent) 72%,white); background:rgba(255,255,255,.07); font-size:clamp(16px,1.25vw,20px); line-height:1.28; }
    .conclusion-slide .quote-box { margin-top:18px; padding:16px 20px; border-width:2px; border-color:color-mix(in srgb,var(--accent) 64%,white); background:color-mix(in srgb,var(--accent) 12%,rgba(17,23,34,.94)); box-shadow:0 24px 70px rgba(0,0,0,.40),0 0 54px color-mix(in srgb,var(--accent) 10%,transparent); }
    .conclusion-slide .quote-box p { font-size:clamp(22px,2.2vw,34px); line-height:1.13; }

    /* Сохраняем разные композиции одноимённых компонентов. */
    .act-1 .sequence { display:flex; grid-template-columns:none; flex-wrap:wrap; align-items:center; gap:12px; margin-top:30px; padding:22px; }
    .act-1 .sequence span { padding:10px 12px; border-radius:7px; color:var(--text); background:rgba(255,255,255,.07); font-weight:800; }
    .act-1 .sequence span:nth-child(even) { color:var(--subtle); background:transparent; }
    .act-1 .title { font-size:clamp(38px,5.15vw,76px); line-height:.99; letter-spacing:-.035em; font-weight:880; }
    .act-2 .title { font-size:clamp(48px,6vw,96px); line-height:.95; }
    .act-3 .title { font-size:clamp(44px,5.7vw,94px); line-height:.96; }
    .act-2.hero .title,.act-3.hero .title { font-size:clamp(58px,7.6vw,118px); }
    .act-1.hero:not(.act-opener) .title { font-size:clamp(50px,6.8vw,104px); }
    .act-3 .sequence { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; margin-top:28px; padding:0; border:0; background:transparent; box-shadow:none; }

    @media (max-width:1100px) {
      .act-3 .sequence { grid-template-columns:1fr; }
    }
    @media (max-width:900px) {
      :root { --toolbar-h:104px; }
      .toolbar { height:var(--toolbar-h); grid-template-columns:minmax(0,1fr) auto; grid-template-rows:auto auto; gap:6px 10px; padding:9px 12px; }
      .brand { grid-column:1 / -1; }
      .act-jumps { justify-self:start; }
      .controls { justify-self:end; }
      .brand-subtitle { display:none; }
      .slide { padding:28px 16px 36px; }
      .act-opener-inner { grid-template-columns:1fr; }
      .act-opener-note { display:none; }
    }
    @media (max-width:560px) {
      :root { --toolbar-h:142px; }
      .toolbar { grid-template-columns:1fr; grid-template-rows:auto auto auto; }
      .act-jumps,.controls { justify-self:stretch; justify-content:space-between; }
      .fullscreen { display:none; }
      .act-map { padding-left:30px; }
      .act-map-row.current .act-map-label { font-size:clamp(50px,18vw,84px); }
      .act-map-row.current .act-map-title { font-size:clamp(26px,9vw,42px); }
      .cover-title { font-size:clamp(46px,14vw,72px); }
      .cover-meta { gap:18px; margin-top:34px; }
    }
    @media print {
      .act-jumps { display:none!important; }
    }
`;

const output = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090c12">
  <title>От личной магии к инженерному процессу — полная презентация</title>
  <style>
${styles}
${unifiedCss}
  </style>
</head>
<body>
  <div class="shell">
    <header class="toolbar">
      <div class="brand">
        <span class="mark">M</span>
        <span class="brand-title">От личной магии к инженерному процессу</span>
        <span class="brand-subtitle">Сергей Морозов · Nord Studio · MY.GAMES</span>
      </div>
      <nav class="act-jumps" aria-label="Переход к акту">
        <button class="btn act-jump" type="button" data-act-jump="1">Акт 1</button>
        <button class="btn act-jump" type="button" data-act-jump="2">Акт 2</button>
        <button class="btn act-jump" type="button" data-act-jump="3">Акт 3</button>
      </nav>
      <nav class="controls" aria-label="Навигация по слайдам">
        <button class="btn" type="button" data-action="prev" aria-label="Назад">‹</button>
        <span class="counter" aria-live="polite">1 / 50</span>
        <button class="btn" type="button" data-action="next" aria-label="Вперёд">›</button>
        <button class="btn fullscreen" type="button" data-action="fullscreen">Экран</button>
      </nav>
    </header>
    <div class="progress" aria-hidden="true"><span></span></div>
    <main class="slides">
${coverSlide}
${slides}
    </main>
  </div>
  <script>
    const slides = Array.from(document.querySelectorAll('.slide'));
    const counter = document.querySelector('.counter');
    const progress = document.querySelector('.progress span');
    const subtitle = document.querySelector('.brand-subtitle');
    const actButtons = Array.from(document.querySelectorAll('[data-act-jump]'));
    const actTitles = { 1: 'Диагностика', 2: 'Multica', 3: 'Внедрение' };
    const actStarts = Object.fromEntries([1, 2, 3].map((act) => [act, slides.findIndex((slide) => Number(slide.dataset.act) === act)]));
    let index = 0;

    function show(next, updateHash = true) {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => slide.classList.toggle('active', slideIndex === index));
      const currentAct = Number(slides[index].dataset.act);
      counter.textContent = \`\${index + 1} / \${slides.length}\`;
      progress.style.width = \`\${((index + 1) / slides.length) * 100}%\`;
      subtitle.textContent = currentAct === 0
        ? 'Сергей Морозов · Nord Studio · MY.GAMES'
        : \`Акт \${currentAct} · \${actTitles[currentAct]}\`;
      actButtons.forEach((button) => button.setAttribute('aria-current', String(Number(button.dataset.actJump) === currentAct)));
      if (updateHash) history.replaceState(null, '', \`#slide-\${index + 1}\`);
    }

    document.querySelector('[data-action="prev"]').addEventListener('click', () => show(index - 1));
    document.querySelector('[data-action="next"]').addEventListener('click', () => show(index + 1));
    actButtons.forEach((button) => button.addEventListener('click', () => show(actStarts[Number(button.dataset.actJump)])));
    document.querySelector('[data-action="fullscreen"]').addEventListener('click', async () => {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.().catch(() => {});
      else await document.exitFullscreen?.().catch(() => {});
    });

    window.addEventListener('keydown', (event) => {
      if (event.target && ['INPUT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName)) return;
      if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); show(index + 1); }
      if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); show(index - 1); }
      if (event.key === 'Home') { event.preventDefault(); show(0); }
      if (event.key === 'End') { event.preventDefault(); show(slides.length - 1); }
      if (['1', '2', '3'].includes(event.key)) { event.preventDefault(); show(actStarts[Number(event.key)]); }
    });

    let touchX = null;
    window.addEventListener('touchstart', (event) => { touchX = event.changedTouches[0].clientX; }, { passive:true });
    window.addEventListener('touchend', (event) => {
      if (touchX === null) return;
      const dx = event.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 52) show(index + (dx < 0 ? 1 : -1));
      touchX = null;
    }, { passive:true });

    const slideHash = location.hash.match(/^#slide-(\\d+)$/);
    const actHash = location.hash.match(/^#act-(\\d)$/);
    if (slideHash) index = Math.min(slides.length - 1, Math.max(0, Number(slideHash[1]) - 1));
    else if (actHash && actStarts[Number(actHash[1])] >= 0) index = actStarts[Number(actHash[1])];
    show(index, false);
  </script>
</body>
</html>
`;

await writeFile('multica-presentation.html', output, 'utf8');
console.log(`Готово: multica-presentation.html (${output.length} символов)`);
