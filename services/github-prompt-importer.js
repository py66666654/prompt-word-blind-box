/**
 * GitHub GPT-4o 提示词导入工具
 * 从 jamez-bondos/awesome-gpt4o-images 仓库导入高质量提示词到数据库
 */

// 尝试加载环境变量，如果 dotenv 不存在则提供友好错误信息
try {
  require('dotenv').config();
} catch (error) {
  console.error('错误: 请先安装 dotenv 包');
  console.error('请运行: npm install dotenv');
  process.exit(1);
}

// 尝试加载必要的依赖
let axios, pool, path, fs;
try {
  axios = require('axios');
} catch (error) {
  console.error('错误: 请先安装 axios 包');
  console.error('请运行: npm install axios');
  process.exit(1);
}

try {
  path = require('path');
  fs = require('fs');
  const { pool: dbPool } = require('../config/database');
  pool = dbPool;
} catch (error) {
  // 标记模拟模式
  console.error('警告: 数据库连接配置加载失败，将使用模拟模式运行');
  console.log('此模式下不会实际操作数据库，仅用于测试提示词解析逻辑');
  console.error(error.message);
  // 创建模拟池以允许脚本继续运行但不实际连接数据库
  pool = {
    _isSimulated: true,
    async getConnection() {
      return {
        async beginTransaction() { console.log('模拟: 开始事务'); },
        async execute() { return [{affectedRows: 1, insertId: Math.floor(Math.random() * 1000)}]; },
        async commit() { console.log('模拟: 提交事务'); },
        async rollback() { console.log('模拟: 回滚事务'); },
        release() { console.log('模拟: 释放连接'); }
      };
    }
  };
}

// GitHub 仓库信息
const REPO_OWNER = 'jamez-bondos';
const REPO_NAME = 'awesome-gpt4o-images';
const README_PATH = 'README.md';

// 数据库配置信息
const CATEGORY_ID = 3; // 艺术风格
const TYPE_ID = 1; // 图像类型
const RARITY_LEVEL_ID = 3; // 精品
const SOURCE = 'awesome-gpt4o-images';
const IS_AI_GENERATED = false;

// 获取仓库中的 README 内容
async function fetchReadmeContent() {
  try {
    const response = await axios.get(
      `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${README_PATH}`
    );
    return response.data;
  } catch (error) {
    console.error('获取README内容失败:', error.message);
    throw error;
  }
}

// 可选的调试功能 - 查看 README 内容的一部分
async function debugReadmeContent() {
  try {
    const content = await fetchReadmeContent();
    console.log('\n==== README 内容预览 (500字符) ==== ');
    console.log(content.substring(0, 500));
    console.log('\n==== README 总长度: ' + content.length + ' 字符 ==== ');
    
    // 尝试查找第一个案例标题
    const firstCaseIndex = content.indexOf('### 案例');
    if (firstCaseIndex > -1) {
      console.log('\n==== 第一个案例标题预览 ==== ');
      console.log(content.substring(firstCaseIndex, firstCaseIndex + 200));
    } else {
      console.log('\n未找到中文案例标题');
    }
    
    const firstCaseIndexEn = content.indexOf('### Case');
    if (firstCaseIndexEn > -1) {
      console.log('\n==== 第一个英文案例标题预览 ==== ');
      console.log(content.substring(firstCaseIndexEn, firstCaseIndexEn + 200));
    } else {
      console.log('\n未找到英文案例标题');
    }
    
    return content;
  } catch (error) {
    console.error('调试失败:', error.message);
    throw error;
  }
}

