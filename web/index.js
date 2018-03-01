var data;

// Get the data
fetch('data.json')
  .then(function(response) {
      return response.json();
  })
  .then(function(data) {

    this.data = data;
    buildSelectControl();
    setTimeout(showChart, 500, deviceSelect.value);
});

// Build HTML for <select> control with MAC addresses
function buildSelectControl() {
    // get unique MAC addresses that are in the data
    const set = new Set(data.map(row => row.macAddress));
    const addresses = Array.from(set);
    addresses.sort();

    // build the dom
    const select = document.querySelector('select');
    addresses.forEach(address => {
        const option = document.createElement('option');
        option.innerText = address;
        select.appendChild(option);
    })
    select.addEventListener('change', onDeviceSelected, false);

    // pick a row with good data
    deviceSelect.selectedIndex = 2;
}

function onDeviceSelected(e) {
    const macAddress = e.target.value;
    showChart(macAddress);
}

function showChart(macAddress) {
    // filter the data by the selected mac address
    const sensorData = data.filter(row => row.macAddress === macAddress);
    const rows = sensorData.map(row => [new Date(row.timestamp), row.temperature]);
    drawChart(rows);
}

function drawChart(rows) {
    var data = new google.visualization.DataTable();
    data.addColumn('date', 'Date');
    data.addColumn('number', 'Temperature');
    data.addRows(rows);

    var chart = new google.visualization.AnnotationChart(document.getElementById('chart_div'));

    var options = {
      displayAnnotations: true
    };

    chart.draw(data, options);
}

google.charts.load('current', {'packages':['annotationchart']});
