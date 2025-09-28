<?php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
// Логування помилок на сторінці
include('../php_functions.php');
ini_set('log_errors', 1);
ini_set('error_log', ROOT_PATH.'/logs/system.log');
error_reporting(E_ALL);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
header('Content-Type: application/json');

// Дані для підключення до БД
$host = DB_HOST;
$user = DB_USERNAME;
$password = DB_PASSWORD;
$database_chernigiv = DB_NAME_CHERNIGIV;

$streetId = isset($_GET['streetId']) ? (int)$_GET['streetId'] : 0;

if ($streetId === 0) {
    echo json_encode(['error' => 'Invalid street ID']);
    exit;
}

$conn = new mysqli($host, $user, $password, $database_chernigiv);

function getStreetData($conn, $streetId) {
    $streetQuery = $conn->prepare("SELECT CONCAT(type, ' ', name) AS full_street_name
                                   FROM street_base
                                   WHERE ID = ?");
    $streetQuery->bind_param('i', $streetId);
    $streetQuery->execute();
    $streetResult = $streetQuery->get_result();
    $streetData = $streetResult->fetch_assoc();
    $streetQuery->close();
    return $streetData;
}

$streetData = getStreetData($conn, $streetId);

if ($streetData) {
    echo json_encode(['street' => $streetData['full_street_name']]);
} else {
    echo json_encode(['error' => 'Street not found']);
}

$conn->close();
?>