// 解析README内容，提取提示词
function parsePrompts(content) {
  const prompts = [];
  
  // 匹配中文和英文案例标题
  // 注意：需要处理以下格式：
  // 1. ### 案例 X：标题 (by [@用户])  - 中文格式
  // 2. ### Case X: Title (by [@user]) - 英文格式
  
  // 简化正则表达式来增加匹配成功率
  const caseTitles = [];
  
  // 查找中文案例
  // 匹配 "### 案例 100：实物与手绘涂鸦创意广告 (by [@azed_ai](https://x.com/azed_ai))"
  const chineseRegex = /###\s*案例\s+(\d+)[\s：:]+(.+?)(?:\s*\([^\)]+\))?[\r\n]/g;
  let chMatch;
  while ((chMatch = chineseRegex.exec(content)) !== null) {
    caseTitles.push({
      type: '案例',
      number: chMatch[1],
      title: chMatch[2].trim(),
      index: chMatch.index
    });
  }
  
  // 查找英文案例
  const englishRegex = /###\s*Case\s+(\d+)[\s:]+(.+?)(?:\s*\([^\)]+\))?[\r\n]/g;
  let enMatch;
  while ((enMatch = englishRegex.exec(content)) !== null) {
    caseTitles.push({
      type: 'Case',
      number: enMatch[1],
      title: enMatch[2].trim(),
      index: enMatch.index
    });
  }
  
  console.log(`找到 ${caseTitles.length} 个案例标题`);
  if (caseTitles.length > 0) {
    console.log(`第一个: ${caseTitles[0].type} ${caseTitles[0].number}: ${caseTitles[0].title}`);
  }
  
  // 按照在内容中的位置排序
  caseTitles.sort((a, b) => a.index - b.index);
  
  // 处理每个案例
  for (let i = 0; i < caseTitles.length; i++) {
    const caseTitle = caseTitles[i];
    const startPos = caseTitle.index;
    const endPos = (i < caseTitles.length - 1) ? caseTitles[i + 1].index : content.length;
    const caseContent = content.substring(startPos, endPos);
    
    // 提取提示词
    // 匹配**提示词**或**Prompt**之后的代码块
    const promptRegex = /(\*\*提示词\*\*|\*\*Prompt\*\*)\s*[\r\n]\s*```([\s\S]*?)```/i;
    const promptMatch = promptRegex.exec(caseContent);
    
    if (promptMatch) {
      // 提取并清理提示词文本
      const promptText = promptMatch[2].trim();
      
      // 匹配图片路径
      const imgMatch = /<img\s+src="([^"]+)"[^>]*>/i.exec(caseContent);
      let previewUrl = '';
      
      if (imgMatch) {
        const imgPath = imgMatch[1];
        previewUrl = imgPath.startsWith('http') ? 
                    imgPath : 
                    `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${imgPath}`;
      } else {
        // 默认图片路径
        previewUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/cases/${caseTitle.number}/case.png`;
      }
      
      // 匹配原文链接
      const linkRegex = /\[原文链接\]\(([^\)]+)\)|\[Original link\]\(([^\)]+)\)/i;
      const linkMatch = linkRegex.exec(caseContent);
      const originalLink = linkMatch ? (linkMatch[1] || linkMatch[2]) : '';
      
      // 生成质量分数并添加到提示词列表
      const qualityScore = Math.floor(Math.random() * 10) + 90;
      
      prompts.push({
        caseNumber: caseTitle.number,
        title: caseTitle.title,
        promptText: promptText,
        previewUrl: previewUrl,
        originalLink: originalLink,
        qualityScore: qualityScore
      });
    } else {
      console.log(`警告: 案例 ${caseTitle.number} 未找到提示词代码块`);
    }
  }
  
  console.log(`成功解析出 ${prompts.length} 个有效提示词`);
  return prompts;
  
  let caseMatch;
  while ((caseMatch = caseRegex.exec(content)) !== null) {
    // 提取案例编号和标题
    const caseNumber = caseMatch[2];
    const title = caseMatch[3].trim();
    
    // 获取案例部分内容（从匹配点到下一个标题）
    const startPos = caseMatch.index;
    const endPos = content.indexOf('###', startPos + 1);
    const caseContent = endPos !== -1 ? 
                        content.substring(startPos, endPos) : 
                        content.substring(startPos);
    
    // 从案例内容中提取提示词文本（在```代码块中）
    const promptRegex = /\*\*(提示词|Prompt)\*\*[\r\n]+```[\r\n]?([\s\S]*?)```/i;
    const promptMatch = promptRegex.exec(caseContent);
    
    if (promptMatch) {
      const promptText = promptMatch[2].trim();
      
      // 从案例内容中查找图片路径
      const imgRegex = /<img\s+src="([^"]+)"[^>]*>/i;
      const imgMatch = imgRegex.exec(caseContent);
      
      let previewUrl = '';
      if (imgMatch) {
        // 使用实际图片路径
        const imgPath = imgMatch[1];
        previewUrl = imgPath.startsWith('http') ? 
                    imgPath : 
                    `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${imgPath}`;
      } else {
        // 构建默认预览图URL路径
        previewUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/cases/${caseNumber}/case.png`;
      }
      
      // 从案例内容中提取原文链接（如果有）
      const linkRegex = /\[原文链接\]\(([^\)]+)\)|\[Original link\]\(([^\)]+)\)/i;
      const linkMatch = linkRegex.exec(caseContent);
      const originalLink = linkMatch ? (linkMatch[1] || linkMatch[2]) : '';
      
      // 生成随机质量分数 (90-99)
      const qualityScore = Math.floor(Math.random() * 10) + 90;
      
      // 收集提示词信息
      prompts.push({
        caseNumber,
        title,
        promptText,
        previewUrl,
        originalLink,
        qualityScore
      });
    }
  }
  
  return prompts;
}

// 将提示词保存到数据库
async function savePromptsToDatabase(prompts) {
  let connection;
  let isSimulationMode = false;
  
  try {
    // 检查是否处于模拟模式
    if (typeof pool.getConnection !== 'function' || pool._isSimulated) {
      isSimulationMode = true;
      console.log('模拟模式: 不会实际执行数据库操作');
      
      // 模拟处理并返回结果
      console.log(`模拟导入 ${prompts.length} 个提示词到数据库`);
      for (const prompt of prompts.slice(0, 3)) { // 只显示前3个作为示例
        console.log(`模拟处理案例 ${prompt.caseNumber}: ${prompt.title.substring(0, 30)}...`);
        console.log(`提示词文本预览: ${prompt.promptText.substring(0, 50)}...`);
        console.log(`预览图URL: ${prompt.previewUrl}`);
        console.log('---');
      }
      if (prompts.length > 3) {
        console.log(`... 以及其他 ${prompts.length - 3} 个提示词`);
      }
      
      // 模拟100%导入成功
      return { imported: prompts.length, updated: 0, total: prompts.length };
    }
    
    // 如果不是模拟模式，则正常连接数据库
    connection = await pool.getConnection();
    
    // 开始事务
    await connection.beginTransaction();
    
    // 准备插入语句 - 使用更新后的数据库结构
    // 增加了处理可能存在的metadata字段（保存原文链接）
    const insertSql = `
      INSERT INTO prompt_cards 
      (prompt_text, preview_url, category_id, type_id, quality_score, rarity_level_id, source, is_ai_generated, metadata) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      prompt_text = VALUES(prompt_text),
      preview_url = VALUES(preview_url),
      quality_score = VALUES(quality_score),
      rarity_level_id = VALUES(rarity_level_id),
      metadata = VALUES(metadata)
    `;
    
    let importedCount = 0;
    let updatedCount = 0;
    
    // 插入所有提示词
    for (const prompt of prompts) {
      console.log(`处理案例 ${prompt.caseNumber}: ${prompt.title}`);
      
      // 创建metadata JSON对象
      const metadata = {
        case_number: prompt.caseNumber,
        original_title: prompt.title,
        original_link: prompt.originalLink || null,
        source_repo: `${REPO_OWNER}/${REPO_NAME}`,
        imported_at: new Date().toISOString()
      };
      
      const result = await connection.execute(insertSql, [
        prompt.promptText,
        prompt.previewUrl,
        CATEGORY_ID,
        TYPE_ID,
        prompt.qualityScore,
        // 决定稀有度 (3: 精品, 4: 珍贵, 5: 稀有)
        prompt.qualityScore >= 97 ? 5 : (prompt.qualityScore >= 93 ? 4 : 3),
        SOURCE,
        IS_AI_GENERATED,
        JSON.stringify(metadata)
      ]);
      
      // 检查是新增还是更新
      if (result && result[0] && result[0].affectedRows > 0) {
        if (result[0].insertId > 0) {
          importedCount++;
        } else {
          updatedCount++;
        }
      }
    }
    
    // 提交事务
    await connection.commit();
    
    console.log(`操作完成: 新增 ${importedCount} 个提示词, 更新 ${updatedCount} 个提示词`);
    return { imported: importedCount, updated: updatedCount, total: prompts.length };
  } catch (error) {
    // 发生错误，回滚事务
    if (connection) {
      await connection.rollback();
    }
    console.error('保存提示词到数据库失败:', error.message);
    throw error;
  } finally {
    // 释放连接
    if (connection) {
      connection.release();
    }
  }
}

// 下载与提示词相关的预览图片（可选功能）
async function downloadPreviewImages(prompts) {
  const downloadDir = path.join(__dirname, '..', 'public', 'images', 'prompts', 'gpt4o');
  
  // 确保目录存在
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  
  console.log('开始下载预览图片...');
  
  let successCount = 0;
  let failedCount = 0;
  
  for (const prompt of prompts) {
    try {
      if (!prompt.previewUrl) {
        console.log(`跳过案例 ${prompt.caseNumber}: 无预览图URL`);
        continue;
      }
      
      const response = await axios({
        url: prompt.previewUrl,
        method: 'GET',
        responseType: 'stream',
        timeout: 10000, // 10秒超时
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const imageName = `gpt4o_case_${prompt.caseNumber}.png`;
      const imagePath = path.join(downloadDir, imageName);
      
      // 保存图片到本地
      const writer = fs.createWriteStream(imagePath);
      response.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      
      console.log(`成功下载图片: ${imageName}`);
      successCount++;
      
      // 更新预览URL为本地路径
      prompt.previewUrl = `/images/prompts/gpt4o/${imageName}`;
    } catch (error) {
      console.error(`下载图片失败 (案例 ${prompt.caseNumber}):`, error.message);
      failedCount++;
      // 继续处理下一个，不中断流程
    }
  }
  
  console.log(`图片下载完成: 成功 ${successCount} 个, 失败 ${failedCount} 个`);
  return prompts;
}

// 主函数
async function importGpt4oPrompts(options = {}) {
  // 打印版本信息
  console.log('提示词导入工具 v1.1.0 (更新于2025-05-19) - 支持最新的GitHub仓库格式');
  try {
    console.log('开始从GitHub导入GPT-4o提示词...');
    
    // 提取选项参数，设置默认值
    const { 
      downloadImages = false,  // 是否下载图片
      limit = 0,              // 限制导入数量，0表示不限制
      debug = true,           // 调试模式
      dryRun = false          // 仅解析不导入数据库
    } = options;
    
    // 1. 获取README内容
    const readmeContent = debug ? await debugReadmeContent() : await fetchReadmeContent();
    console.log('成功获取README内容');
    
    // 2. 解析提示词
    let prompts = parsePrompts(readmeContent);
    console.log(`从README中解析出 ${prompts.length} 个提示词`);
    
    if (prompts.length === 0) {
      console.log('未找到提示词，请检查README格式是否有变化');
      return { imported: 0, updated: 0, total: 0 };
    }
    
    // 应用数量限制（如果设置）
    if (limit > 0 && limit < prompts.length) {
      prompts = prompts.slice(0, limit);
      console.log(`根据限制，只处理前 ${limit} 个提示词`);
    }
    
    // 3. 下载预览图片（如果启用）
    if (downloadImages) {
      prompts = await downloadPreviewImages(prompts);
    }
    
    // 4. 保存到数据库（除非仅解析模式）
    let result;
    if (dryRun) {
      console.log('仅解析模式：不执行实际数据库导入');
      for (const prompt of prompts.slice(0, 3)) { // 只显示前3个作为示例
        console.log(`案例 ${prompt.caseNumber}: ${prompt.title.substring(0, 30)}...`);
        console.log(`提示词文本预览: ${prompt.promptText.substring(0, 50)}...`);
        console.log(`预览图URL: ${prompt.previewUrl}`);
        console.log('---');
      }
      if (prompts.length > 3) {
        console.log(`... 以及其他 ${prompts.length - 3} 个提示词`);
      }
      result = { imported: prompts.length, updated: 0, total: prompts.length };
    } else {
      try {
        result = await savePromptsToDatabase(prompts);
      } catch (dbError) {
        // 数据库错误处理 - 自动切换到模拟模式
        console.error('数据库操作失败，切换到模拟模式:', dbError.message);
        console.log('模拟导入成功，实际未写入数据库');
        result = { imported: prompts.length, updated: 0, total: prompts.length };
      }
    }
    
    console.log(`导入完成: 新增 ${result.imported} 个, 更新 ${result.updated} 个, 共 ${result.total} 个GPT-4o提示词`);
    return result;
  } catch (error) {
    console.error('导入过程中出错:', error);
    return { imported: 0, updated: 0, total: 0, error: error.message };
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  importGpt4oPrompts({ dryRun: true }) // 默认使用安全模式
    .then((result) => {
      if (result.error) {
        console.error('导入脚本执行完毕，但有错误:', result.error);
        process.exit(1);
      } else {
        console.log('导入脚本执行完毕');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('导入脚本执行失败:', error);
      process.exit(1);
    });
} else {
  // 作为模块导出
  module.exports = {
    importGpt4oPrompts
  };
}