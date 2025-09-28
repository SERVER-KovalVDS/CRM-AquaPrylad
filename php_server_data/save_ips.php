<?php
$data = json_decode(file_get_contents('php://input'), true);
$filePath = 'SuspiciousIPs.json';

if (file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT))) {
    http_response_code(200);
    echo 'Success';
} else {
    http_response_code(500);
    echo 'Failed to save data';
}