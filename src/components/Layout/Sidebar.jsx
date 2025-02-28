const Sidebar = () => {
  return (
    <div className="w-full md:w-64 px-4 py-6">
      {/* 作者简介 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">关于作者</h3>
        <div className="flex items-center mb-4">
          <img 
            src="/avatar.jpg" 
            alt="作者头像" 
            className="w-16 h-16 rounded-full"
          />
          <div className="ml-4">
            <h4 className="font-medium">博主昵称</h4>
            <p className="text-sm text-gray-600">个人简介</p>
          </div>
        </div>
      </div>

      {/* 热门文章 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">热门文章</h3>
        <ul className="space-y-4">
          <li>
            <a href="#" className="text-gray-600 hover:text-gray-900">
              热门文章标题1
            </a>
          </li>
          <li>
            <a href="#" className="text-gray-600 hover:text-gray-900">
              热门文章标题2
            </a>
          </li>
        </ul>
      </div>

      {/* 订阅区域 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">订阅博客</h3>
        <form className="space-y-4">
          <input
            type="email"
            placeholder="输入您的邮箱"
            className="w-full px-4 py-2 border rounded"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            订阅
          </button>
        </form>
      </div>
    </div>
  );
};

export default Sidebar; 