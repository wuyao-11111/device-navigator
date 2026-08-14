# 设备导航

一个无需构建步骤的 Chrome Manifest V3 插件。它支持：

- 点击插件时读取当前标签页，并识别 `/devices/detail/` 后的设备 ID
- 在新标签页打开首页、设备信息和状态
- 一次性打开全部 3 个页面
- 一键复制设备 ID
- 使用适配 Chrome 工具栏小尺寸显示的独立导航图标
- 每次打开弹窗时自动检查 GitHub Release，也可以点击底部“检查更新”手动检查

## 安装

1. 打开 Chrome 的 `chrome://extensions/`。
2. 开启右上角的“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择解压后的插件目录。
4. 固定扩展后，点击工具栏中的“设备导航”图标即可使用。

扩展只声明了读取当前标签页、写入剪贴板、设备服务域名和 GitHub API 权限。

## GitHub 发布与自动更新

本目录已经包含 GitHub Actions 发布流程：`.github/workflows/release.yml`。把本目录作为 GitHub 仓库根目录后，修改 `manifest.json` 的版本号并推送同名标签即可自动生成 Release 压缩包，例如：

```text
manifest.json: 1.0.1
git tag v1.0.1
git push origin v1.0.1
```

需要注意 Chrome 的更新限制：

- 通过“加载已解压的扩展程序”安装时，Chrome 不会从 GitHub 自动更新；代码变化后需要在扩展管理页点击“重新加载”。
- GitHub Release 可以自动打包和分发，但普通个人 Chrome 不能把 GitHub 当作扩展的自动更新源。
- 弹窗会在每次打开时查询 GitHub Release；发现新版本时显示更新入口，但安装仍需按 Chrome 的扩展更新流程完成。
- 想让用户自动收到更新，应将扩展发布到 Chrome Web Store（可以设置为“未公开”）。发布新版本后，Chrome 会按自己的检查周期自动更新。
- 企业托管环境可以使用 Chrome 的策略安装自托管 CRX，但这需要企业管理员配置，不适合作为个人安装方案。
