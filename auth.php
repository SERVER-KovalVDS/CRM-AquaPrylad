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
?>

<!doctype html>
<html lang="uk">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, user-scalable=yes, initial-scale=1.0, maximum-scale=10.0, minimum-scale=0.1">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
            <title>AQUAPRYLAD CRM</title>
            <link rel="shortcut icon" href="../icons/favicon.png" type="image/png">
            <link rel="stylesheet" href="css/auth.scss">
            <link rel="preconnect" href="https://fonts.googleapis.com"> 
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> 
            <link href="https://fonts.googleapis.com/css2?family=Rubik+Burned&family=Sofia+Sans+Semi+Condensed&display=swap" rel="stylesheet">
    </head>
    <body>

    <div class="auth_field">
        <div class="auth_div">
            <div class="auth_title"><h1>CRM АКВАПРИЛАД</h1><h3>програма обліку</h3><h3>повірки лічильників</h3></div>
            <?php
                if (isset($_SESSION['autherr'])) {
                    echo "<div class='errmsg_div'> " . $_SESSION['autherr'] . " </div>";
                }
            ?>
            <form class="auth_form" action="authorization.php" method="post">
                <div class="auth_values">
                    <label for="login"><h2>Л О Г І Н</h2></label>
                    <input type="text" name="login" id="login" required>
                </div>
                <div class="auth_values">
                    <label for="password"><h2>П А Р О Л Ь</h2></label>
                    <input type="password" name="password" id="password" required>
                </div>
                    <div class="chkbx"><input type="checkbox" name="remember" id="remember" checked></div>
                    <div class="chkbx_val"><span>Зберегти</span></div>
                <div class="auth_submit">
                    <input type="submit" name="submit" value="ВХІД">
                </div>      
            </form>
        </div>
    </div>

    </body>
</html> 