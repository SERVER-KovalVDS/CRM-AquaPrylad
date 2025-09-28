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
    $database = DB_NAME_AQUACRM;
    $database_chernigiv = DB_NAME_CHERNIGIV;

    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);

    if (!isset($data['type'])) {
        echo json_encode(['status' => 'error', 'message' => 'Тип запиту при додаванні нового елементу не вказано.']);
        logger('system', 'NewDATA', '[ERROR]', 'Тип запиту при додаванні нового елементу не вказано.');
        exit;
    }
    $response = [];
    $username = $_SESSION['user_name'];
    $conn = new mysqli($host, $user, $password, $database_chernigiv);
    switch ($data['type']) {
        case 'NewAddressChernigiv':
            include('addnewdata/new_address_chernigiv.php');
            break;
        case 'NewMeterChernigiv':
            include('addnewdata/new_meter_chernigiv.php');
            break;
        case 'NewTaskChernigiv':
            include('addnewdata/new_task_chernigiv.php');
            break;
        case 'DellTaskChernigiv':
            include('addnewdata/dell_task_chernigiv.php');
            break;
        case 'ChangeTaskChernigiv':
            include('addnewdata/change_task_chernigiv.php');
            break;
        default:
            $response = ['status' => 'error', 'message' => 'Невідомий тип запиту<br>при додаванні інформації<br>до Бази даних.'];
            logger('system', 'NewDATA', '[ERROR]', 'Невідомий тип запиту при додаванні інформації до Бази даних.');
            break;
    }
echo json_encode($response);