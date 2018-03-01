// Get data from MySQL, clean, and then export to JSON file
const fs = require('fs');
const mysql = require('mysql');
const data = [];
const errors = [];

// Set environment variable with MySQL connection info
const connection = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

console.log('Processing...');
connection.connect();

const query = `
    SELECT sessionKey, macAddress, timestamp, transactionID, data
        FROM readings
        ORDER BY timestamp
`
connection.query(query, function (error, results, fields) {
    if (error) throw error;

    results.map(row => {
        try {
            row.data = fixBadQuotes(row.data);

            // remove garbage \r and \n from the data
            row.data = row.data.replace(/\n/, '');
            row.data = row.data.replace(/\r/, '');

            const json = JSON.parse(row.data);

            let temperature = parseFloat(json.temp);
            if (isNaN(temperature)) {
                temperature = temperatureFromNonJsonData(row.data);
            }
            row.temperature = temperature;
            data.push(row);

        } catch (e) {
            //console.error(e);
            errors.push(
                {
                    errorMessage: e.message,
                    row: row
                }
            )
        }
    })

    // write data files
    const dataFile = '../web/data.json';
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    console.log(`Wrote ${data.length} records to ${dataFile}.`)
    const errorFile = 'errors.json';
    fs.writeFileSync(errorFile, JSON.stringify(errors, null, 2));
    console.log(`There were ${errors.length} bad records, see ${errorFile} for more details.`)

});

connection.end();

// Some data has JSON un-escaped quotes e.g. "{"temp":"78"}"
// Make sure it skips quoted Strings like "Temp C= 78"
function fixBadQuotes(data) {
    if (data && data.startsWith('"') && data.endsWith('"') && data.indexOf('{') > 0) {
        return data.substring(1, data.length-1);
    } else {
        return data;
    }
}

// There's some non-JSON data that looks like "Temp C= 27.67"
function temperatureFromNonJsonData(data) {
    var matches = data.match(/Temp C=\s(\d*\.?\d*)/)
    if (matches) {
        return parseFloat(matches[1]);
    } else {
        return NaN;
    }
}