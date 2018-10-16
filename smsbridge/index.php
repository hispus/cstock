<?php
//Make sure that it is a POST request.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  die();
}

//get our params
require "config.php";

//The JSON payload.
$text = $_POST['text'];
$originator = $_POST['from'];
$gatewayID = "AfricaTalking";
$senddate=$_POST['date'];

if ($_POST['linkId']) {
  $gatewayID = $_POST['linkId'];
}

/*This section was to handle the REC dates issues*/
/*if (strpos($_POST['text'], 'REC') !== false) {
    $senddate=date("Y-n-j", strtotime("first day of previous month"));
}*/

if (!$text || !$originator || !$gatewayid) {
  // error_log(print_r($_POST,true));
  http_response_code(404);
  echo "Sorry, bad request";
  die();
}

$jsonData = array(
    'text' => $text,
    'originator' => $originator,
    'gatewayid' => $gatewayID,
    'receiveddate' => $senddate,
    'sentdate' => $_POST['date'],
    'smsencoding' => "1"
);

//Initiate cURL
$ch = curl_init($config['server']);

//Encode the array into JSON.
$jsonDataEncoded = json_encode($jsonData);

//Tell cURL that we want to send a POST request.
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_ENCODING, "");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);

//Attach our encoded JSON string to the POST fields.
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonDataEncoded);

//Set the content type to application/json
$headers = array(
    "content-type: application/json",
);
//username and password
curl_setopt($ch, CURLOPT_USERPWD, $config['authentication']);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
$err = curl_error($ch);

curl_close($ch);

if ($err) {
  error_log(print_r($err,TRUE));
}
else {
  // $myfile4 = fopen("curl_response.txt", "a") or die("Unable to open file!");
  // fwrite($myfile4, print_r($response,TRUE));
  // fclose($myfile4);
  echo "Success. ". date();
}
