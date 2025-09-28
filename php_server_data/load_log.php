<?php
$log = $_GET['log'];
$validLogs = ['CRM_WS', 'database', 'enter', 'reports', 'system', 'websocket'];
$logFilePath = "../logs/{$log}.log";

if (in_array($log, $validLogs) && file_exists($logFilePath)) {
    echo file_get_contents($logFilePath);
} else {
    echo "Invalid log file or log file does not exist.";
}
?>