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
$page = 'AUTH';
$login = $_POST['login'];
$password = $_POST['password'];

// Пошук користувача по логіну.
$user = check_user_credentials($login, 'login');
// Якщо користучача знайдено, перевіока паролю.
if ($user) {
    $login_name = $user['name1'] . (!empty($user['name2']) ? " " . $user['name2'] : "");
    if (password_verify($password, $user['password'])) {
        $_SESSION['login'] = $user['login'];
        $_SESSION['city'] = $user['city'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['pages'] = $user['pages'];
        $_SESSION['user_name'] = $user['name1'] . (!empty($user['name2']) ? " " . $user['name2'] : "");
        $_SESSION['user_ip'] = $_SERVER['REMOTE_ADDR'];
        // Якщо встановлено прапорець ЗАПАМʼЯТАТИ,
        if (isset($_POST['remember'])) {
            $token = create_token($user['login']);
            if ($login != "kovaladmin") {
                $user_info_data = GetUserInfo();
                $user_info = $user_info_data['userinfo'];
                logger("enter", $page, "[INFO]", "User [$login_name] entered system with flag REMEMBER." . PHP_EOL . $user_info);
                // telegram_BOT("CRM - H2O CONTROL:\nUser [$login_name] entered system with flag REMEMBER.\n" . PHP_EOL . $user_info);
            }
        } else {
            $token = create_token($user['login'], 'session');
            if ($login != "kovaladmin") {
                $user_info_data = GetUserInfo();
                $user_info = $user_info_data['userinfo'];
                logger("enter", $page, "[INFO]", "User [$login_name] entered system." . PHP_EOL . $user_info);
                // telegram_BOT("CRM - H2O CONTROL:\nUser [$login_name] entered system.\n" . PHP_EOL . $user_info);
            }
        }
        header("Location: index.php");
    } else {
        $_SESSION['autherr'] = "Пароль ХИБНИЙ!";
        if ($login != "kovaladmin") {
            logger('enter', $page, '[ERROR]', 'Wrong password for user ['.$login_name.']');
        }
        header("Location: auth.php");
    }
} else {
    $_SESSION['autherr'] = "Такого логіну не існує!";
    if ($login != "kovaladmin") {
        logger('enter', $page, '[ERROR]', 'Wrong user name - ['.$login.']');
    }
    header("Location: auth.php");
}
