// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// 站点部署在自定义域名的根部（learn-robotics.keinestudio.cn），所以 base 保持 '/'。
// 若改回 GitHub Pages 的项目子路径（<user>.github.io/<repo>/），再把 base 设成 '/<repo>'；
// 页面链接与静态资源都经 import.meta.env.BASE_URL 生成，改一处即可。
export default defineConfig({
  site: 'https://learn-robotics.keinestudio.cn',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [mdx()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  vite: {
    build: { assetsInlineLimit: 0 },
  },
});