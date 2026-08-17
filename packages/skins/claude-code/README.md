# Claude Code 皮肤 · dsh web GUI

DeepSeek Harness (dsh) Web GUI 的 Claude Code 终端风格皮肤：暖陶土橙强调色、
奶油纸面与暖黑亮暗配色、思源宋体 UI、SF Mono 代码字体及终端窗口式标题栏
（macOS 红黄绿三圆点）。

| 项目 | 值 |
| --- | --- |
| 皮肤 id | claude-code |
| 包名 | @deepseek-ai/dsh-client-ui-skin-claude-code |
| 强调色 | #DA7756 |
| 亮/暗 | 奶油纸面亮色与暖炭黑暗色配套 |

## 安装

方式一（外观页）：从仓库根目录安装 `skin-center` 与本包，重启 dsh web 后在
设置 → 外观 → 其他皮肤中试穿或应用。

方式二（命令行，从完整仓库 clone 执行）：

```sh
dsh plugin --profile web add link:$(pwd)/packages/skins/claude-code
```

启用互斥与切换由仓库根目录的 scripts/dsh-skin 管理（~/.dsh/cordis.patch.yml managed 区段）。

## 开发

```sh
pnpm install
pnpm --filter @deepseek-ai/dsh-client-ui-skin-claude-code test
pnpm --filter @deepseek-ai/dsh-client-ui-skin-claude-code build
```

皮肤只依赖官方 NPM SDK（@deepseek-ai/cordis），不修改任何 DSH 源码；
样式作用域限定在 body[data-dsh-claude-code]（暗色变体再加 [data-ds-dark-theme]），
apply() 的全部写入（body 属性、标题栏、文档标题）在 dispose 时完整收回。
外观插件可在该 body 作用域内通过私有 `--dsh-appearance-*` 变量覆盖字体与亮暗配色；
未提供变量时保持上述默认视觉。
