/* 章节清单：目录页、页脚前后导航都从这里取。
   新增一节 = 在这里加一条 + 建 pages/<slug>/index.astro。 */

export const chapters = [
  {
    no: '02', slug: '02-刚体变换', title: '刚体变换',
    kw: '旋转矩阵 · 齐次坐标 · 求逆', reg: 'K00a–K02', status: 'done',
  },
  {
    no: '03', slug: '03-指数坐标与Rodrigues', title: '指数坐标与 Rodrigues',
    kw: '矩阵指数 · 轴角换算 · π 陷阱', reg: 'K03–K04', status: 'done',
  },
  {
    no: '04', slug: '04-螺旋与齐次变换指数', title: '螺旋运动与齐次变换指数',
    kw: 'twist · screw · 指数积', reg: 'K06–K07', status: 'done',
  },
  {
    no: '05', slug: '05-空间速度与伴随', title: '空间速度与伴随',
    kw: '空间／物体速度 · Ad 变换', reg: 'K08–K10', status: 'done',
  },
  {
    no: '06', slug: '06-正运动学', title: '正运动学',
    kw: '指数积公式 · 关节旋量 · 零位形', reg: 'K11–K12', status: 'done',
  },
  { no: '07', title: '逆运动学', kw: '子问题法 · 解的存在与多解', reg: 'K10–K11', status: 'todo' },
  {
    no: '08', slug: '08-雅可比与奇异', title: '雅可比与奇异',
    kw: '列公式 · 物体雅可比 · 降秩', reg: 'K19–K22', status: 'done',
  },
  { no: '09', title: '轨迹规划', kw: '插值 · 时间律 · 关节空间与任务空间', reg: 'K14–K15', status: 'todo' },
];

export const written = chapters.filter(c => c.status === 'done');

export function neighbours(slug) {
  const i = written.findIndex(c => c.slug === slug);
  return { prev: written[i - 1] || null, next: written[i + 1] || null };
}
