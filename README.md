# PS Stats

基于 PlayStation Network 数据的游戏库与奖杯分析面板。保留原项目的 Next.js、Zustand、Dexie 和多页面分析框架，入口改为输入 PSN Online ID。

## 数据来源与必要配置

Sony 的相关接口需要服务端访问令牌。应用只让访客输入公开的 PSN Online ID，不会在页面收集 PSN 密码；部署时需要在服务端配置：

```env
PSN_NPSSO=your_npsso_token
```

NPSSO 是 PlayStation 登录后的短期/可撤销凭据，等同于敏感令牌，只能放在服务端环境变量中，不能提交到仓库或暴露给浏览器。`psn-api` 会用它换取 PSN access token，再请求用户搜索、奖杯标题、游玩记录和资料接口。

PSN 资料的隐私设置会影响结果：如果目标账号隐藏了奖杯或游玩历史，接口只能返回部分数据，应用会保留能读取到的记录。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`，输入 PSN Online ID。

## 当前分析内容

- 概览：PlayStation 游玩时长、奖杯数、最近活动和游戏拼图
- 游戏库：搜索、排序、平台、时长、奖杯进度
- 奖杯：已完成、进行中、未开始和铜/银/金/白金统计
- 时间线：最近游玩/奖杯活动、历史活动和长期搁置游戏
- 图表：时长分布、奖杯进度分布、平台分布和游玩时长排行

PSN 不提供购买价格和用户评测字段，因此原来的评价页已改为奖杯进度页，避免使用虚构数据。
