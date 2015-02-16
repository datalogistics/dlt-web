 http://earthexplorer.usgs.gov/fgdc/4923/LC80120542013154LGN00/

http://landsat.usgs.gov/consumer.php
    http://landsat.usgs.gov/includes/scripts/get_metadata.php?
    sensor_name=LANDSAT_8
    
    &start_date=07/21/1982 -- datebox or slider
    &end_date=02/18/2015
    
    &cloud_cover=100  - Slider - Varies from 0 to 100
    
    &seasonal=false&
    
    aoi_entry=path_row
    &begin_path=12
    &end_path=12
    &begin_row=1
    &end_row=3
    &output_type=unknown


    http://earthexplorer.usgs.gov/EE/InventoryStream/
    latlong?north=12.00000&
    south=2.00000&
    east=3.00000&west=2.00000
    &sensor=LANDSAT_ETM_SLC_OFF
    &start_date=1982-07-11
    &end_date=2015-02-17&cc=2

Schema of data : http://earthexplorer.usgs.gov/EE/metadata.xsd
<sceneID>LC80120012014141LGN00</sceneID>

Currently added an api which can be used as :
http://localhost:42424/api/usgssearch?sensor_name=LANDSAT_8&start_date=07/21/1982&end_date=02/18/2015&cloud_cover=100&seasonal=false&aoi_entry=path_row&begin_path=12&end_path=12&begin_row=1&end_row=3&output_type=unknown



TODO :

* Provide 2 options to search
  - One using the landsat url
  - One using exnodes
* Integrating the search api with the tree browser
* Figure out and document what each part of query maps to
* Is pagination possible ? or Do we need some kind of caching ??
{ sensor_name  :
{
"LANDSAT_8": "Landsat 8 OLI/TIRS"
"LANDSAT_ETM_SLC_OFF" : "Landsat 7 SLC-off (2003 -&gt;)"
"LANDSAT_ETM": "Landsat 7 SLC-on (1999-2003)"
"LANDSAT_TM": "Landsat 4-5 TM"
"LANDSAT_MSS2": "Landsat 4-5 MSS"
"LANDSAT_MSS1": "Landsat 1-3 MSS"
"LANDSAT_COMBINED": "Landsat 4-8 Combined"
}}

Invalid value for
sensor_name,
start_date,
end_date, aoi_entry

Slider 
Longitude : -180 to 180 degrees
Latitude  : -90 to 90 degrees
