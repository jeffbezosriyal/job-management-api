const express = require('express');
const router = express.Router();
// Assuming you have database connection and models setup
// const ArcTimeData = require('../models/ArcTimeData');

// Helper function to get the week number
const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

// GET /api/arctime?date=YYYY-MM-DD&range=week|month|year
router.get('/arctime', async (req, res) => {
    const { date, range } = req.query;
    console.log(`GET /api/arctime - Received request with date: ${date}, range: ${range}`);


    if (!date || !range || !['week', 'month', 'year'].includes(range)) {
        console.error('Invalid query parameters received.');
        return res.status(400).json({ message: 'Missing or invalid query parameters: date (YYYY-MM-DD) and range (week|month|year) are required.' });
    }

    try {
        const referenceDate = new Date(date); // Parse the reference date string
         if (isNaN(referenceDate.getTime())) {
             console.error('Invalid date format received.');
             return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD.' });
         }

        // --- Calculate Start and End Dates based on Range ---
        let startDate, endDate;
        let groupByFormat; // For database aggregation (e.g., '%w' for day of week, '%Y-%m-%d' for day)
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Map for week labels
        const monthsOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; // Map for year labels

        console.log(`Calculating date range for ${range} based on ${referenceDate.toDateString()}`);

        if (range === 'week') {
            // Calculate start of the week (Monday)
            const dayOfWeek = referenceDate.getDay(); // 0 for Sunday, 1 for Monday,... 6 for Saturday
            const diff = referenceDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
            startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), diff);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // End on Sunday
            groupByFormat = '%w'; // Group by day of week index (0-6)
            console.log(`Week range: ${startDate.toDateString()} - ${endDate.toDateString()}`);

        } else if (range === 'month') {
            startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
            endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0); // Last day of month
            groupByFormat = '%d'; // Group by day of the month ('01'-'31')
            console.log(`Month range: ${startDate.toDateString()} - ${endDate.toDateString()}`);

        } else if (range === 'year') {
            startDate = new Date(referenceDate.getFullYear(), 0, 1); // Jan 1st
            endDate = new Date(referenceDate.getFullYear(), 11, 31); // Dec 31st
            groupByFormat = '%m'; // Group by month number ('01'-'12')
            console.log(`Year range: ${startDate.toDateString()} - ${endDate.toDateString()}`);
        }

        // --- Database Query (Conceptual - depends on your DB/ORM) ---
        // Your actual database query would use startDate and endDate in the $match stage
        // and groupByFormat in the $group stage.
        /*
        const aggregatedData = await ArcTimeData.aggregate([
            {
                $match: {
                    // Ensure timestamp field is indexed for performance
                    timestamp: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: groupByFormat, date: "$timestamp" } },
                    totalDuration: { $sum: "$durationSeconds" } // Assuming duration is stored in seconds
                }
            },
             // Add timezone if your timestamps are UTC but you want to group by local time
             // _id: { $dateToString: { format: groupByFormat, date: "$timestamp", timezone: "Your/Timezone" } }, // e.g., "America/New_York"

            { $sort: { _id: 1 } } // Sort by the grouping key (day index, day number, month number)
        ]);

        // --- Calculate Overall Total (this might be a separate, simpler query or cached value) ---
        const totalResult = await ArcTimeData.aggregate([
             { $group: { _id: null, totalSeconds: { $sum: "$durationSeconds" } } }
        ]);
        const totalArcTimeInSeconds = totalResult.length > 0 ? totalResult[0].totalSeconds : 0;
        */
        console.log('Simulating database query for the calculated range.');
        // --- End Conceptual Query ---


        // --- Process and Format Results (using MOCK data for now) ---
        // Generate mock data dynamically based on the requested range/date

        let weeklyData = [];
        let monthlyData = [];
        let yearlyData = [];
        let totalArcTimeInSeconds = 0; // Simulate total specific to the period

        const generateRandomValue = (max) => parseFloat((Math.random() * max).toFixed(1));

        if (range === 'week') {
            weeklyData = daysOfWeek.slice(1).concat(daysOfWeek[0]).map(dayLabel => { // Mon-Sun order
                 // Simulate different values based on the week
                 const weekOfYear = getWeekNumber(referenceDate);
                 const value = generateRandomValue(8) * (1 + Math.sin(weekOfYear)); // Vary value by week
                 totalArcTimeInSeconds += Math.round(value * 3600);
                 return { label: dayLabel, value: value };
            });
             // Ensure the order matches Mon-Sun for the client
             const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
             weeklyData.sort((a, b) => dayOrder.indexOf(a.label) - dayOrder.indexOf(b.label));

        } else if (range === 'month') {
            const daysInMonth = endDate.getDate(); // Get actual number of days in the month
            monthlyData = Array.from({ length: daysInMonth }, (_, i) => {
                const dayLabel = (i + 1).toString().padStart(2, '0');
                 // Simulate different values based on the month/day
                 const value = generateRandomValue(10) * (1 + Math.cos(referenceDate.getMonth() + i));
                 totalArcTimeInSeconds += Math.round(value * 3600);
                return { label: dayLabel, value: value };
            });
        } else if (range === 'year') {
            yearlyData = monthsOfYear.map(monthLabel => {
                 // Simulate different values based on the year/month
                 const value = generateRandomValue(150) * (1 + Math.sin(referenceDate.getFullYear() + monthsOfYear.indexOf(monthLabel)));
                 totalArcTimeInSeconds += Math.round(value * 3600);
                return { label: monthLabel, value: value };
            });
        }

        // Simulate a slightly varying last updated time
        const lastUpdated = new Date();
        lastUpdated.setMinutes(lastUpdated.getMinutes() - Math.floor(Math.random() * 60));


        const responseData = {
           totalArcTimeInSeconds: totalArcTimeInSeconds,
           lastUpdated: lastUpdated.toISOString(),
           weeklyData: weeklyData,
           monthlyData: monthlyData,
           yearlyData: yearlyData,
        };

        console.log(`Sending response for range ${range}, date ${date}. Total calculated: ${totalArcTimeInSeconds}s`);
        // --- Send Response ---
        res.status(200).json(responseData);

    } catch (error) {
        // Log the detailed error on the server
        console.error(`Error fetching arc time for date=${date}, range=${range}:`, error);
        // Send a generic error message to the client
        res.status(500).json({ message: 'Internal Server Error while processing arc time data.' });
    }
});

module.exports = router;

