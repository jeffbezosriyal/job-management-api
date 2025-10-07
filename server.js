const express = require('express');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let jobs = [
  { id: 'job_001', title: 'Structural Steel Welding', mode: 'MIG', current: '24A', isActive: true },
  { id: 'job_002', title: 'Structural Steel Welding', mode: 'MIG DP', current: '132A', isActive: false }
];

app.get('/', (req, res) => res.send('✅ Job Management API is running!'));
app.get('/api/jobs', (req, res) => res.json(jobs));

app.listen(PORT, '0.0.0.0', () => console.log(`✅ Server running on port ${PORT}`));
