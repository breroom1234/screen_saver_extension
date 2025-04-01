// DOM要素
const extensionToggle = document.getElementById('extensionToggle');
const siteUrlInput = document.getElementById('siteUrl');
const siteNameInput = document.getElementById('siteName');
const addSiteButton = document.getElementById('addSite');
const blockedSitesList = document.getElementById('blockedSitesList');
const shortsToggle = document.getElementById('shortsToggle');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const addTimeRangeButton = document.getElementById('addTimeRange');
const timeRangesList = document.getElementById('timeRangesList');
const hoursInput = document.getElementById('hours');
const minutesInput = document.getElementById('minutes');
const addDurationButton = document.getElementById('addDuration');
const durationList = document.getElementById('durationList');

// タブ切り替え
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const tabId = button.dataset.tab;
    
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.add('hidden');
    });
    
    button.classList.add('active');
    document.getElementById(tabId).classList.remove('hidden');
  });
});

// 拡張機能の有効/無効切り替え
extensionToggle.addEventListener('change', () => {
  chrome.runtime.sendMessage({
    action: 'toggleExtension',
    value: extensionToggle.checked
  });
  showStatus('設定を保存しました');
});

// サイトのブロックリストへの追加
addSiteButton.addEventListener('click', () => {
  const url = siteUrlInput.value.trim();
  const name = siteNameInput.value.trim();
  
  if (!url || !name) {
    showStatus('URLとサイト名を入力してください', true);
    return;
  }

  chrome.runtime.sendMessage({
    action: 'addBlockedSite',
    site: { url, name }
  });

  siteUrlInput.value = '';
  siteNameInput.value = '';
  updateBlockedSitesList();
  showStatus('サイトをブロックリストに追加しました');
});

// YouTube Shortsのブロック切り替え
shortsToggle.addEventListener('change', () => {
  chrome.runtime.sendMessage({
    action: 'toggleShorts',
    value: shortsToggle.checked
  });
  showStatus('YouTube Shorts設定を保存しました');
});

// 時間帯ブロックの追加
addTimeRangeButton.addEventListener('click', () => {
  const startTime = startTimeInput.value;
  const endTime = endTimeInput.value;
  
  if (!startTime || !endTime) {
    showStatus('開始時刻と終了時刻を入力してください', true);
    return;
  }

  chrome.runtime.sendMessage({
    action: 'addTimeRange',
    timeRange: { startTime, endTime }
  });

  startTimeInput.value = '';
  endTimeInput.value = '';
  updateTimeRangesList();
  showStatus('時間帯ブロックを追加しました');
});

// 期間ブロックの追加
addDurationButton.addEventListener('click', () => {
  const hours = parseInt(hoursInput.value) || 0;
  const minutes = parseInt(minutesInput.value) || 0;
  const duration = hours * 60 + minutes;
  
  if (duration <= 0) {
    showStatus('有効な時間を入力してください', true);
    return;
  }

  chrome.runtime.sendMessage({
    action: 'addDurationBlock',
    duration
  });

  hoursInput.value = '';
  minutesInput.value = '';
  updateDurationList();
  showStatus('期間ブロックを設定しました');
});

// ブロックサイトリストの更新
function updateBlockedSitesList() {
  chrome.runtime.sendMessage({ action: 'getState' }, (state) => {
    blockedSitesList.innerHTML = '';
    state.blockedSites.forEach(site => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${site.name} (${site.url})</span>
        <button class="remove-site" data-url="${site.url}">削除</button>
      `;
      blockedSitesList.appendChild(li);
    });

    // 削除ボタンのイベントリスナー
    document.querySelectorAll('.remove-site').forEach(button => {
      button.addEventListener('click', () => {
        const url = button.dataset.url;
        chrome.runtime.sendMessage({
          action: 'removeBlockedSite',
          url
        });
        updateBlockedSitesList();
        showStatus('サイトをブロックリストから削除しました');
      });
    });
  });
}

// 時間帯リストの更新
function updateTimeRangesList() {
  chrome.runtime.sendMessage({ action: 'getState' }, (state) => {
    timeRangesList.innerHTML = '';
    state.timeRanges.forEach(range => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${range.startTime} から ${range.endTime}</span>
        <button class="remove-time-range" data-start="${range.startTime}" data-end="${range.endTime}">削除</button>
      `;
      timeRangesList.appendChild(li);
    });

    // 削除ボタンのイベントリスナー
    document.querySelectorAll('.remove-time-range').forEach(button => {
      button.addEventListener('click', () => {
        const timeRange = {
          startTime: button.dataset.start,
          endTime: button.dataset.end
        };
        chrome.runtime.sendMessage({
          action: 'removeTimeRange',
          timeRange
        });
        updateTimeRangesList();
        showStatus('時間帯ブロックを削除しました');
      });
    });
  });
}

// 期間ブロックリストの更新
function updateDurationList() {
  chrome.runtime.sendMessage({ action: 'getState' }, (state) => {
    durationList.innerHTML = '';
    state.durationBlocks.forEach(block => {
      const endTime = new Date(block.endTime);
      const li = document.createElement('li');
      li.innerHTML = `
        <span>終了時刻: ${endTime.toLocaleString()}</span>
        <button class="remove-duration" data-id="${block.id}">解除</button>
      `;
      durationList.appendChild(li);
    });

    // 解除ボタンのイベントリスナー
    document.querySelectorAll('.remove-duration').forEach(button => {
      button.addEventListener('click', () => {
        const blockId = button.dataset.id;
        chrome.runtime.sendMessage({
          action: 'removeDurationBlock',
          blockId
        });
        updateDurationList();
        showStatus('期間ブロックを解除しました');
      });
    });
  });
}

// ステータスメッセージの表示
function showStatus(message, isError = false) {
  const statusElement = document.getElementById('status-message');
  statusElement.textContent = message;
  statusElement.style.backgroundColor = isError ? '#f44336' : '#4CAF50';
  statusElement.classList.add('show');
  
  setTimeout(() => {
    statusElement.classList.remove('show');
  }, 3000);
}

// 初期状態の読み込み
document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.sendMessage({ action: 'getState' }, (state) => {
    extensionToggle.checked = state.isEnabled;
    shortsToggle.checked = state.shortsBlocked;
    updateBlockedSitesList();
    updateTimeRangesList();
    updateDurationList();
  });
}); 