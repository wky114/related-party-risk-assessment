const { Client } = require('@modelcontextprotocol/sdk/client');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

class QichachaMCPClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.QCC_API_KEY;
    this.baseURLs = {
      company: config.companyURL || 'https://agent.qcc.com/mcp/company/stream',
      risk: config.riskURL || 'https://agent.qcc.com/mcp/risk/stream',
      ipr: config.iprURL || 'https://agent.qcc.com/mcp/ipr/stream',
      operation: config.operationURL || 'https://agent.qcc.com/mcp/operation/stream',
      executive: config.executiveURL || 'https://agent.qcc.com/mcp/executive/stream'
    };

    this.clients = {};
    this.isConnected = false;
    this.lastError = null;
    this.availableTools = {};
  }

  buildHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  buildTransport(url) {
    return new StreamableHTTPClientTransport(
      new URL(url),
      {
        requestInit: {
          headers: this.buildHeaders()
        }
      }
    );
  }

  async connectModule(moduleName) {
    if (this.clients[moduleName]?.connected) {
      return this.clients[moduleName].client;
    }

    const url = this.baseURLs[moduleName];
    if (!url) {
      throw new Error(`未知的企查查模块: ${moduleName}`);
    }

    const client = new Client(
      { name: `qcc-${moduleName}`, version: '1.0.0' },
      { capabilities: {} }
    );

    const transport = this.buildTransport(url);

    try {
      await client.connect(transport);
      const toolsResult = await client.listTools();

      this.clients[moduleName] = {
        client,
        transport,
        connected: true,
        tools: toolsResult.tools || []
      };

      this.availableTools[moduleName] = toolsResult.tools || [];
      this.isConnected = true;

      return client;
    } catch (error) {
      this.lastError = error.message;
      throw new Error(`连接企查查${moduleName}模块失败: ${error.message}`);
    }
  }

  async connectAll() {
    const modules = Object.keys(this.baseURLs);
    const results = await Promise.allSettled(
      modules.map(m => this.connectModule(m))
    );

    const failed = results
      .map((r, i) => r.status === 'rejected' ? modules[i] : null)
      .filter(Boolean);

    if (failed.length === modules.length) {
      throw new Error('所有企查查模块连接失败');
    }

    return {
      connected: modules.filter(m => !failed.includes(m)),
      failed
    };
  }

  async callTool(moduleName, toolName, args = {}) {
    let client = this.clients[moduleName]?.client;

    if (!client) {
      client = await this.connectModule(moduleName);
    }

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args
      });

      return this.extractResult(result);
    } catch (error) {
      throw new Error(`调用企查查${moduleName}.${toolName}失败: ${error.message}`);
    }
  }

  extractResult(result) {
    if (!result) return null;

    if (result.structuredContent) {
      return result.structuredContent;
    }

    if (Array.isArray(result.content)) {
      return result.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
    }

    return result.content || result;
  }

  // 企查查使用 searchKey 参数（支持企业名称或统一社会信用代码）

  // 获取企业登记信息
  async getCompanyRegistrationInfo(searchKey) {
    return this.callTool('company', 'get_company_registration_info', { searchKey });
  }

  // 获取股东信息
  async getShareholderInfo(searchKey) {
    return this.callTool('company', 'get_shareholder_info', { searchKey });
  }

  // 获取主要人员
  async getKeyPersonnel(searchKey) {
    return this.callTool('company', 'get_key_personnel', { searchKey });
  }

  // 获取实际控制人
  async getActualController(searchKey) {
    return this.callTool('company', 'get_actual_controller', { searchKey });
  }

  // 获取对外投资
  async getExternalInvestments(searchKey) {
    return this.callTool('company', 'get_external_investments', { searchKey });
  }

  // 获取受益所有人
  async getBeneficialOwners(searchKey) {
    return this.callTool('company', 'get_beneficial_owners', { searchKey });
  }

  // 获取分支机构
  async getBranches(searchKey) {
    return this.callTool('company', 'get_branches', { searchKey });
  }

  // 获取企业全景信息
  async getCompanyFullProfile(searchKey) {
    const results = {};

    const tasks = [
      { key: 'registration', fn: () => this.getCompanyRegistrationInfo(searchKey) },
      { key: 'shareholders', fn: () => this.getShareholderInfo(searchKey) },
      { key: 'personnel', fn: () => this.getKeyPersonnel(searchKey) },
      { key: 'controller', fn: () => this.getActualController(searchKey) },
      { key: 'investments', fn: () => this.getExternalInvestments(searchKey) }
    ];

    const settled = await Promise.allSettled(tasks.map(t => t.fn()));

    tasks.forEach((task, i) => {
      if (settled[i].status === 'fulfilled') {
        results[task.key] = settled[i].value;
      } else {
        results[task.key] = { error: settled[i].reason.message };
      }
    });

    return results;
  }

  // 获取关联交易风险数据
  async getRelatedPartyRiskData(searchKey) {
    const results = {};

    const tasks = [
      { key: 'registration', fn: () => this.getCompanyRegistrationInfo(searchKey) },
      { key: 'shareholders', fn: () => this.getShareholderInfo(searchKey) },
      { key: 'controller', fn: () => this.getActualController(searchKey) },
      { key: 'investments', fn: () => this.getExternalInvestments(searchKey) }
    ];

    const settled = await Promise.allSettled(tasks.map(t => t.fn()));

    tasks.forEach((task, i) => {
      if (settled[i].status === 'fulfilled') {
        results[task.key] = settled[i].value;
      } else {
        results[task.key] = { error: settled[i].reason.message };
      }
    });

    return results;
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      lastError: this.lastError,
      modules: Object.keys(this.clients).map(name => ({
        name,
        connected: this.clients[name]?.connected || false,
        tools: (this.availableTools[name] || []).map(t => t.name)
      }))
    };
  }

  async close() {
    for (const [name, client] of Object.entries(this.clients)) {
      try {
        await client.transport?.close();
      } catch (e) {
        // 忽略关闭错误
      }
    }
    this.clients = {};
    this.isConnected = false;
  }
}

module.exports = QichachaMCPClient;
