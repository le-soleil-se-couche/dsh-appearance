/** Localized copy for the first-class Appearance section. */

export type SkinCenterKey =
  | 'title'
  | 'navLabel'
  | 'description'
  | 'import'
  | 'copy'
  | 'copySuccess'
  | 'copyFailed'
  | 'importSuccess'
  | 'importRejected'
  | 'importModalTitle'
  | 'importModalDescription'
  | 'importPasteLabel'
  | 'cancel'
  | 'close'
  | 'saveFailed'
  | 'storedInvalid'
  | 'storageUnavailable'
  | 'themeTitle'
  | 'themeDescription'
  | 'themeSystem'
  | 'themeLight'
  | 'themeDark'
  | 'themeFailed'
  | 'colorsTitle'
  | 'colorsDescription'
  | 'lightPalette'
  | 'darkPalette'
  | 'accent'
  | 'background'
  | 'foreground'
  | 'colorInvalid'
  | 'fontsTitle'
  | 'fontsDescription'
  | 'uiFont'
  | 'codeFont'
  | 'uiFallback'
  | 'codeFallback'
  | 'fontListIdle'
  | 'fontListLoading'
  | 'fontListLoaded'
  | 'fontListUnsupported'
  | 'fontListDenied'
  | 'fontListError'
  | 'fontInvalid'
  | 'otherSkins'
  | 'otherSkinsDescription'
  | 'official'
  | 'officialTagline'
  | 'active'
  | 'tryingOn'
  | 'tryOn'
  | 'exitTryOn'
  | 'apply'
  | 'applying'
  | 'restore'
  | 'applyFailed'
  | 'appliedUnconfirmed'
  | 'tryOnError'

export const en: Record<SkinCenterKey, string> = {
  title: 'Appearance',
  navLabel: 'Appearance',
  description: 'Choose the Harness theme and configure the palette and fonts for compatible skins. Local values apply whenever a compatible skin is active.',
  import: 'Import',
  copy: 'Copy',
  copySuccess: 'Appearance transport copied.',
  copyFailed: 'Could not copy the appearance transport.',
  importSuccess: 'Appearance imported and applied.',
  importRejected: 'Import rejected. Paste a valid dsh-theme-v1 transport containing version 2 appearance JSON.',
  importModalTitle: 'Import appearance',
  importModalDescription: 'Paste the full transport string copied from this Appearance page.',
  importPasteLabel: 'Appearance transport',
  cancel: 'Cancel',
  close: 'Close',
  saveFailed: 'Could not save the appearance settings in this browser.',
  storedInvalid: 'The saved appearance document is invalid. Safe defaults are active; the stored value was left untouched.',
  storageUnavailable: 'Browser storage is unavailable. Safe defaults are active, and changes cannot be saved.',
  themeTitle: 'Theme preference',
  themeDescription: 'This follows the official Harness theme preference, including the operating system option.',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeFailed: 'The Harness theme preference could not be changed.',
  colorsTitle: 'Warm color palette',
  colorsDescription: 'Edit the selected or system-resolved color scheme. Surface color is derived automatically.',
  lightPalette: 'Light palette',
  darkPalette: 'Dark palette',
  accent: 'Accent',
  background: 'Background',
  foreground: 'Foreground',
  colorInvalid: 'Enter a complete #RRGGBB color. The saved color remains active.',
  fontsTitle: 'Local fonts',
  fontsDescription: 'Focus or click a field to load installed families. Manual family entry remains available as a fallback.',
  uiFont: 'Interface font',
  codeFont: 'Code font',
  uiFallback: 'Fallback: the Harness interface font stack.',
  codeFallback: 'Fallback: the Harness code font stack.',
  fontListIdle: 'Click a font field to load the local font dropdown. No permission is requested on page load.',
  fontListLoading: 'Loading local font families…',
  fontListLoaded: 'Local font list loaded. Both fields use the same installed-family dropdown.',
  fontListUnsupported: 'Local Font Access is unsupported in this browser. Enter a family manually.',
  fontListDenied: 'Local font access was denied. Enter a family manually; the fallback stack remains available.',
  fontListError: 'The local font list could not be loaded. Enter a family manually.',
  fontInvalid: 'Use a single font family name. The current saved font and fallback remain active.',
  otherSkins: 'Other skins',
  otherSkinsDescription: 'Try on or apply the installed full-interface skins.',
  official: 'Official default',
  officialTagline: 'The stock DSH look with no additional skin applied.',
  active: 'Active',
  tryingOn: 'Trying on',
  tryOn: 'Try on',
  exitTryOn: 'Exit try-on',
  apply: 'Apply',
  applying: 'Applying…',
  restore: 'Restore',
  applyFailed: 'Apply failed',
  appliedUnconfirmed: 'Applied, but the change has not been confirmed; refresh the page if the skin did not switch',
  tryOnError: 'Try-on failed. See the console for details.',
}

