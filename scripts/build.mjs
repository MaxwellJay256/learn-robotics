// astro build 的包装：构建完成后强制退出。
// 直接跑 `astro build` 在本机会在打印 Complete! 之后卡住不返回（Windows 上
// satteri/lightningcss 的原生绑定留下了未释放的句柄），CI 里会一直等到超时。
import { build } from 'astro';

await build({ root: process.cwd() });
process.exit(0);
