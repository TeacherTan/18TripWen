// db:reset 守卫：生产环境会 DROP 所有表（清空全部 token），默认拒绝执行。
// 如确需在生产重置：DB_RESET_FORCE=1 npm run db:reset
const isProd = process.env.NODE_ENV === 'production';
const forced = process.env.DB_RESET_FORCE === '1';

if (isProd && !forced) {
  console.error('[db:reset] 已拦截：NODE_ENV=production 下执行会 DROP 所有表，清空 300 张卡 + 19 个打卡点的 token。');
  console.error('[db:reset] 如确需执行：DB_RESET_FORCE=1 npm run db:reset');
  process.exit(1);
}

console.log('[db:reset] 守卫通过，继续执行重置。');
