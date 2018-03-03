let jsonData;
let macAddresses;

// Get the data
fetch('data.json')
  .then(function(response) {
      return response.json();
  })
  .then(function(data) {

    jsonData = data;
    macAddresses = getMacAddresses();
    setTimeout(drawChart, 500);
});

// get unique MAC addresses that are in the data
function getMacAddresses() {
    const set = new Set(jsonData.map(row => row.macAddress));
    const addresses = Array.from(set);
    addresses.sort();

    // remove the fake addresses
    const filtered = addresses.filter(a => !(a === '12:12' || a === 'F8:SA:MP:LE:MA:CC'));
    return filtered;
}

function drawChart() {
    const data = new google.visualization.DataTable();
    data.addColumn('date', 'Date');
    macAddresses.forEach(address => {
        // the data hold temperature, but the label is the device macAddress
        data.addColumn('number', address);
    });

    // build a sparse array for each device to make Google Chart's happy
    macAddresses.forEach((macAddress, i) => {
        const sensorData = jsonData.filter(row => row.macAddress === macAddress);
        const rows = sensorData.map(obj => {
            const row = new Array(macAddresses.length + 1);
            row[0] = new Date(obj.timestamp);
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
