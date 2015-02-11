 http://earthexplorer.usgs.gov/fgdc/4923/LC80120542013154LGN00/

http://landsat.usgs.gov/consumer.php
    http://landsat.usgs.gov/includes/scripts/get_metadata.php?
    sensor_name=LANDSAT_8
    &start_date=07/21/1982
    &end_date=02/18/2015
    &cloud_cover=100
    &seasonal=false&aoi_entry=path_row
    &begin_path=12
    &end_path=12
    &begin_row=1
    &end_row=3
    &output_type=unknown

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
        
  
