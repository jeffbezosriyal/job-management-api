const express = require('express');
const cors = require('cors');
const crypto = require('crypto'); // To generate unique IDs

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- In-Memory Database (Jobs) ---
let jobs = [
    // ... (job data remains the same) ...
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
// ... (Job routes remain the same) ...
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


// --- ARC TIME METRIC SECTION ---

// --- OPTIMIZATION: Seedable PRNG (Mulberry32) ---
function mulberry32(seed) {
  return function() {
    var t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
// --- END OPTIMIZATION ---

// Helper function to get the week number (ISO 8601)
const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

// --- OPTIMIZATION: Data Generation Helpers ---
function generateWeeklyData(randomFunc) {
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let totalSeconds = 0;
    const data = dayOrder.map(dayLabel => {
        let maxHours = 8; // Max for weekdays
        if (dayLabel === 'Sat' || dayLabel === 'Sun') {
            maxHours = 3; // Lower max for weekends
        }
        // Generate a value between 0 and maxHours, add some extra randomness
        const value = Math.max(0, randomFunc() * maxHours + (randomFunc() - 0.5));
        totalSeconds += Math.round(value * 3600);
        return { label: dayLabel, value: parseFloat(value.toFixed(1)) };
    });
    return { data, totalSeconds };
}

function generateMonthlyData(daysInMonth, monthIndex, randomFunc) {
     let totalSeconds = 0;
     const data = Array.from({ length: daysInMonth }, (_, i) => {
        const dayLabel = (i + 1).toString().padStart(2, '0');
         // Simulate slightly higher usage mid-month, lower at start/end
         const monthPositionFactor = Math.sin((i / daysInMonth) * Math.PI); // 0 at start/end, 1 in middle
         const value = Math.max(0, randomFunc() * 10 * (0.5 + monthPositionFactor * 0.7) + (randomFunc() - 0.5)); // Base + variation
         totalSeconds += Math.round(value * 3600);
        return { label: dayLabel, value: parseFloat(value.toFixed(1)) };
    });
    return { data, totalSeconds };
}

function generateYearlyData(monthsOfYearLabels, year, randomFunc) {
    let totalSeconds = 0;
    const data = monthsOfYearLabels.map((monthLabel, index) => {
        // Simulate seasonal variation (e.g., slightly busier mid-year)
        const yearPositionFactor = Math.sin((index / 11) * Math.PI);
         const value = Math.max(0, randomFunc() * 150 * (0.6 + yearPositionFactor * 0.5) + (randomFunc() * 20 - 10)); // Base + seasonal + random noise
         totalSeconds += Math.round(value * 3600);
        return { label: monthLabel, value: parseFloat(value.toFixed(1)) };
    });
     return { data, totalSeconds };
}
// --- END OPTIMIZATION ---


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
        referenceDate = new Date(date + 'T00:00:00Z');
         if (isNaN(referenceDate.getTime())) { throw new Error('Invalid date value'); }
    } catch (e) {
         console.error('Invalid date format received.');
         return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD.' });
    }


    try {
        // --- Calculate Start and End Dates (using UTC) ---
        let startDate, endDate;
        const year = referenceDate.getUTCFullYear();
        const month = referenceDate.getUTCMonth(); // 0-11
        const day = referenceDate.getUTCDate();
        const monthsOfYearLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


        console.log(`Calculating date range for ${range} based on UTC date ${referenceDate.toISOString().split('T')[0]}`);

        if (range === 'week') {
            const dayOfWeek = referenceDate.getUTCDay();
            const diff = day - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            startDate = new Date(Date.UTC(year, month, diff));
            endDate = new Date(Date.UTC(year, month, diff + 6));
            console.log(`Week range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

        } else if (range === 'month') {
            startDate = new Date(Date.UTC(year, month, 1));
            endDate = new Date(Date.UTC(year, month + 1, 0));
            console.log(`Month range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

        } else if (range === 'year') {
            startDate = new Date(Date.UTC(year, 0, 1));
            endDate = new Date(Date.UTC(year, 11, 31));
            console.log(`Year range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
        }

        // --- Simulate Database Query ---
        console.log('Simulating database query for the calculated range.');

        // --- OPTIMIZATION: Generate Consistent Mock Data ---
        let seed;
        let weeklyData = [], monthlyData = [], yearlyData = [];
        let totalArcTimeInSeconds = 0;

        // Create a seed based on the period
        if (range === 'week') {
             const weekNum = getWeekNumber(referenceDate);
             seed = year * 100 + weekNum; // Unique seed per year+week
        } else if (range === 'month') {
             seed = year * 100 + (month + 1); // Unique seed per year+month
        } else { // year
             seed = year; // Unique seed per year
        }
        console.log(`Using seed ${seed} for PRNG.`);
        const randomFunc = mulberry32(seed); // Initialize PRNG

        if (range === 'week') {
            const result = generateWeeklyData(randomFunc);
            weeklyData = result.data;
            totalArcTimeInSeconds = result.totalSeconds;
        } else if (range === 'month') {
             const daysInMonth = endDate.getUTCDate();
             const result = generateMonthlyData(daysInMonth, month, randomFunc);
             monthlyData = result.data;
             totalArcTimeInSeconds = result.totalSeconds;
        } else if (range === 'year') {
             const result = generateYearlyData(monthsOfYearLabels, year, randomFunc);
             yearlyData = result.data;
             totalArcTimeInSeconds = result.totalSeconds;
        }
        // --- END OPTIMIZATION ---


        // Use a fixed or slightly randomized lastUpdated time
        const lastUpdated = new Date();
        // lastUpdated.setMinutes(lastUpdated.getMinutes() - Math.floor(randomFunc() * 60)); // Can use PRNG here too


        const responseData = {
           totalArcTimeInSeconds: totalArcTimeInSeconds,
           lastUpdated: lastUpdated.toISOString(),
           weeklyData: weeklyData,
           monthlyData: monthlyData,
           yearlyData: yearlyData,
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

