let jsonData;
let macAddresses;

window.addEventListener("load", getData);

async function getData() {
    const response = await fetch('data.json');
    try {
        jsonData = await response.json();
        macAddresses = await getMacAddresses();
        setTimeout(drawChart, 500);        
    } catch (e) {
        alert(e);
    }
}

// get unique MAC addresses from the JSON data
async function getMacAddresses() {
    const set = new Set(jsonData.map(row => row.mac_address));
    const addresses = Array.from(set);
    addresses.sort();
    console.log(addresses);
    return addresses;
}

function drawChart() {
    const data = new google.visualization.DataTable();
    data.addColumn('date', 'Date');
    macAddresses.forEach(address => {
        // the data holds temperature values, but the label is the device macAddress
        data.addColumn('number', address);
    });

    // build a sparse array for each device to make Google Chart's happy
    macAddresses.forEach((macAddress, i) => {
        const sensorData = jsonData.filter(row => row.mac_address === macAddress);
        const rows = sensorData.map(obj => {
            const row = new Array(macAddresses.length + 1);
            row[0] = new Date(obj.recorded_at);
            row[i+1] = obj.temperature;
            return row;
        }); 
        data.addRows(rows);           
    })

    var options = {
        hAxis: {
            title: 'Time'
        },
        vAxis: {
            title: 'Temperature',
            viewWindow:{
                max:10,
                min:40
            }
        },
        series: {
            1: {curveType: 'function'}
        },
        explorer: { actions: ['dragToZoom', 'rightClickToReset'] }
    };

    var chart = new google.visualization.LineChart(document.getElementById('chart_div'));
    chart.draw(data, options);
}

google.charts.load('current', {packages: ['corechart', 'line']});
