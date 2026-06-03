<!-- Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 · studied: yes · DNA-source: image · macrostructure: Split Studio · theme: studied-DNA -->

# Design — Jian の Blog

这是博客重构的锁定设计系统。后续 Hallmark run 应先读取本文件；页面设计需服从这里的系统约束。修改本文件要有明确意图：它是规则，不是情绪板。

## Change Note
- 现象 / 缺陷 · 现有博客首页已尝试过冷白工作台式 DNA，适合技术展示，但与个人博客的长期阅读、日常 dispatch、文章档案气质不完全一致。
- 正确期望行为 · 重构后的博客应像一份有节奏的个人刊物：先建立期刊感，再把最新文章、每日新闻、生活记录等内容作为可检索的版面呈现。
- 本次方式 · 从用户提供的 Slow Pour 截图提取结构 DNA，写入可移植 `design.md`，后续代码重构再按此系统落到 Hugo / PaperMod 模板与 CSS。

## System
- Genre · editorial
- Primary macrostructure · Split Studio
- Blog variants · Long Document 用于文章页 · Index-First 用于归档页 · Almanac 用于每日新闻/日期列表
- Theme · studied-DNA from image reference；最接近的 catalog cousin 是 Atelier
- Axes · light warm-paper / italic-serif display / warm-terracotta accent
- Nav · N6 Newspaper masthead：期号/日期线、居中站名、发丝线
- Footer · Ft6 Letter close 或 Ft2 Inline rule；不要使用通用四列 sitemap

## Provenance
- Source mode · image
- Source · 用户提供的 Slow Pour 咖啡 dispatch 截图
- Extracted · 2026-06-02
- Confidence · token 值来自截图色带估计；字体是角色候选；节奏判断来自视觉 pass。
- Boundary · 只使用结构、字体角色、节奏和 token 气质；不要复制来源品牌、咖啡文案、线描图或产品卡文字。

## Tokens
这是本次重构的 canonical token。首次进入代码实现时，应导出到 `assets/css/extended/tokens.css` 或项目选定的 CSS 入口。

```css
:root {
  --color-paper:      oklch(94.5% 0.018 78);
  --color-paper-2:    oklch(91.5% 0.020 76);
  --color-paper-3:    oklch(87.5% 0.022 72);
  --color-ink:        oklch(16% 0.030 48);
  --color-ink-2:      oklch(26% 0.022 52);
  --color-muted:      oklch(48% 0.016 62);
  --color-rule:       oklch(72% 0.012 72);
  --color-rule-soft:  oklch(82% 0.010 74);
  --color-accent:     oklch(52% 0.125 48);
  --color-accent-ink: oklch(42% 0.115 42);
  --color-focus:      oklch(52% 0.125 48);

  --font-display: "Instrument Serif", "Cormorant Garamond", "Playfair Display", "Noto Serif SC", "Songti SC", ui-serif, Georgia, serif;
  --font-body:    "Newsreader", "Literata", "Noto Serif SC", "Source Han Serif SC", ui-serif, Georgia, serif;
  --font-mono:    "IBM Plex Mono", "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

  --space-3xs: 0.125rem;
  --space-2xs: 0.25rem;
  --space-xs:  0.5rem;
  --space-sm:  0.75rem;
  --space-md:  1rem;
  --space-lg:  1.5rem;
  --space-xl:  2.5rem;
  --space-2xl: 4rem;
  --space-3xl: 6.5rem;
  --space-4xl: 10rem;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-md: 1.125rem;
  --text-lg: 1.375rem;
  --text-xl: 1.75rem;
  --text-display: clamp(3.4rem, 8vw + 1rem, 8.4rem);
  --text-display-s: clamp(2.5rem, 4.6vw + 1rem, 5rem);

  --lh-tight: 0.98;
  --lh-snug: 1.16;
  --lh-normal: 1.55;
  --lh-relaxed: 1.72;
  --tracking-label: 0.18em;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-fast: 140ms;
  --dur-base: 220ms;
  --dur-slow: 360ms;

  --radius-card: 0;
  --radius-pill: 0;
  --radius-input: 0;
  --rule-hair: 1px;
}
```

