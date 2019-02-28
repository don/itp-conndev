window.addEventListener("load", getDeviceList);

// Get a list of devices from the server
async function getDeviceList() {
    const response = await fetch('device');
    const devices = await response.json();
    buildSelectControl(devices);
    chart_div.style.height = `${window.innerHeight * 0.8}px`
    setTimeout(getChartData, 500, deviceSelect.value);
}

// Build HTML for <select> control with devices
function buildSelectControl(devices) {
    // build the dom
    const select = document.querySelector('select');
    devices.forEach(device => {
        const option = document.createElement('option');
        option.innerText = device;
        select.appendChild(option);
    })
    select.addEventListener('change', onDeviceSelected, false);

    // pick a row with good data
    // deviceSelect.selectedIndex = 4;
}

// onChange event handler for device <select> control
function onDeviceSelected(e) {
    const device = e.target.value;
    getChartData(device);
}

// Get temperature data from the server for the selected device
async function getChartData(device) {
    const response = await fetch(`device/${device}/temperature`);
    const json = await response.json();
    const rows = json.map(row => [new Date(row.recorded_at), row.temperature]);
    drawChart(rows);
}

// Draw the chart
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