// 修改后的 findOuterFunction
const t = require("@babel/types"); // 引入 types

function findOuterFunction(path) {
    let currentPath = path;
    
    while (currentPath) {
      const parentPath = currentPath.findParent((p) => {
        const node = p.node;
        return (
          t.isFunctionDeclaration(node) || 
          t.isFunctionExpression(node) || 
          t.isArrowFunctionExpression(node) ||
          t.isClassMethod(node)
        );
      });
  
      if (parentPath) return parentPath;
      currentPath = currentPath.parentPath;
    }
    return null;
  }
  
  // 修改后的 getFunctionName
  function getFunctionName(path) {
    const node = path.node;
    if (t.isFunctionDeclaration(node)) {
      return node.id?.name || "匿名函数";
    } else if (t.isClassMethod(node)) {
      return `类方法 ${node.key.name}`;
    } else if (t.isFunctionExpression(node) || t.isArrowFunctionExpression(node)) {
      return path.parent.id?.name || "匿名函数表达式";
    }
    return "未知函数类型";
  }

module.exports.getFunctionName=getFunctionName
module.exports.findOuterFunction=findOuterFunction