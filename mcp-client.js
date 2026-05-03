const fs = require('fs');
const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

class TianyanchaMCPClient {
  constructor(apiKey, baseURL) {
    this.apiKey = apiKey;
    this.baseURL = baseURL || 'https://mcp-service.tianyancha.com/sse';
    this.client = null;
    this.transport = null;
    this.isConnected = false;
    this.lastError = null;
    this.availableTools = [];
  }

  async ensureConnected() {
    if (this.client && this.isConnected) {
      return this.client;
    }

    const client = new Client(
      { name: 'rpt-server', version: '1.0.0' },
      { capabilities: {} }
    );

    const transport = new SSEClientTransport(
      new URL(this.baseURL),
      {
        requestInit: {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      }
    );

    try {
      await client.connect(transport);
      const toolsResult = await client.listTools();

      this.client = client;
      this.transport = transport;
      this.availableTools = toolsResult.tools || [];
      this.isConnected = true;
      this.lastError = null;

      return client;
    } catch (error) {
      this.lastError = error.message;
      this.isConnected = false;
      throw new Error(`连接天眼查MCP失败: ${error.message}`);
    }
  }

  async callTool(name, args) {
    const client = await this.ensureConnected();

    try {
      const result = await client.callTool({
        name,
        arguments: args || {}
      });

      return this.extractResult(result);
    } catch (error) {
      throw new Error(`调用工具${name}失败: ${error.message}`);
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

  async searchCompany(keyword) {
    const result = await this.callTool('search_companies', { keyword });
    return this.parseSearchResult(result, keyword);
  }

  parseSearchResult(text, keyword) {
    // 简化解析，返回基本信息
    return {
      code: 200,
      data: {
        companyId: null,
        companyName: keyword,
        raw: text
      }
    };
  }

  async getShareholders(companyId) {
    const result = await this.callTool('get_company_shareholders', { company_id: companyId });
    return { code: 200, data: { shareholders: [], raw: result } };
  }

  async getCompanyPersonnel(companyId) {
    const result = await this.callTool('get_company_personnel', { company_id: companyId });
    return { code: 200, data: { personnel: [], raw: result } };
  }

  async getEquityPenetration(companyId) {
    const shareholdersResult = await this.getShareholders(companyId);
    return {
      code: 200,
      data: {
        ultimateBeneficiaries: [],
        source: 'tianyancha-mcp'
      }
    };
  }

  async testConnection() {
    try {
      await this.ensureConnected();
      return {
        success: true,
        message: 'MCP连接成功',
        endpoint: this.baseURL,
        tools: this.availableTools.map(t => t.name)
      };
    } catch (error) {
      return {
        success: false,
        message: 'MCP连接失败',
        error: error.message
      };
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      lastError: this.lastError,
      endpoint: this.baseURL,
      availableTools: this.availableTools.map(t => t.name)
    };
  }

  async close() {
    if (this.transport) {
      await this.transport.close();
    }
    this.client = null;
    this.transport = null;
    this.isConnected = false;
  }
}

module.exports = TianyanchaMCPClient;
