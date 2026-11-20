/**
 * YouTube Cookie Consent Control
 * Integrated version for Top Page
 */
(function() {
  'use strict';
  
  const COOKIE_CATEGORY_YOUTUBE = 'C0004';
  let panelsData = null;
  
  // Cookie同意チェック
  function hasYouTubeConsent() {
    if (typeof OnetrustActiveGroups === 'undefined') return false;
    return OnetrustActiveGroups.indexOf(COOKIE_CATEGORY_YOUTUBE) > -1;
  }
  
  // YouTube動画IDの抽出
  function getVideoId(url) {
    const match = url.match(/embed\/([^?]+)/);
    return match ? match[1] : null;
  }
  
  // Panelsデータの読み込み
  function loadPanelsData() {
    fetch('./top/2021/data/items.json')
      .then(response => response.json())
      .then(data => {
        panelsData = data;
      })
      .catch(err => console.error('[YT Control] Failed to load panels data:', err));
  }
  
  // PanelデータからmovieURLを検索
  function findMovieUrlFromData(panelId) {
    if (!panelsData) return null;
    
    for (const block of panelsData.blocks) {
      for (const panel of block.panels) {
        const imageId = panel.image_s 
          ? panel.image_s.replace(/_image_s\.jpg$/, '').replace(/\.(png|jpg|gif|webp|avif)$/, '') 
          : null;
        if (imageId === panelId && panel.movie) {
          return panel.movie;
        }
      }
    }
    return null;
  }

  // Adobe Analytics クリックトラッキング共通処理
  function trackYouTubeClick(trackingValue) {
    if (!trackingValue) return;

    try {
      const s = window.s;
      if (s?.tl && typeof s.tl === 'function') {
        const original = { linkTrackVars: s.linkTrackVars, linkTrackEvents: s.linkTrackEvents, events: s.events };
        const propKey = 'prop36';
        const eVarKey = 'eVar20';
        s.linkTrackVars = `${eVarKey},${propKey}`;
        s[eVarKey] = trackingValue;
        s[propKey] = trackingValue;
        s.tl(true, 'o', trackingValue);
        Object.assign(s, original);
      }
    } catch (err) {
      console.error('[YT Control] Error tracking click:', err);
    }
  }
  
  // data-movie属性を持つ要素の動画リンク制御
  function handleVideoLinkClick(e) {
    const link = e.currentTarget;
    const videoUrl = link.getAttribute('data-movie');
    
    if (!videoUrl || !videoUrl.includes('youtube.com')) return;
    
    if (!hasYouTubeConsent()) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Adobe Analytics トラッキング処理を共通関数で呼び出し
      const val = link.dataset.aaClick;
      trackYouTubeClick(val);

      const videoId = getVideoId(videoUrl);
      if (videoId) {
        window.open('https://www.youtube.com/watch?v=' + videoId, '_blank');
      }
      return false;
    }
  }
  
  // Panelセクションのクリック制御
  function handlePanelClick(event) {
    const hasConsent = hasYouTubeConsent();
    
    if (hasConsent) return;
    
    const panel = event.target.closest('.panel');
    if (!panel) return;
    
    const panelId = panel.id;
    if (!panelId) return;
    
    const movieUrl = findMovieUrlFromData(panelId);
    if (!movieUrl) return;

    // クリックされた要素が記事リンク（a.panel-title-link）の場合、処理を中断してデフォルトのリンク遷移を許可
    if (event.target.tagName === 'A' && event.target.classList.contains('panel-title-link')) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    // Adobe Analytics トラッキング処理を共通関数で呼び出し
    const clickableElement = panel.querySelector('[data-aa-click]');
    const val = clickableElement ? clickableElement.dataset.aaClick : null;
    trackYouTubeClick(val);

    const videoId = getVideoId(movieUrl);
    if (videoId) {
      window.open('https://www.youtube.com/watch?v=' + videoId, '_blank');
    }
  }
  
  // 動画リンクの初期化
  function initVideoLinks() {
    const videoLinks = document.querySelectorAll('[data-movie*="youtube.com"]');
    videoLinks.forEach(function(link) {
      link.removeEventListener('click', handleVideoLinkClick, true);
      link.addEventListener('click', handleVideoLinkClick, true);
    });
  }
  
  // 初期化
  function init() {
    loadPanelsData();
    initVideoLinks();
    document.addEventListener('click', handlePanelClick, true);
  }
  
  // DOM読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Cookie設定変更時の再初期化
  window.addEventListener('OneTrustGroupsUpdated', function() {
    initVideoLinks();
  });
})();
