# AI关联交易风险评估平台

基于 DeepSeek AI + 天眼查 + 企查查 + 元典 的智能关联交易风险评估系统。

## 功能特性

- **AI智能分析** - 使用 DeepSeek 大模型对关联交易进行多维度风险评估
- **三源数据融合** - 集成天眼查、企查查、元典三大数据源，交叉验证
- **风险等级评估** - 0-100分量化评分，低/中/高/极高四级风险
- **合规建议生成** - 自动生成合规建议和风险提示
- **关联方管理** - 支持自定义关联方清单

## 数据源

| 数据源 | 功能 | 状态 |
|-------|------|------|
| 天眼查MCP | 企业搜索、股东、高管、风险信息 | ✅ |
| 企查查MCP | 登记信息、股东、实际控制人、对外投资 | ✅ |
| 元典API | 工商信息、股东、核心成员 | ✅ |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入你的API密钥：

```env
# 天眼查MCP
TIANYANCHA_API_KEY=your-key

# 企查查MCP
QCC_API_KEY=your-key

# 元典API
YUANDIAN_API_KEY=your-key

# DeepSeek AI
DEEPSEEK_API_KEY=your-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
```

### 3. 启动服务

```bash
npm run dev
```

访问 http://localhost:3001

## API接口

### 风险评估
```
POST /api/risk-assessment
```

请求示例：
```json
{
  "companyName": "北京百度网讯科技有限公司",
  "amount": 1000,
  "transactionType": "借款",
  "dataSources": ["tianyancha", "qichacha", "yuandian"]
}
```

### 其他接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/test-connections` | GET | 测试数据源连接 |
| `/api/related-parties` | GET | 获取关联方清单 |
| `/api/tianyancha/company/:name` | GET | 天眼查查询 |
| `/api/qichacha/registration/:key` | GET | 企查查查询 |
| `/api/yuandian/company/code/:code` | GET | 元典查询 |

## 项目结构

```
├── server.js              # 主服务
├── ai-engine.js           # DeepSeek AI引擎
├── mcp-client.js          # 天眼查MCP客户端
├── qcc-mcp-client.js      # 企查查MCP客户端
├── yuandian-client.js     # 元典API客户端
├── related-parties.json   # 关联方清单
├── .env.example           # 环境变量示例
└── public/
    └── index.html         # 前端界面
```

## 技术栈

- **后端**: Node.js + Express
- **AI**: DeepSeek API (OpenAI兼容)
- **数据源**: MCP协议 + REST API
- **前端**: 原生HTML/CSS/JS

## 开源协议

MIT License
