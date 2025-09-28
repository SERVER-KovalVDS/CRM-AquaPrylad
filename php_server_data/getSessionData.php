<?php
    // Логування помилок на сторінці
    include('../php_functions.php');
    ini_set('log_errors', 1);
    ini_set('error_log', ROOT_PATH.'/logs/system.log');
    error_reporting(E_ALL);
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }

    header('Content-Type: application/json');

    if (isset($_SESSION['login']) && isset($_SESSION['city']) && isset($_SESSION['role']) && isset($_SESSION['pages']) && isset($_SESSION['user_name'])) {
        echo json_encode([
            'login' => $_SESSION['login'],
            'city' => $_SESSION['city'],
            'role' => $_SESSION['role'],
            'pages' => $_SESSION['pages'],
            'user_name' => $_SESSION['user_name'],
            'user_token' => $_SESSION['user_token']
        ]);
    } else {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized']);
    }
?>