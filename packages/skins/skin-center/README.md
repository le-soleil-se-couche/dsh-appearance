# Appearance（Harness 外观页）

`@deepseek-ai/dsh-client-ui-skin-center`（Cordis plugin id `ui-skin-center`）在 DeepSeek
Harness 官方 `settings.section` 槽位注册一级「外观 / Appearance」页面：`id=skin-appearance`、
`order=5`。导航与面板均由宿主设置界面管理，插件不查找、移动或改写宿主导航 DOM。

页面包含：

- 官方主题偏好：跟随系统、浅色、深色；选择状态读取 `ThemeRuntime` 的
  `snapshot.preference`，写入仍走官方 `setTheme`。
- 暖色配色：只编辑当前主题（System 使用已解析的实际明暗模式）的 Accent、Background、
  Foreground 三项；surface 由 background + foreground 确定性推导，不提供第四个输入。
- 本地字体：首次聚焦或点击字体字段时才调用 `window.queryLocalFonts()`；成功后 UI/code 使用
  可编辑组合框，共用去重、locale-aware 排序的真实本地字体候选。列表加载后仍可直接手动输入；
  不支持或拒绝授权时同样保留手动输入与明确状态。
- 文本导入与复制：Import 打开粘贴 modal，不读取文件；Copy 与 Import 共用
  `dsh-theme-v1:` + canonical JSON 的精确传输字符串。内部配置仍为
  `dsh-claude-code-appearance`、版本 `2`、两空格 JSON。该前缀是本插件本地 envelope，
  不声称与 Codex 或其他产品 schema 互通。
- 其他皮肤：默认收起，展开后保留官方默认及全部安装皮肤的真实 bundle 试穿、退出还原和
  一键应用能力。

## 本地持久化与作用域

当前 local-first 实现使用稳定 localStorage key：

```text
dsh-claude-code-appearance
```

客户端只向 `body` 写入以下私有 CSS 变量：

```text
--dsh-appearance-ui-font
--dsh-appearance-code-font
--dsh-appearance-light-accent
--dsh-appearance-light-canvas
--dsh-appearance-light-surface
--dsh-appearance-light-foreground
--dsh-appearance-dark-accent
--dsh-appearance-dark-canvas
--dsh-appearance-dark-surface
--dsh-appearance-dark-foreground
```

这些变量由兼容皮肤在各自的 body 属性作用域内读取；本独立仓库内置的 Claude Code 皮肤支持
这份配置，其他皮肤与官方界面保持 inert。skin-center 不创建或拥有皮肤属性，外观页自身使用
CSS Module 局部样式，因而在任何皮肤下都可用。插件卸载时只恢复这些私有变量原先的精确值与
priority；加载前不存在的值会被移除。

版本 2 JSON 形状：

```json
{
  "format": "dsh-claude-code-appearance",
  "version": 2,
  "colors": {
    "light": {
      "accent": "#da7756",
      "canvas": "#f5f3ee",
      "surface": "#f1eee8",
      "foreground": "#1d1b16"
    },
    "dark": {
      "accent": "#da7756",
      "canvas": "#1d1b16",
      "surface": "#262119",
      "foreground": "#f5f3ee"
    }
  },
  "fonts": {
    "ui": "思源宋体 VF",
    "code": "SF Mono"
  }
}
```

`surface` 必须等于 `canvas` 与 `foreground` 的确定性暖色推导结果。导入会校验这一不变量；
未知未来版本、额外字段、非法颜色/字体或不匹配的 surface 会整体拒绝，不修改当前状态。
复制与粘贴使用同一条单行传输文本，形如：

```text
dsh-theme-v1:{"format":"dsh-claude-code-appearance","version":2,"colors":{...},"fonts":{...}}
```

## 皮肤试穿与应用

- 试穿：`/api/skin-center/bundle/<id>` 通过同源 script 提供皮肤的 `lib/client.js`；bundle
  在页面自身 `window.__ModuleLoader__` 注册，随后由 `window.__DSH_MODULES__.import`
  物化。没有 `eval`，冷启动也不解析皮肤大资源。
- 退出：运行试穿 disposer、清理模块与样式，再恢复激活皮肤的 body 属性、内联背景和已摘除
  chrome。外观私有变量随后重新断言，避免试穿期间的颜色或字体修改被旧 body 快照覆盖。
- 应用：`/api/skin-center/apply` 执行 `dsh-skin use <name>` 或 `dsh-skin use official`；
  `/api/skin-center/state` 用于确认配置已写入后刷新页面。POSIX 优先使用 PATH；Windows 优先通过
  Node 运行从本仓库位置解析的 `scripts/dsh-skin`，避免依赖 shebang、可执行位或 `.cmd` 直启。

## 安装

从仓库根目录安装 Appearance 与 Claude Code 两个单元：

```sh
dsh plugin --profile web add link:./packages/skins/skin-center
dsh plugin --profile web add link:./packages/skins/claude-code
node ./scripts/dsh-skin use claude-code
```

本包需要官方 NPM SDK；`dsh.client.inject` 声明 runtime、locale、settings 与 theme，
primitives 作为平台模块由本包直接声明依赖。构建不引用任何 DSH 源码 checkout。

## 包内验证

```sh
pnpm --filter @deepseek-ai/dsh-client-ui-skin-center run typecheck
pnpm --filter @deepseek-ai/dsh-client-ui-skin-center run build
pnpm --filter @deepseek-ai/dsh-client-ui-skin-center run test
```

`tests/appearance-config.spec.ts` 覆盖 parser、Copy/Import transport round-trip、surface 推导、
未来版本拒绝、文本颜色原子校验、非法导入原子性和 body 变量恢复；
`tests/local-fonts.spec.ts` 覆盖可用、unsupported、denied、去重与排序；
`tests/appearance-css.spec.ts` 锁定跨皮肤可用的局部 CSS scope；`tests/try-on.spec.ts` 覆盖真实
皮肤 bundle 的试穿/回滚；`tests/routes.spec.ts` 覆盖 host API、安全边界和 CLI runner。

## 目录

```text
src/client/index.ts                 settings.section 注册与生命周期
src/client/SkinCenter.tsx           外观页面与收起的皮肤区
src/client/appearance-config.ts     纯版本化 JSON contract
src/client/appearance-runtime.ts    localStorage 与可恢复 body 变量
src/client/local-fonts.ts           手势触发的 Local Font Access 枚举
src/client/try-on.ts                真实 bundle 试穿与互斥还原
src/client/generated/skins.ts       生成的皮肤元数据，勿手改
src/routes.ts                       同源 host API 与 dsh-skin runner
```
