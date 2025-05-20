#!/usr/bin/env node

/**
 * 命令行工具 - 导入GPT-4o提示词
 * 
 * 使用方法:
 * node scripts/import-gpt4o-prompts.js [选项]
 */

const { importGpt4oPrompts } = require('../services/github-prompt-importer');

// 显示帮助信息
function showHelp() {
  console.log(`
GPT-4o提示词导入工具
============================

将 jamez-bondos/awesome-gpt4o-images 仓库中的高质量提示词导入到数据库中

使用方法:
  node scripts/import-gpt4o-prompts.js [选项]

选项:
  --help, -h           显示帮助信息
  --download-images    下载提示词的预览图片
  --limit=<数量>     限制导入数量
  --dry-run            仅解析提示词，不实际导入数据库
  --no-debug           关闭调试信息输出
  
示例:
  node scripts/import-gpt4o-prompts.js --download-images --limit=10

注意:
  - 请确保已设置.env文件，包含正确的数据库连接信息
  - 此工具将自动从GitHub获取数据并导入数据库
  - 导入的提示词将被归类为"艺术风格"(分类 ID=3)和"图像"类型(类型ID=1)
  - 质量分数范围为90-99，稀有度根据质量分数自动分配为精品/珍贵/稀有
  - 已添加重复检测，可多次运行脚本而不会产生重复数据
  `);
}

// 解析命令行参数
const args = process.argv.slice(2);
let options = {
  downloadImages: false,
  limit: 0,
  dryRun: false,  // 是否仅解析不实际导入数据库
  debug: true     // 调试模式
};

// 处理命令行参数
for (const arg of args) {
  if (arg === '--help' || arg === '-h') {
    showHelp();
    process.exit(0);
  } else if (arg === '--download-images') {
    options.downloadImages = true;
  } else if (arg.startsWith('--limit=')) {
    const limitValue = parseInt(arg.split('=')[1], 10);
    if (!isNaN(limitValue) && limitValue > 0) {
      options.limit = limitValue;
    } else {
      console.error('错误: limit 参数必须是正整数');
      process.exit(1);
    }
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--no-debug') {
    options.debug = false;
  }
}

// 执行导入
console.log('开始导入GPT-4o提示词...');
console.log(`配置: 下载图片=${options.downloadImages}, 限制数量=${options.limit || '不限制'}, 仅解析模式=${options.dryRun}, 调试模式=${options.debug}`);

importGpt4oPrompts(options)
  .then((result) => {
    console.log(`导入完成！共处理 ${result.total} 个提示词，新增 ${result.imported} 个，更新 ${result.updated} 个。`);
    process.exit(0);
  })
  .catch(error => {
    console.error('导入失败:', error);
    process.exit(1);
  });