const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const TianyanchaMCPClient = require('./mcp-client');
const QichachaMCPClient = require('./qcc-mcp-client');
const YuandianClient = require('./yuandian-client');
const AIRiskEngine = require('./ai-engine');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 初始化天眼查MCP客户端
const tianyanchaClient = new TianyanchaMCPClient(
  process.env.TIANYANCHA_API_KEY || 'your-api-key',
  process.env.TIANYANCHA_BASE_URL || 'https://mcp-service.tianyancha.com/sse'
);

// 初始化企查查MCP客户端
const qichachaClient = new QichachaMCPClient({
  apiKey: process.env.QCC_API_KEY || 'your-qcc-api-key'
});

// 初始化元典客户端
const yuandianClient = new YuandianClient({
  apiKey: process.env.YUANDIAN_API_KEY || 'sk_KaBAsMNeVYQqAmXTqQdvZpzRooEYRPx5'
});

// 初始化AI风险评估引擎
const aiEngine = new AIRiskEngine({
  apiKey: process.env.CLAUDE_API_KEY
});

// 加载关联方清单
let relatedParties = { companies: [], persons: [] };
try {
  relatedParties = require('./related-parties.json');
} catch (e) {
  console.warn('未找到关联方清单文件');
}

// ============ 健康检查 ============

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    features: ['ai-risk-assessment', 'tianyancha-mcp', 'qichacha-mcp', 'yuandian-api', 'batch-scan'],
    dataSources: {
      tianyancha: tianyanchaClient.getStatus(),
      qichacha: qichachaClient.getStatus(),
      yuandian: { baseURL: 'https://open.chineselaw.com/open' }
    },
    timestamp: new Date().toISOString()
  });
});

// 测试所有数据源连接
app.get('/api/test-connections', async (req, res) => {
  const results = {};

  // 测试天眼查
  try {
    results.tianyancha = await tianyanchaClient.testConnection();
  } catch (error) {
    results.tianyancha = { success: false, error: error.message };
  }

  // 测试企查查
  try {
    const qccStatus = await qichachaClient.connectAll();
    results.qichacha = { success: true, ...qccStatus };
  } catch (error) {
    results.qichacha = { success: false, error: error.message };
  }

  // 测试元典
  try {
    results.yuandian = await yuandianClient.testConnection();
  } catch (error) {
    results.yuandian = { success: false, error: error.message };
  }

  res.json({ code: 200, data: results });
});

// ============ AI风险评估接口 ============

// 单笔交易AI风险评估
app.post('/api/risk-assessment', async (req, res) => {
  try {
    const { companyName, amount, transactionType, ourEntity, dataSources } = req.body;

    if (!companyName || amount === undefined) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数：companyName 和 amount'
      });
    }

    const transaction = {
      companyName: String(companyName).trim(),
      amount: Number(amount),
      transactionType: transactionType || '其他',
      ourEntity: ourEntity || '北京三元食品股份有限公司'
    };

    // 默认启用的数据源
    const enabledSources = dataSources || ['tianyancha', 'qichacha', 'yuandian'];

    console.log(`[${new Date().toISOString()}] AI风险评估开始: ${transaction.companyName}`);

    // 并行查询多个数据源
    const companyDataResults = {};

    if (enabledSources.includes('tianyancha')) {
      try {
        const searchResult = await tianyanchaClient.searchCompany(transaction.companyName);
        companyDataResults.tianyancha = searchResult?.data || null;
      } catch (error) {
        console.error('天眼查查询失败:', error.message);
        companyDataResults.tianyancha = { error: error.message };
      }
    }

    if (enabledSources.includes('qichacha')) {
      try {
        // 企查查使用 searchKey 参数，支持企业名称或统一社会信用代码
        companyDataResults.qichacha = await qichachaClient.getCompanyFullProfile(transaction.companyName);
      } catch (error) {
        console.error('企查查查询失败:', error.message);
        companyDataResults.qichacha = { error: error.message };
      }
    }

    if (enabledSources.includes('yuandian')) {
      try {
        // 元典需要企业ID或统一社会信用代码，先从其他数据源获取
        let yuandianIdentifier = null;

        // 尝试从天眼查数据中获取统一社会信用代码
        if (companyDataResults.tianyancha?.creditCode) {
          yuandianIdentifier = companyDataResults.tianyancha.creditCode;
        }
        // 尝试从企查查数据中获取
        else if (companyDataResults.qichacha?.info?.creditCode) {
          yuandianIdentifier = companyDataResults.qichacha.info.creditCode;
        }

        if (yuandianIdentifier) {
          companyDataResults.yuandian = await yuandianClient.getEnterpriseByCode(yuandianIdentifier);
        } else {
          companyDataResults.yuandian = { error: '无法获取企业统一社会信用代码，元典查询跳过' };
        }
      } catch (error) {
        console.error('元典查询失败:', error.message);
        companyDataResults.yuandian = { error: error.message };
      }
    }

    // AI风险评估（传入多源数据）
    const report = await aiEngine.generateRiskReport(transaction, companyDataResults, relatedParties);

    console.log(`[${new Date().toISOString()}] AI风险评估完成: ${transaction.companyName}`);

    res.json({
      code: 200,
      data: {
        transaction,
        companyData: companyDataResults,
        dataSourcesUsed: enabledSources,
        riskReport: report,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('风险评估失败:', error);
    res.status(500).json({
      code: 500,
      message: '风险评估失败',
      error: error.message
    });
  }
});

