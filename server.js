const express = require('express');
const cors = require('cors');
const app = express();

// Use Render dynamic port
const PORT = process.env.PORT || 3000;

// Middleware
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
    inductance: '-10.0',
    isActive: false
  }
];

// Root route
app.get('/', (req, res) => {
  res.send('✅ Job Management API is running!');
});

// Get all jobs
app.get('/api/jobs', (req, res) => {
  res.json(jobs);
});

// Add a new job
app.post('/api/jobs', (req, res) => {
  const newJob = req.body;
  if (!newJob.id || !newJob.title) {
    return res.status(400).json({ error: 'id and title are required' });
  }
  jobs.push(newJob);
  res.status(201).json(newJob);
});

// Update job status
app.put('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  let found = false;
  jobs = jobs.map(job => {
    if (job.id === id) {
      found = true;
      return { ...job, isActive };
    }
    return { ...job, isActive: false }; // deactivate others
  });

  if (!found) return res.status(404).json({ error: 'Job not found' });

  res.json({ message: `Updated job ${id}`, jobs });
});

// Delete a job
app.delete('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  const before = jobs.length;
  jobs = jobs.filter(job => job.id !== id);

  if (jobs.length === before) return res.status(404).json({ error: 'Job not found' });

  res.json({ message: `Deleted job ${id}`, jobs });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
