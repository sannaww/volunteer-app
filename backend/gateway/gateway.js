const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/api/auth', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true
}));

app.use('/api/projects', createProxyMiddleware({
  target: 'http://localhost:5002',
  changeOrigin: true
}));

app.use('/api/applications', createProxyMiddleware({
  target: 'http://localhost:5003',
  changeOrigin: true
}));

app.use('/api/admin', createProxyMiddleware({
  target: 'http://localhost:5004',
  changeOrigin: true
}));

// ✅ Чат (пока) живёт внутри applications-service
app.use('/api/messages', createProxyMiddleware({
  target: 'http://localhost:5003',
  changeOrigin: true,
  pathRewrite: { '^/api/messages': '/messages' }
}));


// ❌ убери/закомментируй, т.к. сервиса 5005 нет
// app.use('/api/chat', createProxyMiddleware({
//   target: 'http://localhost:5005',
//   changeOrigin: true
// }));

app.listen(5000, () => {
  console.log('🚀 API Gateway running on port 5000');
});
