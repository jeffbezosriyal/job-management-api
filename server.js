const express = require('express');
const cors = require('cors');
const crypto = require('crypto'); // To generate unique IDs

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
// Enable Cross-Origin Resource Sharing for all routes
app.use(cors());
// Enable the express app to parse JSON formatted request bodies
app.use(express.json());

// --- In-Memory Database ---
// This acts as a simple database. Data will reset if the server restarts.
let jobs = [
    {
        _id: 'job_1700000000001',
        title: 'Standard Weld Procedure',
        mode: 'MIG SYN',
        current: '120A',
        wire: 'Steel',
        shieldingGas: 'Ar/CO2',
        arcLength: '1.5',
        diameter: '0.9mm',
        inductance: '3.0',
        isActive: true,
        hotStartTime: '',
        wave: '',
        base: '',
        pulse: '',
        duty: '',
    },
    {
        _id: 'job_1700000000002',
        title: 'Aluminum Pulse',
        mode: 'MIG DP',
        current: '95A',
        wire: 'Alu',
        shieldingGas: 'Argon',
        arcLength: '0.5',
        diameter: '1.2mm',
        inductance: '4.5',
        isActive: false,
        hotStartTime: '1.2s',
        wave: 'Sine',
        base: '30A',
        pulse: '150A',
        duty: '60%',
    }
];

// --- API Routes ---

// GET all jobs
// Route: GET /api/jobs
app.get('/api/jobs', (req, res) => {
    console.log('GET /api/jobs - Fetching all jobs');
    // Map over the jobs to ensure the 'id' property matches what the client expects
    res.status(200).json(jobs.map(job => ({ ...job, id: job._id })));
});

// POST a new job
// Route: POST /api/jobs
app.post('/api/jobs', (req, res) => {
    console.log('POST /api/jobs - Creating a new job with body:', req.body);

    const { title, mode, current } = req.body;
    if (!title || !mode || !current) {
        return res.status(400).json({ message: 'Missing required fields: title, mode, or current.' });
    }

    const newJob = {
        _id: `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`, // Generate a unique ID
        isActive: false, // New jobs are inactive by default
        ...req.body // Spread the rest of the properties
    };

    jobs.push(newJob);
    console.log(`Job created with ID: ${newJob._id}`);
    res.status(201).json({ ...newJob, id: newJob._id }); // Respond with the created job
});


// PUT (update) a job's status OR its full details
// Route: PUT /api/jobs/:id
app.put('/api/jobs/:id', (req, res) => {
    const { id } = req.params;
    const updateData = req.body; // This contains the full job object or just the status

    const jobIndex = jobs.findIndex(job => job._id === id);

    if (jobIndex === -1) {
        console.error(`PUT /api/jobs/${id} - Job not found`);
        // Corrected status code for not found
        return res.status(404).json({ message: 'Job not found' });
    }

    // --- LOGIC TO HANDLE DIFFERENT UPDATE TYPES ---

    // CASE 1: Full Job Update (from Edit Sheet)
    // We check for 'title' as a sign of a full update.
    if (updateData.title != null) {
        console.log(`PUT /api/jobs/${id} - Performing FULL update with data:`, updateData);

        // Merge the old job with the new data.
        // This preserves the _id and any fields not sent in the request.
        const updatedJob = { ...jobs[jobIndex], ...updateData };

        // Replace the old job in the array
        jobs[jobIndex] = updatedJob;

        console.log(`Job ${id} updated (full).`);
        res.status(200).json({ ...updatedJob, id: updatedJob._id });
    }

    // CASE 2: Status-Only Update (from Toggle Button)
    // We check *only* for 'isActive'
    else if (updateData.isActive != null && typeof updateData.isActive === 'boolean') {
        console.log(`PUT /api/jobs/${id} - Updating STATUS to isActive: ${updateData.isActive}`);

        const isActive = updateData.isActive;

        // Ensure only one job is active at a time
        if (isActive === true) {
            jobs.forEach(job => job.isActive = false);
        }

        jobs[jobIndex].isActive = isActive;
        console.log(`Job ${id} updated (status only).`);
        res.status(200).json({ ...jobs[jobIndex], id: jobs[jobIndex]._id });
    }

    // CASE 3: Invalid Data
    else {
        console.warn(`PUT /api/jobs/${id} - Invalid update data provided:`, updateData);
        return res.status(400).json({ message: 'Invalid payload. Must provide "title" for a full update or "isActive" for a status update.' });
    }
});

// DELETE a job
// Route: DELETE /api/jobs/:id
app.delete('/api/jobs/:id', (req, res) => {
    const { id } = req.params;
    console.log(`DELETE /api/jobs/${id} - Deleting job`);

    const initialLength = jobs.length;
    jobs = jobs.filter(job => job._id !== id);

    if (jobs.length === initialLength) {
        return res.status(404).json({ message: 'Job not found' });
    }

    console.log(`Job ${id} deleted.`);
    res.status(200).json({ message: `Job with id ${id} deleted successfully.` });
});

// --- UPDATED ENDPOINT FOR ARC TIME METRIC ---
app.get('/api/arctime', (req, res) => {
    console.log('GET /api/arctime - Fetching arc time data (all ranges)');

    // Simulate total arc time
    const totalSeconds = 131400; // Simulates 36h 30m

    // Simulate dynamic weekly data (hours per day)
    const weeklyData = [
        { day: 'Mon', hours: 5.5 }, { day: 'Tue', hours: 7.0 },
        { day: 'Wed', hours: 8.5 }, { day: 'Thu', hours: 4.0 },
        { day: 'Fri', hours: 6.0 }, { day: 'Sat', hours: 1.5 },
        { day: 'Sun', hours: 0.0 }
    ];

    // --- CHANGED: Simulate dynamic monthly data (hours per DAY of month) ---
    const monthlyData = Array.from({ length: 31 }, (_, i) => {
        const dayNumber = i + 1;
        // Simulate some arc time (0-12 hours) for each day
        const hours = Math.random() * 12;
        return {
            label: dayNumber.toString(), // Label is day number "1", "2", ... "31"
            value: parseFloat(hours.toFixed(1)) // Value is hours for that day
        };
    });
    // --- END CHANGE ---

    // Simulate dynamic yearly data (hours per year)
    const yearlyData = [
        { year: '2021', hours: 1500.0 }, { year: '2022', hours: 1850.5 },
        { year: '2023', hours: 1700.0 }, { year: '2024', hours: 1900.8 },
        { year: '2025', hours: 1100.0 }
    ].map(item => ({ label: item.year, value: item.hours }));


    res.status(200).json({
        totalArcTimeInSeconds: totalSeconds,
        lastUpdated: new Date(Date.now() - 86400000).toISOString(), // "Yesterday"
        weeklyData: weeklyData.map(item => ({ label: item.day, value: item.hours })),
        monthlyData: monthlyData, // Now contains daily data for the month
        yearlyData: yearlyData
    });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});