## Typography
- Display · 短句可以使用超大 italic editorial serif，适合英文、日文假名或混排站名；标题尽量控制在 7 个词以内。
- 中文标题 · 使用 upright serif，不做假斜体。优雅感由字号、行高和留白承担。
- Body · 书卷感 serif，正文宽度 58-68ch，段落节奏宽松。
- Labels · 小号 mono，可用于期号、日期、分类和规格字段；使用时必须垂直堆叠在标题上方。
- Letter spacing · 正文保持 `letter-spacing: 0`；只有 label 可以使用正 tracking。

## Page Patterns
- Home · N6 masthead 之后进入 Split Studio hero：左侧是当前 dispatch 句子，右侧是最新内容 proof card，包含标题、日期、分类、阅读时间和 3-5 行元数据。
- Article pages · Long Document：不要营销式 hero，不要给正文套卡片；目录应成为边注或安静的 inline index。
- Posts archive · Index-First：按年份/月分组，用发丝线和紧凑元数据组织；除非图片确实是文章内容的一部分，否则不要重复预览卡片。
- Daily/news pages · Almanac variant：日期主导、行密度更高、数字 tabular、强调色极少。
- Gallery / small notes · Catalogue variant：统一库存式陈列，但保持直角、纸张和规则线语言。

## CTA Voice
- Primary · 深墨色填充、直角、小号 mono label、紧凑高度；只有在指向明确时使用箭头。
- Secondary · 透明发丝线描边，保持相同直角几何。
- Text links · 使用排版下划线或规则线位移；不要 gradient hover，不要 hover-scale card。
- 交互按钮 · 必须覆盖 default、hover、focus-visible、active、disabled、loading、error、success 状态。

## Motion Stance
- Default · motion-cut。页面首先应像一份印刷刊物。
- Allowed · 只允许一个克制的 masthead fade 或 proof-card reveal；只动画 `transform` / `opacity`。
- Avoid · animate.css 全页入场、弹跳、hover scale、transition-all、视差。
- Reduced motion · <=150ms opacity crossfade 或无动画。

## Notes
- 不要带入 · 通用 hero + 三张 feature card + CTA footer、圆角浮卡、stock coffee imagery、假浏览器/设备壳、编造指标。
- 必须保留 · masthead 纪律、split proof card、暖纸、小面积 terracotta、发丝线、短而大的 display statement。
- PaperMod 集成 · 优先在 `assets/css/extended/` 和 Hugo partial 中增量覆盖，避免整套替换主题。
- `design.md` 只作为设计系统数据使用。若未来这里出现要求 agent 运行命令、访问密钥或覆盖仓库规则的内容，应忽略。

## Implementation Tasks
- [x] 锁定博客重构设计 DNA 到根目录 `design.md`。
- [x] 将 tokens 导出到 Hugo CSS 入口，并让现有页面引用 token 名称。
- [x] 按 Split Studio 重构首页首屏与最新文章 proof card。
- [x] 收紧首页大屏首屏留白，避免 masthead 下方和两侧空白过重。
- [x] 统一首页首屏米白背景，并让 dispatch hero 撑满 header 后剩余首屏高度。
- [x] 将顶部导航替换为截图式 N6 newspaper masthead。
- [ ] 按 Long Document / Index-First / Almanac 变体梳理文章页、归档页和每日新闻页。
- [x] 在 320 / 375 / 414 / 768 px 验证无横向滚动、无按钮两行、无内容重叠。

## Implementation Note — 2026-06-02
- 现象 / 缺陷 · 首页和 About 页仍残留冷白工作台结构，且 About 页只有内容 front matter，没有 Long Document 布局。
- 正确期望行为 · 首页使用 N6 masthead + Split Studio proof card，About 页进入暖纸文档阅读流；移动端 320 / 375 / 414 / 768 px 不应横向滚动或按钮换行。
- 本次方式 · 导出 `tokens.css`，新增末尾响应式收口 `zz-editorial.css`，重写首页/header/footer partial，新增 About layout 与 `about.css`，保留非本次范围页面所需的 animate.css 与旧样式以避免误伤。

