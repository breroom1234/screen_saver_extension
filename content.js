// YouTube Shorts関連の要素を非表示にする機能
function hideYouTubeShorts() {
  // スタイルを追加
  const style = document.createElement('style');
  style.textContent = `
    /* ホーム画面のShortsセクション */
    ytd-rich-shelf-renderer[is-shorts],
    ytd-reel-shelf-renderer,
    ytd-rich-section-renderer,
    /* サイドバーのShortsボタン */
    ytd-guide-entry-renderer a[title="Shorts"],
    ytd-mini-guide-entry-renderer a[title="Shorts"],
    /* 検索結果のShorts */
    ytd-video-renderer:has(a[href*="/shorts/"]),
    /* チャンネルページのShortsタブ */
    tp-yt-paper-tab:has(#endpoint[title="Shorts"]),
    yt-tab-shape:has(a[href*="/shorts"]),
    /* ホーム画面のShortsの縦スクロールコンテナ */
    ytd-rich-grid-row:has(ytd-rich-item-renderer a[href*="/shorts/"]),
    /* 関連動画のShorts */
    ytd-compact-video-renderer:has(a[href*="/shorts/"]),
    /* モバイル版のShortsセクション */
    ytm-rich-section-renderer:has(a[href*="/shorts/"]),
    /* Shortsプレイヤーページ */
    ytd-reel-video-renderer,
    ytd-shorts,
    /* その他のShortsコンテナ */
    [is-shorts],
    [data-is-shorts],
    [layout="shorts"],
    [page-subtype="shorts"] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  // 動的に追加される要素に対応するためのMutationObserver
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // 要素ノードの場合のみ
          // Shorts関連の属性を持つ要素を非表示
          if (node.hasAttribute('is-shorts') ||
              node.hasAttribute('data-is-shorts') ||
              node.getAttribute('layout') === 'shorts' ||
              node.getAttribute('page-subtype') === 'shorts') {
            node.style.display = 'none';
          }
          
          // href属性にshortsを含むリンクの親要素を非表示
          const shortsLinks = node.querySelectorAll('a[href*="/shorts/"]');
          shortsLinks.forEach(link => {
            let parent = link.closest('ytd-video-renderer, ytd-compact-video-renderer, ytd-rich-item-renderer');
            if (parent) {
              parent.style.display = 'none';
            }
          });
        }
      });
    });
  });

  // オブザーバーの設定
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// YouTube Shortsのブロック状態を確認
function checkShortsBlockStatus() {
  chrome.runtime.sendMessage({ action: 'getState' }, (state) => {
    if (state && state.shortsBlocked) {
      hideYouTubeShorts();
    }
  });
}

// ページ読み込み時にチェック
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkShortsBlockStatus);
} else {
  checkShortsBlockStatus();
}

// 設定変更を監視
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleShorts') {
    if (request.value) {
      hideYouTubeShorts();
    } else {
      // ページをリロードして元に戻す
      window.location.reload();
    }
  }
}); 