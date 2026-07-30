
    (() => {
      const bar = document.querySelector('.progress > span');
      const updateProgress = () => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        const ratio = max > 0 ? doc.scrollTop / max : 0;
        bar.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
      };
      updateProgress();
      addEventListener('scroll', updateProgress, { passive: true });
      addEventListener('resize', updateProgress, { passive: true });

      const reveals = [...document.querySelectorAll('.reveal')];
      if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              revealObserver.unobserve(entry.target);
            }
          });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        reveals.forEach(el => revealObserver.observe(el));
      } else {
        reveals.forEach(el => el.classList.add('visible'));
      }

      // Detailed active-section tracking is handled by the V2 navigation script below.
    })();
  