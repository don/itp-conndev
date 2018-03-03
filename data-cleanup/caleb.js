// Export Caleb's data to CSV
const fs = require('fs');

// load cleaned data
const data = require('../web/data.json');
// filter for one device
const oneDevice = data.filter(row => row.macAddress === 'F8:F0:05:F7:CD:A0');

// data is a string, hydrate it into JSON
// use spread operator to combine row and row.data
const sensorData = oneDevice.map(row => {
    const data = JSON.parse(row.data);
    return { ...row, ...data }
});

// save JSON
fs.writeFileSync('./caleb.json', JSON.stringify(sensorData, null, 2));

// save CSV
// Use tabs since data contains commas. blindly trust every row object has all the columns (no error checking)
const csv = [];
csv.push(Object.keys(sensorData[0]).join('\t'));  // header row
sensorData.forEach(row => {
    csv.push(Object.values(row).join('\t'));
})
fs.writeFileSync('./caleb.csv', csv.join('\n'));
