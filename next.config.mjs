/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google 帳號大頭貼
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co', // [關鍵] 允許 Placeholder 圖片
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'generativelanguage.googleapis.com', // 若未來直接使用 Gemini 圖片
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;