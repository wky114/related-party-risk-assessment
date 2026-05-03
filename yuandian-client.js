const axios = require('axios');

class YuandianClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.YUANDIAN_API_KEY;
    this.baseURL = 'https://open.chineselaw.com/open';
    this.client = axios.create({
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  // 通用请求方法
  async request(url, params = {}) {
    try {
      const response = await this.client.get(url, { params });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`元典API错误 [${error.response.status}]: ${error.response.data?.message || error.message}`);
      }
      throw new Error(`元典API请求失败: ${error.message}`);
    }
  }

  // ============ 企业基本信息 ============

  // 通过企业ID获取企业基本信息
  async getEnterpriseById(id) {
    return this.request(`${this.baseURL}/rh_enterpriseBaseInfo`, { id });
  }

  // 通过统一社会信用代码获取企业基本信息
  async getEnterpriseByCode(tyshxydm) {
    return this.request(`${this.baseURL}/rh_enterpriseBaseInfo`, { tyshxydm });
  }

  // 获取企业基本信息（自动判断参数类型）
  async getEnterpriseBaseInfo(params) {
    if (params.id) {
      return this.getEnterpriseById(params.id);
    }
    if (params.tyshxydm) {
      return this.getEnterpriseByCode(params.tyshxydm);
    }
    throw new Error('请提供企业ID或统一社会信用代码');
  }

  // ============ 关联方风险分析 ============

  // 获取关联交易风险数据（需要企业ID或统一社会信用代码）
  async getRelatedPartyRiskData(identifier) {
    const results = {};

    try {
      // 尝试通过ID或统一社会信用代码查询
      const params = {};
      if (identifier.includes('-')) {
        // 假设是UUID格式的企业ID
        params.id = identifier;
      } else {
        // 假设是统一社会信用代码
        params.tyshxydm = identifier;
      }

      results.baseInfo = await this.getEnterpriseBaseInfo(params);
    } catch (error) {
      results.baseInfo = { error: error.message };
    }

    return results;
  }

  // 获取连接状态
  async testConnection() {
    try {
      // 使用百度的企业ID测试连接
      const result = await this.getEnterpriseById('a80a4cc8-9954-4dd3-bcaf-aebb99487b14');
      return {
        success: result.code === 200,
        message: result.code === 200 ? '元典API连接正常' : '元典API返回异常',
        baseURL: this.baseURL,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: '元典API连接失败',
        error: error.message
      };
    }
  }
}

module.exports = YuandianClient;
