const axios = require('axios');

class AIRiskEngine {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY;
    this.baseURL = config.baseURL || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    this.model = config.model || process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';
    this.maxTokens = config.maxTokens || 4096;
  }

  // 生成关联交易风险评估报告
  async generateRiskReport(transaction, companyDataResults, relatedParties) {
    const prompt = this.buildAnalysisPrompt(transaction, companyDataResults, relatedParties);

    try {
      const response = await axios.post(
        `${this.baseURL}/v1/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的上市公司关联交易风险评估专家，精通《上海证券交易所股票上市规则》。请用中文回答，并以JSON格式输出分析报告。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.maxTokens,
          temperature: 0.3,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      const content = response.data.choices[0].message.content;
      return this.parseReport(content);
    } catch (error) {
      console.error('AI分析失败:', error.response?.data || error.message);
      throw new Error(`AI风险评估失败: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // 构建分析提示词
  buildAnalysisPrompt(transaction, companyDataResults, relatedParties) {
    const tianyanchaData = companyDataResults?.tianyancha;
    const qichachaData = companyDataResults?.qichacha;
    const yuandianData = companyDataResults?.yuandian;

    return `请分析以下关联交易的风险情况。

## 交易信息
- 交易对方: ${transaction.companyName}
- 交易金额: ${transaction.amount}万元
- 交易类型: ${transaction.transactionType || '其他'}
- 我方主体: ${transaction.ourEntity || '北京三元食品股份有限公司'}

## 多源企业数据

### 天眼查数据
${tianyanchaData ? JSON.stringify(tianyanchaData, null, 2) : '暂无数据'}

### 企查查数据
${qichachaData ? JSON.stringify(qichachaData, null, 2) : '暂无数据'}

### 元典法律数据
${yuandianData ? JSON.stringify(yuandianData, null, 2) : '暂无数据'}

## 关联方清单
${JSON.stringify(relatedParties, null, 2)}

## 输出要求
请以JSON格式输出以下字段：

{
  "relationIdentification": {
    "isRelated": true/false,
    "relationType": "关联关系类型",
    "basis": "认定依据"
  },
  "complianceAnalysis": {
    "ruleReference": "引用的规则条款",
    "requiresApproval": true/false,
    "requiresDisclosure": true/false,
    "details": "详细说明"
  },
  "riskLevel": {
    "level": "低/中/高/极高",
    "score": 0-100,
    "mainRisks": ["风险点1", "风险点2"]
  },
  "fairnessAnalysis": {
    "isFair": true/false,
    "riskOfBenefitTransfer": true/false,
    "suggestions": "建议"
  },
  "legalRisk": {
    "litigationCount": 0,
    "executionCount": 0,
    "dishonestyCount": 0,
    "summary": "法律风险概述"
  },
  "crossValidation": {
    "isConsistent": true/false,
    "differences": ["差异1"],
    "reliability": "高/中/低"
  },
  "recommendations": ["建议1", "建议2"],
  "conclusion": {
    "summary": "一句话结论",
    "keyRisks": "关键风险提示"
  }
}`;
  }

  // 解析AI返回的报告
  parseReport(text) {
    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch (error) {
      console.error('解析报告失败:', error);
      return {
        rawReport: text,
        error: '报告解析失败，请查看原始文本'
      };
    }
  }

  // 批量风险扫描
  async batchRiskScan(transactions, companyDataMap, relatedParties) {
    const results = [];

    for (const tx of transactions) {
      const companyData = companyDataMap[tx.companyName] || null;
      try {
        const report = await this.generateRiskReport(tx, companyData, relatedParties);
        results.push({
          transaction: tx,
          report,
          status: 'success'
        });
      } catch (error) {
        results.push({
          transaction: tx,
          error: error.message,
          status: 'failed'
        });
      }

      await this.delay(1000);
    }

    return results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AIRiskEngine;
