# AI关联交易风险评估平台

> 基于多源数据融合的上市公司关联交易智能风险评估系统

## 项目简介

本项目是一个AI驱动的关联交易风险评估工具，旨在帮助上市公司、审计机构和监管部门快速识别和评估关联交易的合规风险。

### 解决的问题

- **人工审核效率低** - 传统关联交易审核依赖人工查阅多个数据源，耗时耗力
- **数据源单一** - 单一数据源难以全面评估风险
- **合规判断复杂** - 《上海证券交易所股票上市规则》条款众多，人工判断易遗漏

### 解决方案

- **AI智能分析** - 使用DeepSeek大模型自动分析关联交易风险
- **多源数据融合** - 集成天眼查、企查查、元典三大数据源，交叉验证
- **自动化报告** - 一键生成风险评估报告和合规建议

---

## 功能特性

| 功能 | 说明 |
|------|------|
| 关联关系认定 | 自动判断交易是否构成关联交易 |
| 风险等级评估 | 0-100分量化评分，四级风险预警 |
| 合规性分析 | 引用具体规则条款，判断审议和披露要求 |
| 交易公允性分析 | 评估定价是否公允，识别利益输送风险 |
| 法律风险分析 | 查询涉诉、被执行、失信记录 |
| 数据交叉验证 | 多源数据比对，提高评估准确性 |
| 合规建议生成 | 自动生成合规建议和风险防控措施 |

---

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端界面 (HTML/CSS/JS)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express API Server                        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │  天眼查MCP   │   │  企查查MCP   │   │   元典API    │
    │  (SSE协议)   │   │ (Streamable │   │  (REST API)  │
    │             │   │    HTTP)    │   │             │
    └─────────────┘   └─────────────┘   └─────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                    ┌─────────────────┐
                    │  DeepSeek AI    │
                    │  风险分析引擎    │
                    └─────────────────┘
```

---

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 1. 克隆项目

```bash
git clone https://github.com/wky114/related-party-risk-assessment.git
cd related-party-risk-assessment
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的API密钥：

```env
# 天眼查MCP - 从 https://mcp.tianyancha.com 获取
TIANYANCHA_API_KEY=your-tianyancha-api-key
TIANYANCHA_BASE_URL=https://mcp-service.tianyancha.com/sse

# 企查查MCP - 从 https://agent.qcc.com 获取
QCC_API_KEY=your-qichacha-api-key

# 元典API - 从 https://open.chineselaw.com 获取
YUANDIAN_API_KEY=your-yuandian-api-key

# DeepSeek AI - 从 https://platform.deepseek.com 获取
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro

# 服务端口
PORT=3001
```

### 4. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

### 5. 访问应用

打开浏览器访问：http://localhost:3001

---

## 使用指南

### Web界面使用

1. 打开 http://localhost:3001
2. 输入交易对方公司名称
3. 输入交易金额（万元）
4. 选择交易类型
5. 选择数据源（可多选）
6. 点击"开始AI风险评估"
7. 等待分析完成，查看风险评估报告

### API调用示例

**风险评估接口**

```bash
curl -X POST http://localhost:3001/api/risk-assessment \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "北京百度网讯科技有限公司",
    "amount": 1000,
    "transactionType": "借款",
    "dataSources": ["tianyancha", "qichacha"]
  }'
```

**响应示例**

```json
{
  "code": 200,
  "data": {
    "transaction": { ... },
    "companyData": { ... },
    "riskReport": {
      "relationIdentification": {
        "isRelated": true,
        "relationType": "实际控制人控制的企业",
        "basis": "根据股权穿透分析..."
      },
      "riskLevel": {
        "level": "中",
        "score": 55,
        "mainRisks": ["...", "..."]
      },
      "recommendations": ["...", "..."],
      "conclusion": {
        "summary": "本次交易构成关联交易，需履行审议程序",
        "keyRisks": "..."
      }
    }
  }
}
```

---

## API文档

### 风险评估

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/risk-assessment` | POST | 单笔交易风险评估 |
| `/api/batch-scan` | POST | 批量风险扫描 |

### 数据源查询

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/tianyancha/company/:name` | GET | 天眼查企业查询 |
| `/api/qichacha/registration/:key` | GET | 企查查企业查询 |
| `/api/yuandian/company/code/:code` | GET | 元典企业查询 |

### 系统接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/test-connections` | GET | 测试数据源连接 |
| `/api/related-parties` | GET | 获取关联方清单 |

---

## 数据源说明

### 天眼查MCP

- **协议**: MCP over SSE
- **功能**: 企业搜索、股东信息、高管信息、风险信息、招投标
- **申请**: https://mcp.tianyancha.com

### 企查查MCP

- **协议**: MCP over Streamable HTTP
- **功能**: 企业登记、股东、实际控制人、对外投资、财务数据
- **申请**: https://agent.qcc.com

### 元典API

- **协议**: REST API
- **功能**: 工商信息、股东、核心成员
- **申请**: https://open.chineselaw.com

---

## 项目结构

```
├── server.js              # Express主服务
├── ai-engine.js           # DeepSeek AI分析引擎
├── mcp-client.js          # 天眼查MCP客户端
├── qcc-mcp-client.js      # 企查查MCP客户端
├── yuandian-client.js     # 元典API客户端
├── related-parties.json   # 关联方清单配置
├── package.json           # 项目配置
├── .env.example           # 环境变量示例
├── .gitignore             # Git忽略文件
└── public/
    └── index.html         # 前端界面
```

---

## 技术栈

| 类型 | 技术 |
|------|------|
| 后端框架 | Node.js + Express |
| AI模型 | DeepSeek API (OpenAI兼容) |
| 数据协议 | MCP (Model Context Protocol) + REST |
| 前端 | 原生HTML/CSS/JavaScript |
| 工具库 | axios, dotenv, cors |

---

## 创新点

1. **多源数据融合** - 首创集成天眼查、企查查、元典三大数据源，通过交叉验证提高评估准确性

2. **MCP协议支持** - 同时支持SSE和Streamable HTTP两种MCP传输协议，兼容不同数据源

3. **AI驱动分析** - 使用DeepSeek大模型进行智能分析，自动生成结构化风险报告

4. **关联方清单管理** - 支持自定义关联方清单，结合AI分析提高关联关系识别准确率

---

## 应用场景

- **上市公司** - 内部关联交易合规审核
- **审计机构** - 关联交易审计辅助工具
- **监管部门** - 关联交易监管筛查
- **投资机构** - 投资标的关联风险评估

---

## 开源协议

MIT License

---

## 联系方式

- GitHub: https://github.com/wky114/related-party-risk-assessment
