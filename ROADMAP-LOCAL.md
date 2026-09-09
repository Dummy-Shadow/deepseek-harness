# DeepSeek Harness 本地 fork 工作台账（可勾选）

> 基线：dsh-v0.1.3-alpha.2，运行目录 `D:\soft\deepseek-harness-penguin\deepseek-harness`（分支 `feature/split-pane`，含 WIP 检查点 `a04df32` 与 Layer A `a8ac476`）。
> 维护规则：每一项勾掉前必须“有产出/能验证”；改代码类的任务默认先在 `feature/split-pane` 分支做。

## 一、已完成 ✅
- [x] 升级到 0.1.3-alpha.2（全新树 + fs-ext Windows stub + 资产/启动文件迁移），install/typecheck/build/冒烟通过
- [x] 备份：`D:\soft\dsh-backup-20260909`（.dsh 全量）、git tag `custom-before-upgrade-20260909`
- [x] 对话记录保留验证（旧 v0 会话可被新版加载/迁移）
- [x] 插件找回：`@linxin666/dsh-web-all@0.3.18`（SSH/任务看板/宠物/skin-center/git-graph/远程/web-ui 设置/better-sidebar）
- [x] 实时 token：`@proton1917/dsh-live-stats`
- [x] 科研插件：`@a9i5k4/dsh-literature`、`dsh-mimir@0.19`、`dsh-kb-rag@1.6.2`（工具已注册）
- [x] Mimir sxng 日志静音（预置缓存 + `MIMIR_SXNG_SKILL_REFRESH_MS` 进启动 bat）
- [x] 模式：内置 preset `concurrency`（并发 4 子代理）、`research`（科研，persona 含三问/证据分级/退化自监督/FR-1·FR-9）
- [x] 前端修复：token 悬停细分 tip（ui-chat 单测 329/329、client typecheck、build 通过）
- [x] 科研技能 ×4（user-dsh 根：research-self-monitor / research-inventory / research-audit / chinese-academic-paper-writing）
- [x] 规范蓝本：`科研模式-AGENTS.md`（运行准则 + 需求规格 v1.0 合并）
- [x] 皮肤机制问题已定位/文档化 + 上游 issue 草稿 `dsh-web-skin-catalog-sync-issue.md`
- [x] `二次开发指南.tex/.pdf` 更新（路径坑、fs-ext、GitHub/codeload、皮肤重启、Mimir/kb-rag 集成实录等）

## 二、进行中 🔄
- [ ] **B3 分屏自建**（branch `feature/split-pane`；**续做前先读 `SPLIT-PANE-HANDOFF.md`**）
  - [x] Layer A：`ISessions.pin/closePane` + service `panes` 保留集（`a8ac476`，client typecheck 通过）
  - [x] Layer B：`SessionRegionProvider`（ui-renderer bindings）+ 单测（`684d5f0`）；消费入口 = renderer service 面 `UiRendererService.sessionRegion`（`7184cee`）—— 决策记录见 HANDOFF §8
  - [x] Layer C：`ISessions.panes` 只读 observable（`f5c6b00`）+ 右栏只读 pane（region 复用 `conversation.session` 子树）+ header 分屏按钮 + pane==current 隐藏（`c073878`、`4668b56`；typecheck + ui-conversation/ui-chat/ui-tool/ui-renderer/session-controller 目标 vitest 全绿）
  - [ ] 收尾：test:gui 仅余 Windows `directory-picker-browse` host 路径预置失败（与本改无关）；待重启 Web 肉眼验收分屏 → 通过后合回主工作树并补 Agent Note

## 三、待你拍板 / 待办 🕐
- [ ] kb-rag Python 依赖（A=自动装 / B=手动 pip / C=不动=当前默认）
- [ ] 科研模式 §8 验收：真实科研会话跑金标准/对抗用例（你出用例，我给方案）
- [ ] 4.1flash beta 到期（2026-09-10）：移除 `~/.dsh/settings.yaml` 的 `deepseek-v4.1-flash-expires-on-0910`
- [ ] `deepseek-harness-old-011` 删除（确认无回退需求后）
- [ ] 皮肤 whale-song / maid-atelier 是否要按新机制补装（0.3.18 skin-center 已能装新皮肤，你重启后已见 miku）
- [ ] mineru 等旧 API 插件：等作者适配后再试（已记录根因）

## 四、参考
- 根 README：`README.zh.md`；升级方案：`DSH-迭代方案.md`；开发指南：`二次开发指南.tex`
- 规范：仓库根 `科研模式-AGENTS.md`；问题草稿：`../dsh-web-skin-catalog-sync-issue.md`
