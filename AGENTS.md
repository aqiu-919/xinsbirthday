# 项目协作规则

## 项目定位

本项目分别维护王栎鑫 2007—2026 公开履历资料库与纪念网站精选时间轴。完整活动档案来自工作簿，精选时间轴独立维护，二者不互相生成或覆盖。

## 运行方式

- 完整刷新：`node refresh_project.mjs`
- 单独生成工作簿：`node build_wang_yuexin_archive.mjs`
- 单独导出网站数据：`node extract_timeline.mjs`
- 单独验证：`node verify_archive.mjs`
- 单独验证时间轴：`node verify_timeline.mjs`
- 本地预览网站：在项目根目录运行 `python -m http.server 8000`，访问 `http://localhost:8000/site/`

## 技术栈

- Node.js ES modules
- `@oai/artifact-tool` 生成和读取 Excel
- 原生 HTML、CSS、JavaScript 静态网站
- Python/Pillow 仅用于已有图片素材提取

## 目录与数据约定

- `build_wang_yuexin_archive.mjs` 中的 `works` 和 `events` 是资料库及完整活动档案的权威源；生成时必须合并为同一张“活动年表”，不得重新拆成两个工作表。
- `site/data/timeline.json` 是精选时间轴的独立权威源，按网站叙事需要单独更新。
- 最终工作簿固定输出到 `outputs/wang_yuexin_archive_v1/`。
- 年终总结原图按年份保存在 `sources/year_end/`；工作簿视觉检查图只写入系统临时目录。
- `site/data/archive.json` 必须从最终工作簿生成，不手工编辑。
- `site/data/timeline.json` 不从工作簿生成；资料库刷新不得修改或覆盖它。
- 活动默认按年份、日期、类别和名称升序；同日不同活动分别保留。
- 活动年表类别固定为“影视、音乐、舞台、综艺、杂志、其他”；网站必须直接按该字段分类，不根据活动名称推断。
- 重复活动按“日期 + 活动名称 + 地点”识别。
- 未取得准确日期时只记录到月或年，不猜测具体日期。
- 用户提供的信息全部登记；取消、延期、未播出、争议、线上聊天、专访、普通站台、Vlog等通过类别、状态和备注区分，不再排除。
- 所有项目沟通使用中文。

## 当前状态与下一步

- 现役工作簿为 `王栎鑫2007-2026公开履历资料库_完整版_按年份排序.xlsx`。
- 网站读取 `site/data/archive.json` 和 `site/data/timeline.json`。
- 资料库数据变更后必须运行完整刷新；时间轴数据变更后运行 `node verify_timeline.mjs`，并以对应验证通过为完成标准。
- 年终总结长图仍有少量模糊项目待二次核验；不得把待核验内容写成确认事实。
- 删除、移动、重命名历史文件或素材前必须先列清单并取得用户确认。
