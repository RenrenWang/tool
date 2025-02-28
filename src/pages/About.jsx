const About = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">关于我</h1>
      
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">博主简介</h2>
          <p className="text-gray-600 leading-relaxed">
            这里是博主的个人简介内容...
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">博客主题</h2>
          <p className="text-gray-600 leading-relaxed">
            这里介绍博客的主要内容和主题...
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">联系方式</h2>
          <ul className="space-y-2 text-gray-600">
            <li>邮箱：example@email.com</li>
            <li>GitHub：github.com/username</li>
            <li>微信：wechat_id</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default About; 