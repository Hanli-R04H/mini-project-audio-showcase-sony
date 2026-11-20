
(() => {
  // スクリプトが一度だけ実行されるようにする
  if (document.body.classList.contains('custom-scripts-initialized')) return;
  document.body.classList.add('custom-scripts-initialized');

  // --- 変数定義 ---
  const trackingContainerClass = '.js-aa-tracking-container';
  let lastFocusedElement;
  let spinnerShowTime = 0;
  const MIN_SPINNER_DISPLAY_TIME = 500; // 0.5 seconds

  /**
   * --- 1. Adobe Analytics クリック計測 ---
   */
  const initAnalyticsClickTracking = () => {
    document.addEventListener('click', (e) => {
      const target = e.target.closest(`${trackingContainerClass} [data-aa-click]`);
      if (!target) return;
      try {
        const val = target.dataset.aaClick;
        const s = window.s;
        if (s?.tl && typeof s.tl === 'function') {
          const original = {
            linkTrackVars: s.linkTrackVars,
            linkTrackEvents: s.linkTrackEvents,
            events: s.events,
          };
          const propKey = 'prop36';
          const eVarKey = 'eVar20';
          s.linkTrackVars = `${eVarKey},${propKey}`;
          s[eVarKey] = val;
          s[propKey] = val;
          s.tl(true, 'o', val);
          Object.assign(s, original);
        }
      } catch (err) {
        console.error('Error tracking static click:', err);
      }
    });
  };

  /**
   * --- 2. Adobe Analytics 表示計測 (共通トラッキング関数) ---
   */
  const trackView = (target) => {
    if (!target || target.dataset.aaViewTracked) {
      return;
    }
    try {
      const val = target.dataset.aaView;
      const s = window.s;
      if (s?.tl && typeof s.tl === 'function' && val) {
        const original = {
          linkTrackVars: s.linkTrackVars,
          linkTrackEvents: s.linkTrackEvents,
          events: s.events,
        };
        const propKey = 'prop38';
        const eVarKey = 'eVar23';
        s.linkTrackVars = `${eVarKey},${propKey}`;
        s[eVarKey] = val;
        s[propKey] = val;
        s.tl(true, 'o', `${val}`);
        Object.assign(s, original);
        target.dataset.aaViewTracked = 'true'; // 計測済みの目印を付ける
      }
    } catch (err) {
      console.error('Error tracking static view:', err);
    }
  };

  /**
   * --- 2a. Adobe Analytics 表示計測 (IntersectionObserver) ---
   */
  const initAnalyticsViewTracking = () => {
    let retryCount = 0;
    const maxRetries = 15;
    const setupObserver = () => {
      const s = window.s;
      if (s && typeof s.tl === 'function' && s.events === 'event4') {
        // まだ計測されていない要素のみを監視対象とする
        const viewTargets = document.querySelectorAll(`${trackingContainerClass} [data-aa-view]:not([data-aa-view-tracked="true"])`);
        if (viewTargets.length === 0) return;
        
        const observer = new IntersectionObserver((entries, observerInstance) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              trackView(entry.target);
              observerInstance.unobserve(entry.target);
            }
          });
        }, {
          threshold: 0.75
        });
        viewTargets.forEach(target => observer.observe(target));
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(setupObserver, 200);
      } else {
        console.warn('Adobe Analytics "s" object did not become ready for view tracking.');
      }
    };
    setupObserver();
  };

  /**
   * --- 2b. Adobe Analytics 表示計測 (ヒーローの初回スライドを手動で計測) ---
   */
  const trackInitialHeroSlide = () => {
    let retryCount = 0;
    const maxRetries = 15;
    const trackFirstSlide = () => {
      const s = window.s;
      if (s && typeof s.tl === 'function' && s.events === 'event4') {
        const firstSlide = document.querySelector('.hero-items .swiper-slide');
        if (firstSlide) {
          // 画面内に表示されているか簡易チェック
          const rect = firstSlide.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight && rect.bottom >= 0;
          if (isVisible) {
            trackView(firstSlide);
          }
        }
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(trackFirstSlide, 200);
      } else {
        console.warn('Adobe Analytics "s" object did not become ready for initial hero slide tracking.');
      }
    };
    // Swiperの初期化を待つために少し遅延させる
    setTimeout(trackFirstSlide, 500);
  };

  /**
   * --- 3. 動画背景の再生・停止処理 ---
   */
  const initBgVideo = () => {
    const video = document.getElementById('bg-video');
    const toggleBtn = document.getElementById('toggleBtn');
    const toggleIcon = document.getElementById('toggleIcon');

    if (!video || !toggleBtn || !toggleIcon) return;

    const playIconPath = './top/2021/img/icon_play.svg';
    const pauseIconPath = './top/2021/img/icon_pause.svg';

    toggleBtn.addEventListener('click', () => {
      const isPaused = video.paused;
      isPaused ? video.play() : video.pause();
      toggleIcon.src = isPaused ? pauseIconPath : playIconPath;
      const newLabel = isPaused ? '背景動画を停止' : '背景動画を再生';
      toggleBtn.setAttribute('aria-label', newLabel);
      toggleBtn.setAttribute('aria-pressed', !isPaused);
    });
  };

  /**
   * --- 4. 動画背景のサイズ調整 ---
   */
  const updateBgVideoSize = () => {
    const content = document.querySelector(".panels-new-contents");
    const panel = document.querySelector(".panels-new");

    if (!content || !panel) return;

    if (window.innerWidth <= 641) {
      const panelHeight = content.offsetHeight;
      const panelHeightAdjust = panelHeight * 0.02;
      const panelSize = panelHeight + panelHeightAdjust;
      panel.style.height = panelSize + "px";
    } else {
      panel.removeAttribute("style");
    }
  }

  /**
   * --- 5. カスタムモーダル処理 ---
   */
  const initCustomModal = () => {
    const modalElm = document.querySelector('.modal');
    if (!modalElm) return;

    let handleFocusTrap = null;
    const heroArrows = document.querySelectorAll('.hero-control-arrow');

    const modalInnerElm = modalElm.querySelector('.modal-movie-inner');
    const spinnerSvg = modalInnerElm ? modalInnerElm.querySelector('svg') : null;
    const spinnerElm = spinnerSvg ? spinnerSvg.parentElement : null;

    if (spinnerSvg && spinnerElm) {
      spinnerSvg.style.setProperty('position', 'absolute', 'important');
      spinnerSvg.style.setProperty('top', '50%', 'important');
      spinnerSvg.style.setProperty('left', '50%', 'important');
      spinnerSvg.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
      spinnerSvg.style.setProperty('z-index', '1', 'important');
    }

    // --- "Guard" on hero arrows ---
    const guardFocus = () => {
      if (modalElm.classList.contains('is-active')) {
        const closeButton = modalElm.querySelector('button[data-modal-close]');
        closeButton?.focus();
      }
    };

    const showModal = (movieUrl, movieTitle) => {
      if (!modalInnerElm) return;
      lastFocusedElement = document.activeElement;

      heroArrows.forEach(arrow => arrow.addEventListener('focus', guardFocus));

      if (spinnerElm) {
        spinnerElm.style.display = 'block';
        spinnerShowTime = Date.now();
      }

      modalElm.dataset.customModal = 'true';

      const iframeElm = document.createElement('iframe');
      let url = movieUrl;
      
      if (url.includes('?')) {
        url += '&enablejsapi=1&autoplay=0';
      } else {
        url += '?enablejsapi=1&autoplay=0';
      }
      iframeElm.src = url;
      iframeElm.dataset.src = url;
      iframeElm.title = movieTitle || 'Video player';
      iframeElm.setAttribute('frameborder', '0');
      iframeElm.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframeElm.setAttribute('allowfullscreen', true);
      iframeElm.classList.add('lazyload');

      iframeElm.onload = () => {
        if (spinnerElm) {
          const timeElapsed = Date.now() - spinnerShowTime;
          const delay = Math.max(0, MIN_SPINNER_DISPLAY_TIME - timeElapsed);
          setTimeout(() => {
            spinnerElm.style.display = 'none';
          }, delay);
        }
      };

      if (spinnerElm) {
        modalInnerElm.insertBefore(iframeElm, spinnerElm);
      } else {
        modalInnerElm.appendChild(iframeElm);
      }

      modalElm.classList.add('fade-enter');
      modalElm.classList.add('is-active');

      const closeButton = modalElm.querySelector('button[data-modal-close]');
      
      setTimeout(() => {
        modalElm.classList.add('fade-enter-active');
        modalElm.classList.remove('fade-enter');
        
        if (window.lazySizes && window.lazySizes.loader) {
          window.lazySizes.loader.unveil(iframeElm);
        }

        closeButton?.focus();

        // --- Focus Trap Start ---
        const focusableElements = [
          modalElm.querySelector('iframe'),
          modalElm.querySelector('button[data-modal-close]')
        ].filter(Boolean);

        if (focusableElements.length > 1) {
          const firstFocusableElement = focusableElements[0];
          const lastFocusableElement = focusableElements[1];

          const attemptFocus = (element) => {
            if (element && element.tagName === 'IFRAME') {
              try { element.contentWindow.focus(); } catch (e) { element.focus(); }
            } else if (element) {
              element.focus();
            }
          };

          handleFocusTrap = (event) => {
            if (event.key !== 'Tab') return;

            if (event.shiftKey) {
              if (document.activeElement === firstFocusableElement) {
                event.preventDefault();
                attemptFocus(lastFocusableElement);
              }
            } else {
              if (document.activeElement === lastFocusableElement) {
                event.preventDefault();
                attemptFocus(firstFocusableElement);
              }
            }
          };
          document.addEventListener('keydown', handleFocusTrap, true);
        }
        // --- Focus Trap End ---
      }, 150);
    };

    const closeModal = () => {
      heroArrows.forEach(arrow => arrow.removeEventListener('focus', guardFocus));

      if (handleFocusTrap) {
        document.removeEventListener('keydown', handleFocusTrap, true);
        handleFocusTrap = null;
      }

      const cleanup = (e) => {
        if (e.propertyName === 'opacity') {
          modalElm.removeEventListener('transitionend', cleanup);
          
          const iframeElm = modalElm.querySelector('iframe');
          if (iframeElm) iframeElm.parentNode.removeChild(iframeElm);
          
          modalElm.classList.remove('is-active');
          modalElm.classList.remove('fade-enter');
          modalElm.classList.remove('fade-enter-active');
          delete modalElm.dataset.customModal;
          
          lastFocusedElement?.focus();
        }
      };

      modalElm.addEventListener('transitionend', cleanup);
      modalElm.classList.add('fade-enter');
      
      setTimeout(() => {
        modalElm.classList.remove('fade-enter-active');
      }, 100);
    };

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('.js-custom-modal-trigger');
      if (trigger) {
        event.preventDefault();
        const hasYouTubeConsent = () => typeof OnetrustActiveGroups !== 'undefined' && OnetrustActiveGroups.indexOf('C0004') > -1;
        if (trigger.dataset.movie && trigger.dataset.movie.includes('youtube.com') && !hasYouTubeConsent()) {
          return;
        }
        const movieUrl = trigger.dataset.movie;
        const movieTitle = trigger.dataset.movieTitle;
        if (movieUrl) showModal(movieUrl, movieTitle);
        return;
      }

      const closeTrigger = event.target.closest('[data-modal-close]');
      if (closeTrigger && modalElm.dataset.customModal === 'true') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeModal();
      }
    }, true);

    document.addEventListener('keyup', (event) => {
      if (event.key === 'Escape' && modalElm.dataset.customModal === 'true') {
        closeModal();
      }
    });
  };
  
  /**
   * --- 6. CEVエリア YouTubeサムネイル画像 再生ボタン追加 ---
   */
  const initVideoIcons = () => {
    const videoLinks = document.querySelectorAll('a.panels-new-image[data-movie]');
    videoLinks.forEach(link => {
      link.classList.add('has-video');
    })
  }

  /**
   * --- 初期化処理 ---
   * DOMの読み込み完了後に、全ての初期化関数を呼び出します。
   */
  const onDomReady = () => {
    initAnalyticsClickTracking();
    trackInitialHeroSlide();
    initAnalyticsViewTracking();
    initBgVideo();
    updateBgVideoSize();
    initCustomModal();
    initVideoIcons();

    // リサイズとスクロールのイベントリスナーを設定
    window.addEventListener("resize", updateBgVideoSize);
    window.addEventListener("scroll", updateBgVideoSize);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDomReady);
  } else {
    onDomReady();
  }

})();