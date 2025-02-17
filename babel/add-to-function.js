const template = require("@babel/template").default;
const t = require("@babel/types");


 function addToFunction(path){

  // let body = path.get("body");

  // // 1. 处理箭头函数简写 Body
  // if (path.isArrowFunctionExpression() && !body.isBlockStatement()) {
  //   const newBody = t.blockStatement([t.returnStatement(body.node)]);
  //   path.get("body").replaceWith(newBody);
  //   body = path.get("body");
  // }

  // 2. 确保 body 是 BlockStatement
  // if (body.isBlockStatement()) {
  //   // 3. 构建正确的 AST 节点
  //   const injectNode = t.variableDeclaration("const", [
  //     t.variableDeclarator(
  //       t.objectPattern([
  //         t.objectProperty(
  //           t.identifier("t"),
  //           t.identifier("t"),
  //           false,
  //           true // shorthand: true
  //         ),
  //       ]),
  //       t.callExpression(t.identifier("useTranslation"), [])
  //     ),
  //   ]);

  //   // 4. 插入节点
  //   body.unshiftContainer("body", injectNode);
        //  debugger
        let body = path.get("body");

        // 处理箭头函数简写 Body
        if (path.isArrowFunctionExpression() && !body.isBlockStatement()) {
          const newBody = t.blockStatement([t.returnStatement(body.node)]);
          path.get("body").replaceWith(newBody);
          body = path.get("body"); // 更新 body 引用
        }

        if (body.isBlockStatement()) {
          // 检查是否已存在 t 的声明（包括解构）
          const has = body.node.body.some((node) => {
            if (!t.isVariableDeclaration(node)) return false;
            return node.declarations.some((decl) => {
              if (t.isObjectPattern(decl.id)) {
                return decl.id.properties.some((prop) =>
                  t.isIdentifier(prop.key, { name: "t" }) || 
                  t.isIdentifier(prop.value, { name: "t" })
                );
              }
              return t.isIdentifier(decl.id, { name: "t" });
            });
          });

          // 检查作用域链中是否已有 t 绑定
          const hasInScope = path.scope.hasBinding("t");
  
          if (!has && !hasInScope) {
           // 3. 构建正确的 AST 节点
           const injectNode = t.variableDeclaration("const", [
                   t.variableDeclarator(
                    t.objectPattern([
                      t.objectProperty(
                        t.identifier("t"),
                        t.identifier("t"),
                        false,
                        true // shorthand: true
                      ),
                    ]),
                    t.callExpression(t.identifier("useTranslation"), []),
                  ),
            ]);
            path.get('body').unshiftContainer('body', injectNode); 
          }
        }
 }

module.exports = addToFunction;