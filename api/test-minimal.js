const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'test' });
});

app.get('/facility/:id', (req, res) => {
  res.json({ message: 'facility route works', id: req.params.id });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});