// 批量风险扫描
app.post('/api/batch-scan', async (req, res) => {
  try {
    const { transactions, dataSources } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请提供交易列表'
      });
    }

    console.log(`[${new Date().toISOString()}] 批量扫描开始: ${transactions.length}笔交易`);

    const results = [];
    for (const tx of transactions) {
      try {
        // 为每笔交易调用风险评估
        const response = await fetch(`http://localhost:${PORT}/api/risk-assessment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...tx, dataSources })
        });
        const result = await response.json();
        results.push({ transaction: tx, ...result });
      } catch (error) {
        results.push({ transaction: tx, error: error.message, status: 'failed' });
      }
    }

    console.log(`[${new Date().toISOString()}] 批量扫描完成`);

    res.json({
      code: 200,
      data: {
        total: transactions.length,
        results,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('批量扫描失败:', error);
    res.status(500).json({
      code: 500,
      message: '批量扫描失败',
      error: error.message
    });
  }
});

// ============ 数据源独立接口 ============

// 天眼查 - 查询企业信息
app.get('/api/tianyancha/company/:name', async (req, res) => {
  try {
    const companyName = decodeURIComponent(req.params.name);
    const data = await tianyanchaClient.searchCompany(companyName);
    res.json(data);
  } catch (error) {
    res.status(502).json({ code: 502, message: '天眼查查询失败', error: error.message });
  }
});

// 企查查 - 查询企业登记信息
app.get('/api/qichacha/registration/:searchKey', async (req, res) => {
  try {
    const searchKey = decodeURIComponent(req.params.searchKey);
    const data = await qichachaClient.getCompanyRegistrationInfo(searchKey);
    res.json({ code: 200, data });
  } catch (error) {
    res.status(502).json({ code: 502, message: '企查查查询失败', error: error.message });
  }
});

// 企查查 - 获取股东信息
app.get('/api/qichacha/shareholders/:searchKey', async (req, res) => {
  try {
    const searchKey = decodeURIComponent(req.params.searchKey);
    const data = await qichachaClient.getShareholderInfo(searchKey);
    res.json({ code: 200, data });
  } catch (error) {
    res.status(502).json({ code: 502, message: '获取股东信息失败', error: error.message });
  }
});

// 企查查 - 获取企业全景
app.get('/api/qichacha/profile/:searchKey', async (req, res) => {
  try {
    const searchKey = decodeURIComponent(req.params.searchKey);
    const data = await qichachaClient.getCompanyFullProfile(searchKey);
    res.json({ code: 200, data });
  } catch (error) {
    res.status(502).json({ code: 502, message: '获取企业信息失败', error: error.message });
  }
});

// 元典 - 通过企业ID查询
app.get('/api/yuandian/company/id/:id', async (req, res) => {
  try {
    const data = await yuandianClient.getEnterpriseById(req.params.id);
    res.json({ code: 200, data });
  } catch (error) {
    res.status(502).json({ code: 502, message: '元典查询失败', error: error.message });
  }
});

// 元典 - 通过统一社会信用代码查询
app.get('/api/yuandian/company/code/:tyshxydm', async (req, res) => {
  try {
    const data = await yuandianClient.getEnterpriseByCode(req.params.tyshxydm);
    res.json({ code: 200, data });
  } catch (error) {
    res.status(502).json({ code: 502, message: '元典查询失败', error: error.message });
  }
});

// ============ 关联方管理 ============

app.get('/api/related-parties', (req, res) => {
  res.json({ code: 200, data: relatedParties });
});

// 启动服务
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('AI驱动的关联交易风险评估平台 v2.0');
  console.log('='.repeat(60));
  console.log(`服务地址: http://localhost:${PORT}`);
  console.log(`前端页面: http://localhost:${PORT}/`);
  console.log('数据源: 天眼查MCP + 企查查MCP + 元典API');
  console.log('='.repeat(60));
});
