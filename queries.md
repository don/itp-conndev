## Aggregating Temperature Data

The `data_point` column is JSON data stored in a text field. Unfortunately the [server that stores the data](https://github.com/don/itp-connected-devices) does not reject invalid JSON. Future version of that code should use a JSON datatype for the data_point column. The MySQL function `json_extract` can be used to extract JSON from text columns and long as bad JSON is eliminated with `where json_valid(data_point)`. Note that any data_points using single quotes for JSON keys (e.g. `{'temperature':18.60, 'humidity':25.00}`) is eliminated from these results.

Daily temperatures by device

    select cast(recorded_at as date) as date, mac_address, 
            min(temperature), max(temperature), round(avg(temperature), 2) as as 'avg(temperature)'
        from (
            select id, mac_address, cast(json_extract(data_point, '$.temperature') as DECIMAL(6,2)) as temperature, recorded_at
                from readings
                where json_valid(data_point)
                and json_extract(data_point, '$.temperature') is not null
        ) temperatures
        group by date, mac_address
        order by date, mac_address;

Hourly temperatures by device

    select cast(recorded_at as date) as date, date_format(recorded_at, '%H') as hour, 
            mac_address, min(temperature), max(temperature), round(avg(temperature), 2) as 'avg(temperature)'
        from (
            select id, mac_address, cast(json_extract(data_point, '$.temperature') as DECIMAL(6,2)) as temperature, recorded_at
                from readings
                where json_valid(data_point)
                and json_extract(data_point, '$.temperature') is not null
        ) temperatures
        group by date, hour, mac_address
        order by mac_address, date, hour;

15 minute averages by device. Note that 900 seconds is 15 minutes. Using `DIV` to do integer division allows us to bucket data into 15 minute chunks.

    select from_unixtime(unix_timestamp(recorded_at) DIV 900 * 900) as fifteen_min,
            mac_address, min(temperature), max(temperature), round(avg(temperature), 2) as 'avg(temperature)'
        from (
            select id, mac_address, cast(json_extract(data_point, '$.temperature') as DECIMAL(6,2)) as temperature, recorded_at
                from readings
                where json_valid(data_point)
                and json_extract(data_point, '$.temperature') is not null
        ) temperatures
        group by fifteen_min, mac_address
        order by mac_address, fifteen_min;

The `/cleanup` URL pulls all the data from the readings table onto the server, cleans it up, and inserts it into the `cleaned_data` table. These queries do the same thing as above but use the `cleaned_data` table instead of the subquery;

Daily temperatures by device

    select cast(recorded_at as date) as date, mac_address, 
            min(temperature), max(temperature), round(avg(temperature), 2) as 'avg(temperature)'
        from cleaned_data
        group by date, mac_address
        order by date, mac_address;

Hourly temperatures by device

    select cast(recorded_at as date) as date, date_format(recorded_at, '%H') as hour, 
            mac_address, min(temperature), max(temperature), round(avg(temperature), 2) as 'avg(temperature)' 
        from cleaned_data 
        group by date, hour, mac_address
        order by mac_address, date, hour;

15 minute averages by device

    select from_unixtime(unix_timestamp(recorded_at) DIV 900 * 900) as fifteen_min,
            mac_address, min(temperature), max(temperature), round(avg(temperature), 2) as 'avg(temperature)'
        from cleaned_data 
        group by fifteen_min, mac_address
        order by mac_address, fifteen_min;
