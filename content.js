// 会議中のURLの正規表現
const meetUrlPattern = /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/;

let captionsSaved = true; // 保存が行われたかを記録するフラグ
let currentText = ''; // 現在の字幕内容を保存/ 
let meetStartTime = null; // {meet開始時刻} に対応
let captionStartTime = null; // {字幕ログ開始時刻} 
let lastCaptionSaveTime = null; // {字幕ログ開始時刻} に対応
let captionEndTime; // {字幕ログ終了時刻} に対応

// URLの変更を監視する関数
const checkMeetingStatus = () => {
  const currentUrl = window.location.href;
  if (meetUrlPattern.test(currentUrl) && !meetStartTime) {
    meetStartTime = dateTime();
    chrome.storage.local.set({ meetStartTime }, () => { });
  }
};

// 字幕の表示を監視する関数
const monitorCaptions = () => {
  const captionsContainer = document.querySelector('div[jscontroller="KPn5nb"]');
  const captionsRegion = document.querySelector('.nMcdL.bj4p3b');
  const speakers = document.querySelectorAll('span.NWpY1d');
  const contents = document.querySelectorAll('div.bh44bd.VbkSUe');
  // console.log("captionsSaved", captionsSaved);
  if (captionsRegion) {
    // console.log('字幕が表示されました', captionsContainer.textContent, captionsContainer.textContent.length);
    captionsSaved = false;
    if (!captionStartTime) {
      captionStartTime = dateTime();
      lastCaptionSaveTime = new Date();
      captionEndTime = null;
      chrome.storage.local.set({ captionStartTime, captionEndTime }, () => { });
    };

    speakers.forEach((speaker, index) => {
      const content = contents[index];
      currentText += speaker.textContent.trim() + '\n' + content.textContent.trim()+ '\n\n';
    });
    console.log("currentText", currentText.length, currentText);
    // 10分ごとに自動保存
    if (lastCaptionSaveTime) {
      const now = new Date();
      if (now - lastCaptionSaveTime >= 10 * 60 * 1000) { // 10分(600,000ms)以上経過
        saveCaptions();
        lastCaptionSaveTime = now;
      }
    }
  } else {
    // console.log("字幕が非表示", !captionsSaved, currentText.length > 20);
    if (!captionsSaved) {
      captionEndTime = dateTime();
      chrome.storage.local.set({ captionEndTime }, () => { });
      // console.log("字幕が非表示になりました。保存します。", currentText.length);
      saveCaptions();// 字幕をファイルに保存
      captionsSaved = true;
    }
  }
}

// 字幕を保存する関数
const saveCaptions = () => {
  chrome.storage.local.get('settings', (data) => {
    let fileName, fileFormat;

      // デフォルト設定
    fileName = document.querySelector('div[jscontroller="yEvoid"]').textContent.trim() + '_' + formatDateTimeForFilename();
    fileFormat = 'text/plain';

    captionStartTime = null;
    lastCaptionSaveTime = null;
    captionEndTime = null;
    // ファイル作成
    // console.log("currentText", currentText, currentText.length);
    const blob = new Blob([currentText + '\n'], { type: fileFormat });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName; // ダウンロードするファイル名を設定
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    currentText = '';
  });
};

const dateTime = () => {
  // 現在の日付と時刻を取得
  const now = new Date();
  const year = now.getFullYear();           // 年
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 月
  const day = String(now.getDate()).padStart(2, '0');         // 日
  const hours = String(now.getHours()).padStart(2, '0');       // 時
  const minutes = String(now.getMinutes()).padStart(2, '0');   // 分
  const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;
  return formattedDateTime;
};

// 日時をファイル名用にフォーマットする関数
const formatDateTimeForFilename = () => {
  // 現在の日付と時刻を取得
  const now = new Date();
  const year = now.getFullYear();           // 年
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 月
  const day = String(now.getDate()).padStart(2, '0');         // 日
  const hours = String(now.getHours()).padStart(2, '0');       // 時
  const minutes = String(now.getMinutes()).padStart(2, '0');   // 分
  const seconds = String(now.getSeconds()).padStart(2, '0');   // 秒
  const formattedDateTime = `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
  return formattedDateTime;
};

// URL変更監視
let debounceTimer;

const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    monitorCaptions();
  }, 200);
});
observer.observe(document, { childList: true, attributes: true, subtree: true });

checkMeetingStatus(); // 初回チェック

