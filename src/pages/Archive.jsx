const Archive = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">文章归档</h1>

      <div className="space-y-12">
        {/* 年份分组 */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">2024</h2>
          <div className="border-l-2 border-gray-200 pl-4 space-y-6">
            {/* 月份分组 */}
            <div>
              <h3 className="text-lg font-medium mb-4">3月</h3>
              <ul className="space-y-4">
                <li>
                  <span className="text-gray-500">03-20</span>
                  <a href="#" className="ml-4 hover:text-blue-600">文章标题1</a>
                </li>
                <li>
                  <span className="text-gray-500">03-15</span>
                  <a href="#" className="ml-4 hover:text-blue-600">文章标题2</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Archive; 