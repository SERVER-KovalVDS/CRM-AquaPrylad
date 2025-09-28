<?php 
    // Логування помилок на сторінці
    include('php_functions.php');
    ini_set('log_errors', 1);
    ini_set('error_log', ROOT_PATH.'/logs/system.log');
    error_reporting(E_ALL);
    // ini_set('display_errors', 1)
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }
    session_destroy();
    setcookie('user_token', "", time()-3600);
    header("Location: auth.php");