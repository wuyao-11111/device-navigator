const DEFAULT_URL = 'https://oms.emaldo.com/#/0/_/CXRqKjx2MzSAkdyucR9NDyPiiQR2vQcQ/devices/detail/zAguuHSbn7OcLvOc';
const UPDATE_REPOSITORY = 'wuyao-11111/device-navigator';

const deviceHeading = document.querySelector('#deviceHeading');
const deviceMeta = document.querySelector('#deviceMeta');
const deviceDot = document.querySelector('#deviceDot');
const copyIdButton = document.querySelector('#copyIdButton');
const openAllButton = document.querySelector('#openAllButton');
const readClipboardButton = document.querySelector('#readClipboardButton');
const quickButtons = [...document.querySelectorAll('.quick-action')];
const footerMessage = document.querySelector('#footerMessage');
const versionChip = document.querySelector('#versionChip');
const updateButton = document.querySelector('#updateButton');
const updateLink = document.querySelector('#updateLink');

let currentDevice = null;

function compareVersions(left, right) {
  const leftParts = left.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] || 0;
    const rightPart = rightParts[index] || 0;
    if (leftPart !== rightPart) return leftPart > rightPart ? 1 : -1;
  }
  return 0;
}

async function checkForUpdates({ manual = false } = {}) {
  const currentVersion = chrome.runtime.getManifest().version;
  versionChip.textContent = `v${currentVersion}`;
  updateLink.hidden = true;
  if (!UPDATE_REPOSITORY) {
    if (manual) footerMessage.textContent = '未配置更新源';
    return false;
  }

  if (manual) {
    updateButton.disabled = true;
    updateButton.classList.add('checking');
    footerMessage.textContent = '正在检查更新...';
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${UPDATE_REPOSITORY}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const release = await response.json();
    const latestVersion = String(release.tag_name || '').replace(/^v/, '');
    if (!latestVersion || compareVersions(latestVersion, currentVersion) <= 0) {
      if (manual) footerMessage.textContent = '已是最新版本';
      return false;
    }
    updateLink.href = release.html_url || `https://github.com/${UPDATE_REPOSITORY}/releases/latest`;
    updateLink.textContent = `更新到 v${latestVersion}`;
    updateLink.hidden = false;
    footerMessage.textContent = '发现新版本';
    return true;
  } catch (error) {
    if (manual) footerMessage.textContent = '检查更新失败，请稍后重试';
    return false;
  } finally {
    if (manual) {
      updateButton.disabled = false;
      updateButton.classList.remove('checking');
    }
  }
}

function setState(state) {
  deviceDot.dataset.state = state === 'ready' ? 'ready' : 'idle';
}

function normalizeInput(value) {
  return value.trim().replace(/[\u0000-\u001f]/g, '');
}

function parseDevice(value) {
  const input = normalizeInput(value);
  if (!input) return null;

  // The device id is the segment immediately after /devices/detail/.
  const marker = '/devices/detail/';
  const markerIndex = input.indexOf(marker);
  if (markerIndex >= 0) {
    const beforeMarker = input.slice(0, markerIndex);
    const idAndSuffix = input.slice(markerIndex + marker.length);
    const id = idAndSuffix.split(/[/?#\s]/, 1)[0];
    if (!id) return null;
    const base = `${beforeMarker}${marker}${id}`;
    if (!/^https?:\/\/[^/]+\/#[^\s]+/.test(base)) return null;
    return { id, base };
  }

  // Also accept a raw id copied without its surrounding URL.
  if (/^[A-Za-z0-9_-]{6,}$/.test(input)) {
    return { id: input, base: `${DEFAULT_URL.split('/devices/detail/')[0]}${marker}${input}` };
  }

  return null;
}

function buildPages(device) {
  return {
    home: device.base,
    info: `${device.base}/info`,
    stats: `${device.base}/stats`,
  };
}

function renderDevice(value, options = {}) {
  const parsed = parseDevice(value);
  currentDevice = parsed;

  if (!parsed) {
    setState(value.trim() ? 'error' : 'idle');
    deviceHeading.textContent = '未识别';
    deviceMeta.textContent = value.trim() ? '剪贴板内容不包含有效设备 ID' : '请先复制一个设备链接或设备 ID';
    copyIdButton.disabled = true;
    openAllButton.disabled = true;
    quickButtons.forEach((button) => { button.disabled = true; });
    if (options.message) footerMessage.textContent = options.message;
    return;
  }

  setState('ready');
  deviceHeading.textContent = parsed.id;
  deviceMeta.textContent = '链接有效，可选择要打开的页面';
  copyIdButton.disabled = false;
  openAllButton.disabled = false;
  quickButtons.forEach((button) => { button.disabled = false; });
  if (options.message) footerMessage.textContent = options.message;
}

async function readClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      renderDevice('', { message: '剪贴板为空' });
      return false;
    }
    renderDevice(text, { message: '已从剪贴板读取' });
    return Boolean(currentDevice);
  } catch (error) {
    setState('error');
    deviceMeta.textContent = '请允许插件读取剪贴板后重试';
    footerMessage.textContent = '读取剪贴板失败';
    return false;
  }
}

async function copyDeviceId() {
  if (!currentDevice) return;
  try {
    await navigator.clipboard.writeText(currentDevice.id);
    footerMessage.textContent = '设备 ID 已复制';
    copyIdButton.classList.add('copied');
    window.setTimeout(() => copyIdButton.classList.remove('copied'), 900);
  } catch (error) {
    footerMessage.textContent = '复制失败，请手动选择设备 ID';
  }
}

function openPage(page) {
  if (!currentDevice) return;
  const url = buildPages(currentDevice)[page];
  chrome.tabs.create({ url });
  const labels = { home: '首页', info: '设备信息', stats: '状态' };
  footerMessage.textContent = `已在新标签页打开${labels[page]}`;
}

function openAllPages() {
  if (!currentDevice) return;
  const pages = buildPages(currentDevice);
  Object.values(pages).forEach((url) => chrome.tabs.create({ url }));
  footerMessage.textContent = '已打开 3 个新标签页';
}

readClipboardButton.addEventListener('click', readClipboard);
copyIdButton.addEventListener('click', copyDeviceId);
openAllButton.addEventListener('click', openAllPages);
quickButtons.forEach((button) => button.addEventListener('click', () => openPage(button.dataset.page)));
updateButton.addEventListener('click', () => checkForUpdates({ manual: true }));

renderDevice('', { message: '正在读取剪贴板...' });
readClipboard();
checkForUpdates();
