const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Mock job data
let jobs = [
  {
    id: 'job_001',
    title: 'Structural Steel Welding',
    mode: 'MIG',
    current: '24A',
    hotStartTime: '150A',
    wave: 'SQU',
    base: '153A',
    pulse: '400Hz',
    duty: '52%',
    isActive: true
  },
  {
    id: 'job_002',
    title: 'Structural Steel Welding',
    mode: 'MIG DP',
    current: '132A',
    wire: 'Fe',
    shieldingGas: 'MIX80/20',
    arcLength: '-8.2',
    diameter: '0.8mm',
    inductance: '-10.0'
  }
];

// API Routes
app.get('/jobs', (req, res) => res.json(jobs));

app.post('/jobs', (req, res) => {
  const newJob = req.body;
  jobs.push(newJob);
  res.status(201).json(newJob);
});

app.put('/jobs/:id', (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  jobs = jobs.map(job => ({ ...job, isActive: job.id === id ? isActive : false }));
  res.json({ message: `Updated job ${id}` });
});

app.delete('/jobs/:id', (req, res) => {
  const { id } = req.params;
  jobs = jobs.filter(job => job.id !== id);
  res.json({ message: `Deleted job ${id}` });
});

// Start the server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
