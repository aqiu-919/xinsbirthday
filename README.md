# 望栎星球资料库

这是王栎鑫 2007—2026 公开履历资料库及纪念网站项目。资料库以生成脚本中的作品、活动记录为权威源，将两类信息合并生成一张活动年表，并同步生成 Excel 工作簿与网站完整档案；网站精选时间轴使用独立 JSON 维护，不再由工作簿筛选生成。

## 主要产物

- 最终工作簿：`outputs/wang_yuexin_archive_v1/王栎鑫2007-2026公开履历资料库_完整版_按年份排序.xlsx`
- 纪念网站：`site/index.html`
- 网站完整档案：`site/data/archive.json`
- 网站精选时间轴：`site/data/timeline.json`
- 网站账号预览素材：`site/assets/account-previews/`
- 项目状态与收录口径：`PROJECT_STATUS.md`

## 目录结构

```text
.
├── build_wang_yuexin_archive.mjs  # 数据权威源与工作簿生成器
├── extract_timeline.mjs           # 从工作簿导出完整档案，不修改时间轴
├── verify_archive.mjs             # 工作簿、完整档案与状态文档一致性检查
├── verify_timeline.mjs            # 独立时间轴结构、唯一性及排序检查
├── refresh_project.mjs            # 统一刷新入口
├── PROJECT_STATUS.md              # 当前数量、口径和待核验状态
├── outputs/                        # 现役工作簿
├── sources/year_end/               # 按年份归档的年终总结原图
└── site/                           # 静态纪念网站、账号预览与网站数据
```

网站页面顺序为：起点、精选时间轴、账号预览“你好呀~王小鑫”、完整档案“王小鑫的成长轨迹”。账号预览页按本人、工作室、其他三行维护；预览图不显示文件名，点击后进入对应主页或打开原尺寸账号图。

## 数据维护

资料库与完整档案：

1. 在 `build_wang_yuexin_archive.mjs` 的 `works`、`events` 和来源常量中维护；生成时自动把作品并入活动年表。
2. 同步更新 `PROJECT_STATUS.md` 中确实发生变化的数量或核验状态。
3. 运行完整刷新：

```powershell
node refresh_project.mjs
```

完整刷新依次执行：生成工作簿、导出 `archive.json`、验证工作簿/完整档案/状态文档一致性，并检查独立时间轴自身结构。该流程不会改写 `timeline.json`。

网页完整档案使用独立展示顺序：年份按2026至2007倒序，同一年内按月份和日期正序。每条活动直接显示中文日期；资料源只有月份或年份时，按现有精度显示并将年份级待核条目置于该年末尾。

连续参加同一档综艺同一季的不同播出期数，在资料库中合并为一条从首次到末次播出的时间段记录；先导片、直播等不同内容仍独立登记。除此之外，网页不对巡演场次或同名活动进行系列折叠，完整档案中的每条合并履历始终作为独立行展示。网页分类直接读取活动年表的“类别”字段，类别固定为“影视、音乐、舞台、综艺、杂志、其他”。

精选时间轴：直接维护 `site/data/timeline.json`，完成后运行：

```powershell
node verify_timeline.mjs
```

时间轴可使用与资料库不同的节点、标题、说明和更新节奏。当前节点按飞书“生日时间轴信息表”的“顺序”字段排列，活动 ID 必须在时间轴内部唯一；日期统一使用 `YYYY/MM/DD`，特殊节点由“是否是特殊节点”字段控制。

工作簿视觉检查图写入系统临时目录 `wang_yuexin_archive_qa`，不会留在项目的 `outputs/` 中。

刷新脚本在 Codex 环境中会优先使用其兼容 Node 运行时；在其他环境中使用当前 `node`。若表格库与本机 Node 版本不兼容，请使用项目所配置的 Node 运行时。

## 本地预览

浏览器直接打开 HTML 时无法稳定加载 JSON，请从项目根目录启动静态服务器：

```powershell
python -m http.server 8000
```

然后访问 `http://localhost:8000/site/`。

## GitHub 备份与网站部署

- GitHub 仓库：`https://github.com/aqiu-919/xinsbirthday`
- 公开网站：`https://aqiu-919.github.io/xinsbirthday/`
- `main` 分支保存维护脚本、项目规则、状态文档及网站部署包 `site-deploy.zip`。
- GitHub Release 附件 `xinsbirthday-project-backup-2026-07-31.zip` 保存完整项目源文件、资料来源、现役工作簿、网站和验证用例。
- `.github/workflows/pages.yml` 在每次推送到 `main` 后解压网站部署包、验证精选时间轴，并将解压后的 `site/` 作为网站根目录自动发布。
- GitHub Pages 只展示 `site/`，仓库中的生成脚本、原始资料和工作簿不会出现在网站页面中。

资料库内容更新后，先运行完整刷新并确认通过，再提交和推送：

```powershell
node refresh_project.mjs
git add --all
git commit -m "更新资料库"
git push
```

只修改精选时间轴、网页视觉或网站素材时，至少运行时间轴验证后再提交：

```powershell
node verify_timeline.mjs
git add --all
git commit -m "更新纪念网站"
git push
```

推送完成后，GitHub Actions 会自动刷新公开网站；以 Pages 工作流成功且公开网址可访问为发布完成标准。

## 更换电脑后恢复

1. 安装 Git、Node.js、Python 和 Codex。
2. 从仓库 Releases 下载最新的完整项目备份包并解压。
3. 用 Codex 打开解压后的项目文件夹；项目规则以其中的 `AGENTS.md` 为准。
4. 如需核对线上部署配置，再克隆仓库：`git clone https://github.com/aqiu-919/xinsbirthday.git`。
5. 本项目的表格生成依赖 `@oai/artifact-tool`。在 Codex 工作区运行时使用其兼容运行时；如果普通 Node 环境缺少该包，应先在支持该依赖的 Codex 环境中执行完整刷新。
6. 运行 `node verify_timeline.mjs`；需要更新资料库时再运行 `node refresh_project.mjs`。

`node_modules/`、`.tools/`、`.git/`、缓存和检查日志不进入完整备份包，它们不是项目权威资料，也不影响在新电脑上恢复。

## 验证标准

- 工作簿包含“总览、人物档案、活动年表、来源与待补”四个工作表，作品总表不再单独生成。
- 工作簿数量与 `PROJECT_STATUS.md` 一致。
- `archive.json` 与活动年表逐行一致。
- `timeline.json` 独立验证 32 条节点、必备字段、连续顺序、ID唯一性、日期格式、特殊节点取值及图片存在性，不与活动年表逐行比较。
- 活动 ID 唯一，日期/名称/地点组合无重复，默认排序正确。
- 117 个作品项目必须全部在合并年表中具有独立记录或对应事件标记。
- 活动年表类别只能使用“影视、音乐、舞台、综艺、杂志、其他”。
- 已填充单元格中没有常见公式错误值。

当前资料仍含明确标注的“待二次核验”项目；文件名中的“完整版”表示当前交付版本，不代表所有历史公开活动已穷尽。

## 收录原则

用户提供的信息全部登记，不再按活动类型排除。聊天、专访、站台、Vlog、比赛过程、取消、延期、未播出及争议信息应保留，并在类别、核验状态或备注中准确标明；没有可靠日期时只记录到月或年，不推测具体日期。
