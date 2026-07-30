
    (() => {
      const sourceNav = document.querySelector('[data-toc-source]');
      const drawer = document.getElementById('toc-drawer');
      const destination = document.querySelector('[data-toc-destination]');
      const fab = document.querySelector('.toc-fab');
      const closeButton = document.querySelector('[data-toc-close]');
      const desktopHide = document.querySelector('[data-toc-desktop-hide]');
      const desktopShow = document.querySelector('[data-toc-desktop-show]');
      const desktopToc = document.getElementById('desktop-toc');
      const desktopBreakpoint = window.matchMedia('(max-width: 1280px)');
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

      if (sourceNav && destination) {
        const clone = sourceNav.cloneNode(true);
        clone.removeAttribute('data-toc-source');
        destination.appendChild(clone);
      }

      const openDrawer = () => {
        if (!drawer) return;
        if (typeof drawer.showModal === 'function' && !drawer.open) drawer.showModal();
        else drawer.setAttribute('open', '');
        fab?.setAttribute('aria-expanded', 'true');
      };
      const closeDrawer = () => {
        if (!drawer) return;
        if (typeof drawer.close === 'function' && drawer.open) drawer.close();
        else drawer.removeAttribute('open');
        fab?.setAttribute('aria-expanded', 'false');
      };
      fab?.addEventListener('click', openDrawer);
      closeButton?.addEventListener('click', closeDrawer);
      drawer?.addEventListener('close', () => fab?.setAttribute('aria-expanded', 'false'));

      const syncDesktopTocState = collapsed => {
        document.body.classList.toggle('toc-collapsed', collapsed && !desktopBreakpoint.matches);
        const panelHidden = collapsed || desktopBreakpoint.matches;
        if (panelHidden && desktopToc?.contains(document.activeElement)) {
          (desktopBreakpoint.matches ? fab : desktopShow)?.focus();
        }
        desktopToc?.toggleAttribute('inert', panelHidden);
        desktopToc?.setAttribute('aria-hidden', String(panelHidden));
        desktopHide?.setAttribute('aria-expanded', String(!panelHidden));
        desktopShow?.setAttribute('aria-expanded', String(!panelHidden));
      };
      const readDesktopTocState = () => {
        try { const saved = localStorage.getItem('ai-company-toc-collapsed'); return saved === null ? true : saved === '1'; }
        catch (_) { return true; }
      };
      const writeDesktopTocState = collapsed => {
        try { localStorage.setItem('ai-company-toc-collapsed', collapsed ? '1' : '0'); }
        catch (_) {}
      };
      let tocCollapsed = readDesktopTocState();
      const setDesktopToc = collapsed => {
        tocCollapsed = collapsed;
        writeDesktopTocState(collapsed);
        syncDesktopTocState(collapsed);
      };
      desktopHide?.addEventListener('click', () => setDesktopToc(true));
      desktopShow?.addEventListener('click', () => {
        setDesktopToc(false);
        desktopHide?.focus();
      });
      const syncForViewport = () => syncDesktopTocState(tocCollapsed);
      if (typeof desktopBreakpoint.addEventListener === 'function') desktopBreakpoint.addEventListener('change', syncForViewport);
      else if (typeof desktopBreakpoint.addListener === 'function') desktopBreakpoint.addListener(syncForViewport);
      syncForViewport();
      drawer?.addEventListener('click', event => {
        if (event.target === drawer) closeDrawer();
        if (event.target.closest('a[href^="#"]')) closeDrawer();
      });

      // A long smooth scroll through forty screens feels like broken navigation.
      // TOC links therefore jump immediately; normal links elsewhere keep the page's smooth behavior.
      document.addEventListener('click', event => {
        const link = event.target.closest('.toc-tree a[href^="#"]');
        if (!link) return;
        const hash = link.getAttribute('href');
        const target = hash && document.querySelector(hash);
        if (!target) return;
        event.preventDefault();
        closeDrawer();
        const root = document.documentElement;
        const previousBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        target.scrollIntoView({ block: 'start' });
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        requestAnimationFrame(() => { root.style.scrollBehavior = previousBehavior; });
        history.pushState(null, '', hash);
      });

      const allTocLinks = () => [...document.querySelectorAll('.toc-tree a[href^="#"]')];
      const progressLabels = [...document.querySelectorAll('[data-toc-progress], [data-fab-progress]')];
      const currentLabels = [...document.querySelectorAll('[data-toc-current]')];
      let currentId = '';

      const setActive = id => {
        if (!id || id === currentId) return;
        currentId = id;
        const links = allTocLinks();
        let activeText = 'Статья';
        links.forEach(link => {
          const active = link.getAttribute('href') === `#${id}`;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
          if (active) {
            activeText = link.querySelector('b')?.textContent?.trim() || link.textContent.trim();
            const railTree = link.closest('.rail .toc-tree');
            if (railTree) {
              const linkTop = link.offsetTop;
              const linkBottom = linkTop + link.offsetHeight;
              const visibleTop = railTree.scrollTop;
              const visibleBottom = visibleTop + railTree.clientHeight;
              if (linkTop < visibleTop + 18 || linkBottom > visibleBottom - 18) {
                railTree.scrollTo({
                  top: Math.max(0, linkTop - railTree.clientHeight * 0.42),
                  behavior: reducedMotion.matches ? 'auto' : 'smooth'
                });
              }
            }
          }
        });
        currentLabels.forEach(label => label.textContent = activeText);
      };

      const tracked = [...new Set(allTocLinks().map(link => link.getAttribute('href')).filter(Boolean))]
        .map(hash => document.querySelector(hash))
        .filter(Boolean);

      // Pick the latest heading whose top has crossed a stable reading line.
      // Unlike an IntersectionObserver on nested sections, this cannot get stuck on the giant <main id="article"> target.
      let tocTicking = false;
      const updateActiveSection = () => {
        const readingLine = Math.max(118, innerHeight * 0.23);
        let activeId = tracked[0]?.id || 'article';
        for (const target of tracked) {
          if (target.getBoundingClientRect().top <= readingLine) activeId = target.id;
          else break;
        }
        setActive(activeId);
        tocTicking = false;
      };
      const scheduleActiveSection = () => {
        if (tocTicking) return;
        tocTicking = true;
        requestAnimationFrame(updateActiveSection);
      };
      scheduleActiveSection();
      addEventListener('scroll', scheduleActiveSection, { passive: true });
      addEventListener('resize', scheduleActiveSection, { passive: true });

      const updateDetailedProgress = () => {
        const doc = document.documentElement;
        const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
        const value = Math.round(Math.min(1, Math.max(0, doc.scrollTop / max)) * 100);
        progressLabels.forEach(label => label.textContent = `${value}%`);
      };
      updateDetailedProgress();
      addEventListener('scroll', updateDetailedProgress, { passive: true });
      addEventListener('resize', updateDetailedProgress, { passive: true });

      // The image has an inline onerror fallback; successful local assets stay visible.
    })();
  