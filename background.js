// 拡張機能の状態管理
let state = {
  isEnabled: true,
  blockedSites: [],
  timeRanges: [],
  durationBlocks: [],
  shortsBlocked: false
};

// 初期化処理
const initialize = () => {
  chrome.storage.sync.get({
    isEnabled: true,
    blockedSites: [],
    timeRanges: [],
    durationBlocks: [],
    shortsBlocked: false
  }, (result) => {
    state = { ...result };
    console.log('初期化完了:', state);
  });
};

// Service Worker起動時の初期化
initialize();

// ナビゲーション時のブロックチェック
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (!state.isEnabled || details.frameId !== 0) return;

  const url = new URL(details.url);
  const shouldBlock = checkIfShouldBlock(url);

  if (shouldBlock) {
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL('blocked.html')
    });
  }
});

// URLがブロック対象かチェック
function checkIfShouldBlock(url) {
  // YouTube Shortsのブロックチェック
  if (state.shortsBlocked && url.hostname === 'www.youtube.com' && url.pathname.startsWith('/shorts')) {
    return true;
  }

  // ブロックリストのチェック
  const isBlockedSite = state.blockedSites.some(site => url.hostname.includes(site.url));
  if (!isBlockedSite) return false;

  // 時間帯ブロックのチェック
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const isInBlockedTimeRange = state.timeRanges.some(range => {
    const start = range.startTime.split(':').map(Number);
    const end = range.endTime.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    return currentTime >= startMinutes && currentTime <= endMinutes;
  });

  if (isInBlockedTimeRange) return true;

  // 期間ブロックのチェック
  const hasActiveDurationBlock = state.durationBlocks.some(block => {
    return now < new Date(block.endTime);
  });

  return hasActiveDurationBlock;
}

// アラーム処理（期間ブロック用）
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('duration_')) {
    const blockId = alarm.name.split('_')[1];
    removeDurationBlock(blockId);
  }
});

// 期間ブロックの削除
function removeDurationBlock(blockId) {
  state.durationBlocks = state.durationBlocks.filter(block => block.id !== blockId);
  chrome.storage.sync.set({ durationBlocks: state.durationBlocks });
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'toggleExtension':
      state.isEnabled = request.value;
      chrome.storage.sync.set({ isEnabled: state.isEnabled });
      break;

    case 'addBlockedSite':
      state.blockedSites.push(request.site);
      chrome.storage.sync.set({ blockedSites: state.blockedSites });
      break;

    case 'removeBlockedSite':
      state.blockedSites = state.blockedSites.filter(site => site.url !== request.url);
      chrome.storage.sync.set({ blockedSites: state.blockedSites });
      break;

    case 'toggleShorts':
      state.shortsBlocked = request.value;
      chrome.storage.sync.set({ shortsBlocked: state.shortsBlocked });
      break;

    case 'addTimeRange':
      state.timeRanges.push(request.timeRange);
      chrome.storage.sync.set({ timeRanges: state.timeRanges });
      break;

    case 'removeTimeRange':
      state.timeRanges = state.timeRanges.filter(range => 
        range.startTime !== request.timeRange.startTime || 
        range.endTime !== request.timeRange.endTime
      );
      chrome.storage.sync.set({ timeRanges: state.timeRanges });
      break;

    case 'addDurationBlock':
      const blockId = Date.now().toString();
      const endTime = new Date(Date.now() + request.duration * 60000);
      state.durationBlocks.push({ id: blockId, endTime });
      chrome.storage.sync.set({ durationBlocks: state.durationBlocks });
      chrome.alarms.create(`duration_${blockId}`, {
        when: endTime.getTime()
      });
      break;

    case 'removeDurationBlock':
      removeDurationBlock(request.blockId);
      break;

    case 'getState':
      sendResponse(state);
      return true; // 非同期レスポンスのために必要
  }
}); 