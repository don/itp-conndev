const express = require('express');
const app = express();
const port = 3000;
const mysql = require('mysql');

// mysql connection pool
const pool = mysql.createPool({
    connectionLimit : 10,
    host: process.env.CONN_DEV_HOST,
    user: process.env.CONN_DEV_USER,
    password: process.env.CONN_DEV_PASSWORD,
    database: process.env.CONN_DEV_DB
  });

app.use(express.static('public'));
// 'json spaces' pretty prints JSON which is nice for debugging
app.set('json spaces', 2);

// get list of devices (really macAddresses)
app.get('/device', async (req, res) => {
    let query = `SELECT distinct mac_address 
        FROM readings 
        WHERE mac_address != 'AA:BB:CC:DD:EE:FF'
        ORDER BY mac_address`; 

    pool.query(query, (error, results, fields) => {
        if (error) {
            res.status(500).send(error);
            return;
        }

        let macAddresses = results.map(d => d.mac_address);
        res.send(macAddresses);
    });
});

app.get('/device/:mac_address/temperature', async (req, res) => {

    let query = "SELECT recorded_at, data_point FROM readings WHERE mac_address = ?"; 
    let macAddress = req.params.mac_address;
    //console.log(query, macAddress);

    pool.query(query, [macAddress], (error, results, fields) => {

        if (error) {
            res.status(500).send(error);
            return;
        }

        let data = cleanupResults(results);
        res.send(data);
    });
});

// return all data as cleaned up JSON
// this only works because the dataset is small
app.get('/data.json', async (req, res) => {

    let query = `SELECT mac_address, data_point, recorded_at 
        FROM readings
        WHERE recorded_at > subdate(now(), interval 4 day)`; 
    
    pool.query(query, (error, results, fields) => {

        if (error) {
            res.status(500).send(error);
            return;
        }

        let data = cleanupResults(results);
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
    });
});

// this function is needed because we let bad JSON get inserted into the database
// a better solution would be to reject any data sent from the device
function cleanupResults(results) {
    let data = [];
        
    results.map(row => {

        try {
            let item = {};
            let json = dataPointAsJson(row.data_point);
            if (json && json.temperature) {
                item.recorded_at = row.recorded_at;
                item.temperature = json.temperature;
                // temperature must be a number
                if (typeof item.temperature === 'string') {
                    item.temperature = Number(item.temperature);
                }
                if (row.mac_address) {
                    item.mac_address = row.mac_address.toLowerCase();
                }
                data.push(item);
            }
        } catch (e) {
            // JSON parsing failed again. Skip this row.
            // console.log(e);
            // console.log(row);
        }
    });

    return data;
}

// this function queries all the data, cleans it up and dumps it into a new table
// sorry about the callback hell here ¯\_(ツ)_/¯
app.get('/cleanup', async (req, res) => {
    pool.query("drop table if exists clean", (error, results, fields) => {
        pool.query("create table cleaned_data(id INT, mac_address CHAR(17), json_data JSON, temperature FLOAT, recorded_at TIMESTAMP)", (error, results, fields) => {
            pool.query("select id, mac_address, data_point, recorded_at from readings", (error, results, fields) => {
                //console.log(results);
                let data = cleanupAllResults(results);
                // convert JSON to nested arrays, skipping ids for now
                let values = data.map(row => [row.id, row.mac_address, JSON.stringify(row.data_point), row.temperature, row.recorded_at]);
                //console.log(values);
                pool.query("insert into cleaned_data (id, mac_address, json_data, temperature, recorded_at) values ?", [values], (error, results, fields) => {
                    if (error) {
                        res.status(500).send(error);
                    } else {
                        res.send('The cleaned_data table has been refreshed');
                    }
                });            
            });
        });
    });
});

// like cleanupResults but handles all fields
function cleanupAllResults(results) {
    let data = [];
        
    results.map(row => {

        try {
            let item = {};
            let json = dataPointAsJson(row.data_point);
            if (json && json.temperature) {
                item.id = row.id;
                item.mac_address = row.mac_address.toLowerCase();
                item.recorded_at = row.recorded_at;
                item.temperature = json.temperature;
                // temperature must be a number
                if (typeof item.temperature === 'string') {
                    item.temperature = Number(item.temperature);
                    json.temperature = Number(item.temperature)
                }
                // include the full JSON
                item.data_point = json;
                data.push(item);
            }
        } catch (e) {
            // JSON parsing failed again. Skip this row.
            // console.log(e);
            // console.log(row);
        }
    });

    return data;
}

// Parse data_point into JSON, attempt to correct known bad data
function dataPointAsJson(dataPoint) {
    try {
        return JSON.parse(dataPoint);
    } catch (e) {
        // bad JSON, attempt to clean it up
        // add more rules as necessary
        // console.log(dataPoint);
        dataPoint = fixMissingCloseBracket(dataPoint);
        dataPoint = fixTrailingComma(dataPoint);
        dataPoint = fixBadQuotes(dataPoint);
    }
    // try and parse cleaned up JSON
    // this will throw exceptions when bad data
    return JSON.parse(dataPoint);
}

// single quoted JSON is invalid
// {'temperature':25.20,'humidity':27.50}
function fixBadQuotes(data) {
    // replace all ' with "
    return data.replace(/'/g, '"');
}

 // some data is missing the closing bracket
 // '{"temperature":24.51612903225806' 
function fixMissingCloseBracket(data) {
    return data.replace(/(\d$)/, '$1}')
}

 // some data has extra trailing commas 
 // '{"ct":3296.00,"lux":0.00,"temperature":24.00,"humidity":19.00,}'
function fixTrailingComma(data) {
    return data.replace(/,}$/, '}');
}

app.listen(port, () => console.log(`ITP Connected Devices app listening on port ${port}!`));
