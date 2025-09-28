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

if (!isset($_SESSION['user_name'])) {
    header("Location: ../auth.php");
    exit();
}

// Дані для підключення до БД
$host = DB_HOST;
$user = DB_USERNAME;
$password = DB_PASSWORD;
$database = DB_NAME_AQUACRM;
$database_chernigiv = DB_NAME_CHERNIGIV;

$jsonData = file_get_contents('php://input');
$data = json_decode($jsonData, true);

if (!isset($data['type'])) {
    echo json_encode(['status' => 'error', 'message' => 'Тип запиту при зміні даних не вказано.']);
    logger('system', 'EditDATA', '[ERROR]', 'Тип запиту при зміні даних не вказано.');
    exit;
}

$response = [];
switch ($data['type']) {
    case 'EditDataChernigiv':
        $conn = new mysqli($host, $user, $password, $database_chernigiv);
        if ($conn->connect_error) {
            throw new Exception('Помилка підключення до Бази Даних: ' . $conn->connect_error);
        }
        $username = $_SESSION['user_name'];
        switch ($data['edit_field']) {
            case 'fml':
                include('editdata/fml_chernigiv.php');
                break;
            case 'phones':
                include('editdata/phones_chernigiv.php');
                break;
            case 'meters':
                include('editdata/meters_chernigiv.php');
                break;
            case 'serviceType':
                include('editdata/serviceType_chernigiv.php');
                break;
            case 'value':
                include('editdata/value_chernigiv.php');
                break;
            case 'location':
                include('editdata/location_chernigiv.php');
                break;
            case 'balanser':
                include('editdata/balanser_chernigiv.php');
                break;
            case 'address':
                include('editdata/address_chernigiv.php');
                break;
            case 'task_meters':
                include('editdata/task_meters_chernigiv.php');
                break;
            case 'brigade':
                include('editdata/brigade_chernigiv.php');
                break;
            case 'cost':
                include('editdata/cost_chernigiv.php');
                break;
            case 'pay_method':
                include('editdata/pay_method_chernigiv.php');
                break;
            case 'note':
                include('editdata/note_chernigiv.php');
                break;
            case 'identify_meters':
                include('editdata/identify_meters_chernigiv.php');
                break;
            default:
                $response = ['status' => 'error', 'message' => 'Невідоме поле для зміни значень у Базі даних м. Чернігів.'];
                logger('system', 'EditDATA', '[ERROR]', 'Невідоме поле для зміни значень у Базі даних м. Чернігів.');
                break;
        }
        break;
    default:
        if (isset($conn)) {
            $conn->close();
        }
        $response = ['status' => 'error', 'message' => 'Невідомий тип запиту при зміні інформації у Базі даних.'];
        logger('system', 'EditDATA', '[ERROR]', 'Невідомий тип запиту при зміні інформації у Базі даних.');
        break;
}
echo json_encode($response);
?>