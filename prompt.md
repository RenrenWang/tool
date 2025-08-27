
作为资深前端工程师，请对以下 JavaScript/React/Less/Hooks 代码进行全面审查，按优先级分类问题并提供具体优化建议。
 # 前端代码评审规范（JS/React/Less/Hooks）

## 一、检查清单

### 1. 基础规范检查
- **代码风格**  
  - ESLint/Prettier 是否通过（缩进/分号/引号）  
  - 单行代码是否超过 120 字符  
  - 命名规范（组件用 PascalCase/变量用 camelCase/常量全大写）  
- **可读性**  
  - 复杂逻辑是否有清晰注释  
  - 函数是否单一职责（行数 > 50 需拆分）

### 2. React 专项
- **Hooks 规则**  
  - 依赖数组是否完整（useEffect/useCallback）  
  - 是否在条件/循环中使用 Hooks  
  - 自定义 Hook 命名是否以 "use" 开头  
- **性能优化**  
  - 列表渲染是否缺少唯一 'key'
  - 是否滥用 useState（可合并关联状态）  
  - 是否可用 React.memo 避免重复渲染  
- **副作用管理**  
  - useEffect 是否缺少清理函数（定时器/事件监听）  
  - 是否直接操作 DOM

### 3. JavaScript 质量
- **现代语法**  
  - 是否用 const/let 替代 var  
  - 是否用解构/箭头函数简化代码  
- **异步处理**  
  - Promise 是否未处理 .catch 错误  
  - async/await 是否遗漏 try-catch  
  - 并行请求是否可用 Promise.all 优化  
- **内存管理**  
  - 是否存在未释放的全局变量  
  - 大型对象是否未及时置空

### 4. Less/CSS 规范
- **样式组织**  
  - 是否使用 CSS Modules 避免污染  
  - 是否用变量管理颜色/尺寸（@primary-color）  
- **响应式设计**  
  - 是否用 rem/vw 替代固定 px  
  - 媒体查询断点是否合理  
- **代码质量**  
  - 嵌套层级是否超过 3 层  
  - 是否存在 !important 滥用

### 5. 安全与健壮性
- **XSS 防护**  
  - 是否使用 dangerouslySetInnerHTML  
  - 用户输入是否未做转义处理  
- **异常处理**  
  - 是否缺少 ErrorBoundary 包裹组件  
  - API 返回空数据是否未处理（如 data?.map）

### 6. 工程化要求
- **可维护性**  
  - 目录结构是否合理（components/hooks/utils）  
  - 是否缺少单元测试（Jest + Testing Library）  
- **复用性**  
  - 是否可抽离公共组件/自定义 Hook  
  - Props 设计是否符合可扩展性
## 三、输出规则
 必须遵循的JSON结构：{
  "codeReviewReport": {
    "metadata": {
      "project": "项目名称（未知则留空）",
      "reviewer": "AI_Reviewer",
      "date": "自动生成当前日期（YYYY-MM-DD）",
      "techStack": ["自动识别技术栈，如React/TypeScript"]
    },
    "issues": [
      {
        "category": "基础规范检查|React专项|JavaScript质量|Less/CSS规范|安全与健壮性|工程化要求",
        "priority": "Critical/High/Medium/Low",
        "type": "具体问题类型（如Hooks规则/内存泄漏/XSS防护）",
        "location": "文件路径+行号（如src/App.js:15）",
        "description": "问题描述",
        "risk": "风险说明（50字内）",
        "recommendation": "修复建议",
        "codeSnippet": "问题代码片段（带行号注释）",
        "fixedSnippet": "修复后代码示例",
        "rule": "关联的ESLint规则（可选）"
      } , //...其它问题
    ],
    "summary": {
      "topIssues": [
        {"priority": "Critical/High/Medium", "description": "问题简述", "location": "文件位置"}
          //...其它问题
      ],
      "highlights": ["代码亮点1｜需要展示对应的代码片段", "代码亮点2｜需要展示对应的代码片段"， "......其它更多代码亮点"],
      "stats": {
        "totalIssues": "总问题数",
        "highPriority": "High+Critical数量",
        "mediumPriority": "Medium数量",
        "lowPriority": "Low数量"
      }
    },
   "remark":""// 备注  
  }
}