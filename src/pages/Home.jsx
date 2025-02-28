const Home = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row">
        {/* 主要内容区域 */}
        <main className="w-full md:w-2/3 pr-8">
          {/* 推荐文章 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">推荐文章</h2>
            <div className="grid gap-6">
              {/* 文章卡片示例 */}
              <article className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-2">
                  <a href="#" className="hover:text-blue-600">文章标题</a>
                </h3>
                <p className="text-gray-600 mb-4">文章摘要...</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span>2024-03-20</span>
                  <span className="mx-2">·</span>
                  <span>分类名称</span>
                </div>
              </article>
            </div>
          </section>

          {/* 最新文章 */}
          <section>
            <h2 className="text-2xl font-bold mb-6">最新文章</h2>
            <div className="grid gap-6">
              {/* 文章列表 */}
            </div>
          </section>
        </main>

        {/* 侧边栏 */}
        <aside className="w-full md:w-1/3">
          <Sidebar />
        </aside>
      </div>
    </div>
  );
};

export default Home; 