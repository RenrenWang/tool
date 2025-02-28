import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-800">我的博客</Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-600 hover:text-gray-900">首页</Link>
            <Link to="/categories" className="text-gray-600 hover:text-gray-900">分类</Link>
            <Link to="/tags" className="text-gray-600 hover:text-gray-900">标签</Link>
            <Link to="/archive" className="text-gray-600 hover:text-gray-900">归档</Link>
            <Link to="/about" className="text-gray-600 hover:text-gray-900">关于</Link>
            <Link to="/contact" className="text-gray-600 hover:text-gray-900">联系</Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 