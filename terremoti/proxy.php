<?php
if (
    isset($_GET['starttime']) &&
    isset($_GET['endtime']) &&
    isset($_GET['minmagnitude']) &&
    isset($_GET['latitude']) &&
    isset($_GET['longitude']) &&
    isset($_GET['radius'])
) {
    $starttime    = $_GET['starttime'];
    $endtime      = $_GET['endtime'];
    $minmagnitude = $_GET['minmagnitude'];
    $latitude     = $_GET['latitude'];
    $longitude    = $_GET['longitude'];
    $radius       = $_GET['radius'];

    // Logging basico (facoltativo)
    error_log("Parameters: starttime=$starttime, endtime=$endtime, minmagnitude=$minmagnitude, latitude=$latitude, longitude=$longitude, radius=$radius");

    $url = "https://webservices.ingv.it/fdsnws/event/1/query"
         . "?format=geojson"
         . "&starttime=$starttime"
         . "&endtime=$endtime"
         . "&minmagnitude=$minmagnitude"
         . "&latitude=$latitude"
         . "&longitude=$longitude"
         . "&maxradiuskm=$radius";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    $data      = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code == 200) {
        header('Content-Type: application/json');
        echo $data;
    } else {
        header('Content-Type: application/json');
        echo json_encode([
            'error'   => 'Error ' . $http_code,
            'message' => $data
        ]);
    }
} else {
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Invalid parameters'
    ]);
}
//FUNZIONANTE
?>
