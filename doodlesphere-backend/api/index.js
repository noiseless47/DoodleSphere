const handler = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    res.status(200).json({
      name: 'DoodleSphere Backend API',
      status: 'running',
      endpoints: {
        health: '/api/health',
        test: '/api/test',
        socket: '/socket.io'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};

module.exports = handler; 