const handler = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      message: 'Backend is working',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};

module.exports = handler; 