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

// --- In-Memory Database (Jobs) ---
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

// --- API Routes (Jobs) ---

// GET all jobs
app.get('/api/jobs', (req, res) => {
    console.log('GET /api/jobs - Fetching all jobs');
    res.status(200).json(jobs.map(job => ({ ...job, id: job._id })));
});

// POST a new job
app.post('/api/jobs', (req, res) => {
    console.log('POST /api/jobs - Creating a new job with body:', req.body);

    const { title, mode, current } = req.body;
    if (!title || !mode || !current) {
        return res.status(400).json({ message: 'Missing required fields: title, mode, or current.' });
    }

    const newJob = {
        _id: `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        isActive: false,
        ...req.body
    };

    jobs.push(newJob);
    console.log(`Job created with ID: ${newJob._id}`);
    res.status(201).json({ ...newJob, id: newJob._id });
});


// PUT (update) a job's status OR its full details
app.put('/api/jobs/:id', (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const jobIndex = jobs.findIndex(job => job._id === id);

    if (jobIndex === -1) {
        console.error(`PUT /api/jobs/${id} - Job not found`);
        return res.status(404).json({ message: 'Job not found' });
    }

    if (updateData.title != null) {
        console.log(`PUT /api/jobs/${id} - Performing FULL update with data:`, updateData);
        const updatedJob = { ...jobs[jobIndex], ...updateData };
        jobs[jobIndex] = updatedJob;
        console.log(`Job ${id} updated (full).`);
        res.status(200).json({ ...updatedJob, id: updatedJob._id });
    }
    else if (updateData.isActive != null && typeof updateData.isActive === 'boolean') {
        console.log(`PUT /api/jobs/${id} - Updating STATUS to isActive: ${updateData.isActive}`);
        const isActive = updateData.isActive;
        if (isActive === true) {
            jobs.forEach(job => job.isActive = (job._id === id)); // Activate only this one
        } else {
             jobs[jobIndex].isActive = false; // Just deactivate this one
        }
        console.log(`Job ${id} updated (status only).`);
        res.status(200).json({ ...jobs[jobIndex], id: jobs[jobIndex]._id });
    }
    else {
        console.warn(`PUT /api/jobs/${id} - Invalid update data provided:`, updateData);
        return res.status(400).json({ message: 'Invalid payload. Must provide "title" for a full update or "isActive" for a status update.' });
    }
});

// DELETE a job
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


// --- NEW/UPDATED ENDPOINT FOR ARC TIME METRIC ---

// Helper function to get the week number (ISO 8601)
const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    // Get first day of year
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks to nearest Thursday
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    // Return array of year and week number
    return weekNo;
}

// Route: GET /api/arctime?date=YYYY-MM-DD&range=week|month|year
app.get('/api/arctime', async (req, res) => {
    const { date, range } = req.query;
    console.log(`GET /api/arctime - Received request with date: ${date}, range: ${range}`);


    // --- Validation ---
    if (!date || !range || !['week', 'month', 'year'].includes(range)) {
        console.error('Invalid query parameters received.');
        return res.status(400).json({ message: 'Missing or invalid query parameters: date (YYYY-MM-DD) and range (week|month|year) are required.' });
    }

    let referenceDate;
    try {
        referenceDate = new Date(date + 'T00:00:00Z'); // Treat date as UTC start of day
         if (isNaN(referenceDate.getTime())) {
             throw new Error('Invalid date value');
         }
    } catch (e) {
         console.error('Invalid date format received.');
         return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD.' });
    }


    try {
        // --- Calculate Start and End Dates (using UTC for consistency) ---
        let startDate, endDate;
        const year = referenceDate.getUTCFullYear();
        const month = referenceDate.getUTCMonth(); // 0-11
        const day = referenceDate.getUTCDate();

        const daysOfWeekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // For mapping later
        const monthsOfYearLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; // For mapping later


        console.log(`Calculating date range for ${range} based on UTC date ${referenceDate.toISOString().split('T')[0]}`);

        if (range === 'week') {
            const dayOfWeek = referenceDate.getUTCDay(); // 0 for Sunday, 1 for Monday,... 6 for Saturday
            const diff = day - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
            startDate = new Date(Date.UTC(year, month, diff));
            endDate = new Date(Date.UTC(year, month, diff + 6)); // End on Sunday
            console.log(`Week range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

        } else if (range === 'month') {
            startDate = new Date(Date.UTC(year, month, 1));
            endDate = new Date(Date.UTC(year, month + 1, 0)); // Last day of month
            console.log(`Month range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

        } else if (range === 'year') {
            startDate = new Date(Date.UTC(year, 0, 1)); // Jan 1st
            endDate = new Date(Date.UTC(year, 11, 31)); // Dec 31st
            console.log(`Year range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
        }

        // --- Simulate Database Query ---
        console.log('Simulating database query for the calculated range.');
        // In a real scenario, you'd query your DB for records where timestamp >= startDate AND timestamp <= endDate
        // Then, aggregate the duration based on the 'range' (day of week, day of month, month)

        // --- Generate Dynamic Mock Data based on Range/Date ---
        let weeklyData = [];
        let monthlyData = [];
        let yearlyData = [];
        let totalArcTimeInSeconds = 0; // TOTAL FOR THE PERIOD

        const generateRandomValue = (max) => parseFloat((Math.random() * max).toFixed(1));

        if (range === 'week') {
             // Generate 7 days, values slightly influenced by week number
             const weekOfYear = getWeekNumber(referenceDate);
             weeklyData = daysOfWeekLabels.slice(1).concat(daysOfWeekLabels[0]).map((dayLabel, index) => { // Mon-Sun order
                 // Simulate different values based on the week and day
                 const value = Math.max(0, generateRandomValue(8) * (1 + Math.sin(weekOfYear + index / 7.0))); // Vary value
                 totalArcTimeInSeconds += Math.round(value * 3600);
                 return { label: dayLabel, value: value };
            });
             // Ensure client gets Mon-Sun order
             const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
             weeklyData.sort((a, b) => dayOrder.indexOf(a.label) - dayOrder.indexOf(b.label));

        } else if (range === 'month') {
            const daysInMonth = endDate.getUTCDate(); // Get actual number of days in the month
            monthlyData = Array.from({ length: daysInMonth }, (_, i) => {
                const dayLabel = (i + 1).toString().padStart(2, '0');
                 // Simulate different values based on the month/day
                 const value = Math.max(0, generateRandomValue(10) * (1 + Math.cos(month + i / 31.0)));
                 totalArcTimeInSeconds += Math.round(value * 3600);
                return { label: dayLabel, value: value };
            });
        } else if (range === 'year') {
             // Generate 12 months, values slightly influenced by year/month
            yearlyData = monthsOfYearLabels.map((monthLabel, index) => {
                 const value = Math.max(0, generateRandomValue(150) * (1 + Math.sin(year + index / 12.0)));
                 totalArcTimeInSeconds += Math.round(value * 3600);
                return { label: monthLabel, value: value };
            });
        }

        // Simulate a slightly varying last updated time (e.g., within the last hour)
        const lastUpdated = new Date();
        lastUpdated.setMinutes(lastUpdated.getMinutes() - Math.floor(Math.random() * 60));


        const responseData = {
           // This total is NOW specific to the period requested
           totalArcTimeInSeconds: totalArcTimeInSeconds,
           lastUpdated: lastUpdated.toISOString(),
           weeklyData: weeklyData, // Contains data only if range=week
           monthlyData: monthlyData, // Contains data only if range=month
           yearlyData: yearlyData,   // Contains data only if range=year
        };

        console.log(`Sending response for range ${range}, date ${date}. Period Total: ${totalArcTimeInSeconds}s`);
        res.status(200).json(responseData);

    } catch (error) {
        console.error(`Error processing /api/arctime for date=${date}, range=${range}:`, error);
        res.status(500).json({ message: 'Internal Server Error while processing arc time data.' });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