export const zh: Record<SkinCenterKey, string> = {
  title: '外观',
  navLabel: '外观',
  description: '选择 Harness 主题，并配置兼容皮肤的配色与字体。本地设置会在兼容皮肤激活时生效。',
  import: '导入',
  copy: '复制',
  copySuccess: '外观传输文本已复制。',
  copyFailed: '无法复制外观传输文本。',
  importSuccess: '外观配置已导入并生效。',
  importRejected: '导入被拒绝。请粘贴包含第 2 版外观 JSON 的有效 dsh-theme-v1 传输文本。',
  importModalTitle: '导入外观',
  importModalDescription: '粘贴从此外观页复制的完整传输文本。',
  importPasteLabel: '外观传输文本',
  cancel: '取消',
  close: '关闭',
  saveFailed: '无法在当前浏览器中保存外观设置。',
  storedInvalid: '已保存的外观配置无效。当前使用安全默认值，原存储内容未被改写。',
  storageUnavailable: '浏览器存储不可用。当前使用安全默认值，且无法保存更改。',
  themeTitle: '主题偏好',
  themeDescription: '沿用 Harness 官方主题偏好，并支持跟随操作系统。',
  themeSystem: '跟随系统',
  themeLight: '浅色',
  themeDark: '深色',
  themeFailed: '无法切换 Harness 主题偏好。',
  colorsTitle: '暖色配色',
  colorsDescription: '编辑当前选择或系统解析后的配色；浮层底色会自动推导。',
  lightPalette: '浅色配色',
  darkPalette: '深色配色',
  accent: '强调色',
  background: '背景色',
  foreground: '前景色',
  colorInvalid: '请输入完整的 #RRGGBB 颜色；当前已保存颜色继续生效。',
  fontsTitle: '本地字体',
  fontsDescription: '聚焦或点击字段时加载本地字体族；不支持或未授权时仍可手动输入。',
  uiFont: '界面字体',
  codeFont: '代码字体',
  uiFallback: '回退：Harness 默认界面字体栈。',
  codeFallback: '回退：Harness 默认代码字体栈。',
  fontListIdle: '点击字体字段以加载本地字体下拉列表；页面加载时不会请求权限。',
  fontListLoading: '正在加载本地字体族…',
  fontListLoaded: '本地字体列表已加载；两个字段共用同一已安装字体下拉列表。',
  fontListUnsupported: '当前浏览器不支持 Local Font Access，请手动输入字体族。',
  fontListDenied: '本地字体访问被拒绝，请手动输入；回退字体栈仍可用。',
  fontListError: '无法加载本地字体列表，请手动输入字体族。',
  fontInvalid: '请输入单个字体族名称；当前已保存字体与回退字体继续生效。',
  otherSkins: '其他皮肤',
  otherSkinsDescription: '试穿或应用已安装的整套界面皮肤。',
  official: '官方默认',
  officialTagline: '恢复 DSH 官方界面，不应用其他皮肤。',
  active: '当前激活',
  tryingOn: '试穿中',
  tryOn: '试穿',
  exitTryOn: '退出试穿',
  apply: '应用',
  applying: '应用中…',
  restore: '恢复默认',
  applyFailed: '应用失败',
  appliedUnconfirmed: '已写入配置但尚未确认生效；若皮肤未切换，请手动刷新页面',
  tryOnError: '试穿失败，详情见控制台。',
}