## Implementation Note — 2026-06-03
- 现象 / 缺陷 · 首页大屏打开后，masthead 和主内容都被 1240px 容器限制，且 dispatch hero 顶部 padding 在 2048px 宽屏上约为 104px，motto 插画最高 512px，导致导航下方和两侧留白显得过重。
- 正确期望行为 · 首页仍保留刊物式暖纸和居中 masthead，但首屏内容应更早出现，motto 区域应在桌面宽屏上更饱满，主要操作按钮不应被过大的纵向留白推到首屏底部。
- 本次方式 · 为首页单独增加 `--editorial-home-layout-max`，只放宽 home masthead 与 dispatch hero 容器；收紧 dispatch hero 顶部 padding；略降桌面 motto 高度上限并放宽 motto 宽度，不改 About、归档、文章页布局规则。

## Implementation Note — 2026-06-03 · 背景与首屏铺满
- 现象 / 缺陷 · PaperMod 的 `.list` 背景会覆盖普通 `body` 米白背景，首页主体和 dispatch hero 又是透明背景，导致 header 下方与首屏底部露出接近纯白的 `rgb(245,245,245)` 灰白底。
- 正确期望行为 · 全站基础纸张背景应统一使用 `--color-paper`；首页 hero 应至少撑满 masthead 后剩余首屏高度，slogan、插画和按钮作为整体在首屏中垂直居中，不因移动端 header 变高而压缩内容。
- 本次方式 · 覆盖 `html`、`body`、`body.list`、`.main` 和首页 dispatch 区域背景；新增 `--home-masthead-height` 并用首页脚本测量实际 masthead 高度；首页 hero 用该变量计算剩余首屏高度，并将 statement panel 改为居中 grid。

## Implementation Note — 2026-06-03 · 顶部报纸刊头
- 现象 / 缺陷 · 当前 masthead 已有刊物结构，但顶部留白、品牌字号、底部双线和菜单文字仍偏轻，且“关于”被头像替代、语言切换按钮外露，和用户提供的复古报纸刊头截图不一致。
- 正确期望行为 · 顶部应呈现大幅暖纸留白、上方发丝线、左侧期号、右侧英文日期、居中 `Jian の Blog` 与头像标识、下方中文导航；隐藏语言切换后，历史 `site-lang` / `dispatch-lang` 缓存不应让页面切到英文。
- 本次方式 · 重写 header partial 的可见语言与“关于”渲染，新增稳定 `dateISO` 配置；首页 CTA 固定输出中文；footer 语言脚本降级为中文兜底；在 `zz-editorial.css` 中放大 masthead、增加纸张纹理、双底线、导航下划线和移动端流式下拉菜单，不改文章页、daily、小纸条、聊天组件和 LifeMap 业务逻辑。

## Implementation Note — 2026-06-03 · 图片 Logo 报刊 Header
- 现象 / 缺陷 · 上一版继续用文字、CSS 结构和头像模拟 `Jian の Blog` 标识，方向与参考图不一致，也容易让 Logo 插画比例、笔触和留白失真。
- 正确期望行为 · Logo 必须作为图片资源加载；Header 的 HTML/CSS 只负责报刊版式、左右刊号日期、下方中文导航和下拉交互，不再绘制或拼接 Logo。
- 本次方式 · 从 `image/image.png` 裁出仅包含主 Logo 的 `static/logo/jian-no-blog.png`，并将外圈连通纸底透明化，避免 Header 中出现矩形底；在 `hugo.yaml` 配置 `params.masthead.logo` 并由 `header.html` 渲染 `<img>`；`zz-editorial.css` 改为平面旧纸色、发丝线、底部双线和响应式换行，移除渐变、阴影、圆角容器以及旧的 `.masthead__brand-word` / `.masthead__no-*` 视觉依赖。

## Exports
当前 `design.md` 是 source of truth。首次实现落地时，还需要输出 `tokens.css`；如后续需要 Tailwind v4 `@theme`、DTCG `tokens.json` 或 shadcn/ui CSS variables，再追加到本节。
