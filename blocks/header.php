<?php
    // Логування помилок на сторінці
    include('./php_functions.php');
    ini_set('log_errors', 1);
    ini_set('error_log', ROOT_PATH.'/logs/system.log');
    error_reporting(E_ALL);
    // ini_set('display_errors', 1)
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }

    // Поточна дата і час.
    date_default_timezone_set('Europe/Kyiv');
    $now = date("| j F Y | H:i:s |");

    // Перевірка, чи авторизований користувач
    if (!isset($_SESSION['login']) || !isset($_SESSION['city']) || !isset($_SESSION['role']) || !isset($_SESSION['pages']) || !isset($_SESSION['user_name']) || !isset($_SESSION['user_ip'])) {
        if (isset($_COOKIE['user_token'])) {
            $token = $_COOKIE['user_token'];
            $user = check_user_credentials($token, 'token');
            if ($user) {
                $_SESSION['login'] = $user['login'];
                $_SESSION['city'] = $user['city'];
                $_SESSION['role'] = $user['role'];
                $_SESSION['pages'] = $user['pages'];
                $_SESSION['user_name'] = $user['name1'] . (!empty($user['name2']) ? " " . $user['name2'] : "");
                $_SESSION['user_ip'] = $_SERVER['REMOTE_ADDR'];
                create_token($user['login']);
            } else {
                $user_info_data = GetUserInfo();
                $user_info = $user_info_data['userinfo'];
                $user_ip = $user_info_data['ip'];
                $user_agent = $user_info_data['user_agent'];
                $user_country = $user_info_data['country'];
                $user_city = $user_info_data['city'];
                iCheckIP('invalid_token', $user_ip, $user_agent, $user_country, $user_city, $user_info, $page);
                header("Location: ../auth.php");
                exit();
            }
        } else {
            $user_info_data = GetUserInfo();
            $user_info = $user_info_data['userinfo'];
            $user_ip = $user_info_data['ip'];
            $user_agent = $user_info_data['user_agent'];
            $user_country = $user_info_data['country'];
            $user_city = $user_info_data['city'];
            iCheckIP('missing_token', $user_ip, $user_agent, $user_country, $user_city, $user_info, $page);
            header("Location: ../auth.php");
            exit();
        }
    } else {
        if ($_SESSION['user_ip'] !== $_SERVER['REMOTE_ADDR']) {
            session_unset();
            session_destroy();
            header("Location: ../auth.php");
            exit();
        }
        $token = $_COOKIE['user_token'] ?? $_SESSION['user_token'] ?? '';
    }

    // Отримання списку дозволених міст для користувача.
    $city = explode('|', $_SESSION['city']);
    // Якщо місто не вказане, взяти перше значення із сесії.
    if(!isset($_SESSION['current_city'])) {
        $_SESSION['current_city'] = $city[0];
        $current_city = $city[0];
    } else {
        $current_city = $_SESSION['current_city'];
    }
    // Словник для назви міст на панелі
    $cityNames = array(
        'SUMY' => 'С У М И',
        'CHERNIGIV' => 'Ч Е Р Н І Г І В',
    );
    $current_city_ukr = isset($cityNames[$current_city]) ? $cityNames[$current_city] : 'Н Е В І Д О М О';

    // Перезавантаження сторінки при зміні міста.
    if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['city'])) {
        $_SESSION['current_city'] = $_POST['city'];
        header('Location: ' . $_SERVER['PHP_SELF'] . '?token=' . urlencode($token));
        exit;
    }

    // Отримання списку дозволених сторінок для користувача.
    $allowed_pages = explode('|', $_SESSION['pages']);
    
    // Перевірка прав доступу до даної сторінка користувачем.
    if (in_array($page, $allowed_pages) || $page = 'MAIN') {
        ?>
        <!doctype html>
        <html lang="uk">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, user-scalable=yes, initial-scale=1.0, maximum-scale=10.0, minimum-scale=0.1">
                <meta http-equiv="X-UA-Compatible" content="ie=edge">
                    <title><?php echo $title; ?></title>
                    <link rel="shortcut icon" href="../icons/favicon.png" type="image/png">
                    <link rel='stylesheet' href='css/general.css'>
                    <link rel='stylesheet' href='css/navpanel.css'>
                    <link rel='stylesheet' href='css/footer.css'>
                    <?php echo $styles; ?>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Sofia+Sans+Semi+Condensed&display=swap" rel="stylesheet">
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.7.5/lottie.min.js"></script>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
                    <script src="scripts/token.js"></script>
                    <script src="scripts/common.js"></script>
                    <script src="scripts/logger.js"></script>
                    <script src="scripts/calendar.js"></script>
                    <script type='module' src="scripts/websocket.js"></script>
                    <?php
                        switch ($current_city) {
                            case "SUMY":
                                
                                break;
                            case "CHERNIGIV":
                                ?>
                                    <script type='module' src="scripts/modals_chernigiv.js"></script>
                                <?php
                                break;
                            default:
                                break;
                        }
                    ?>
            </head>
            <body>
                <!-- ПОЧАТОК анімації -->
                    <div id="animation" class="animation">
                        <div id="an-container" class="an-container"></div>
                    </div>
                <!-- КІНЕЦЬ анімації -->

                <!-- ПОЧАТОК панелі заголовку -->
                    <div class="header_title">
                        <div class="header_div">
                            <div class="left_block"><p>CRM - H2O CONTROL</p></div>
                            <div class="middle_block"><p><?php echo $current_city_ukr; ?></p></div>
                            <div class="right_block"><p><?php echo $title; ?></p></div>
                        </div>
                    </div>
                <!-- КІНЕЦЬ панелі заголовку -->

                <!-- ПОЧАТОК панелі навігації -->
                    <!-- Верхня панель навігації -->
                    <div class='topnav stc navi_grid'>
                        <div class="navi navi_grid1" onclick="openNav()">
                                    <div class="icon_navi">
                                        <svg viewBox="0 0 24 24">
                                            <path d="m0,10v14h16v-14H0Zm13,12H3v-2h10v2Zm0-4H3v-2h10v2Zm0-4H3v-2h10v2ZM21,0H3C1.343,0,0,1.343,0,3v5h24V3c0-1.657-1.343-3-3-3Zm-1.846,5.71c-.386.386-1.012.386-1.398,0l-2.756-2.71h6.909l-2.756,2.71Z"/>
                                        </svg>
                                        МЕНЮ
                                    </div>
                                </div>
                        <?php
                            // Вивід кнопки Пошуку.
                            if (isset($nav_search) && $nav_search):?>
                                <div class="navi navi_grid2" onclick="openSearchForm()">
                                    <div class="icon_navi">
                                        <svg viewBox="0 0 24 24">
                                            <path d="m21.416,19.295c.361-.691.584-1.463.584-2.295,0-2.757-2.243-5-5-5s-5,2.243-5,5,2.243,5,5,5c.831,0,1.604-.223,2.295-.584l2.145,2.145c.293.293.677.439,1.061.439s.768-.146,1.061-.439c.586-.586.586-1.535,0-2.121l-2.145-2.145Zm-4.416-.295c-1.103,0-2-.897-2-2s.897-2,2-2,2,.897,2,2-.897,2-2,2Zm1.5-18H5.5C2.462,1,0,3.462,0,6.5v11c0,3.038,2.462,5.5,5.5,5.5h4.499c.829,0,1.5-.672,1.5-1.501,0-.828-.672-1.499-1.5-1.499h-4.499c-1.381,0-2.5-1.119-2.5-2.5v-9.5h18v2.481c0,.821.66,1.489,1.481,1.5.836.011,1.519-.664,1.519-1.5v-3.981c0-3.038-2.462-5.5-5.5-5.5ZM4.5,6c-.828,0-1.5-.672-1.5-1.5s.672-1.5,1.5-1.5,1.5.672,1.5,1.5-.672,1.5-1.5,1.5Zm5,0c-.828,0-1.5-.672-1.5-1.5s.672-1.5,1.5-1.5,1.5.672,1.5,1.5-.672,1.5-1.5,1.5Z"/>
                                        </svg>
                                        ПОШУК
                                    </div>
                                </div>
                            <?php endif; 
                            // Вивід кнопки Фільтрації.
                            if (isset($nav_filter) && $nav_filter):?>
                                <div class="navi navi_grid3" onclick="openFilterForm('<?php echo $page ?>')">
                                    <div class="icon_navi">
                                        <svg viewBox="0 0 24 24">
                                            <path d="m14.5 24a1.488 1.488 0 0 1 -.771-.214l-5-3a1.5 1.5 0 0 1 -.729-1.286v-5.165l-5.966-7.3a4.2 4.2 0 0 1 -1.034-2.782 4.258 4.258 0 0 1 4.253-4.253h13.494a4.254 4.254 0 0 1 3.179 7.079l-5.926 7.303v8.118a1.5 1.5 0 0 1 -1.5 1.5zm-3.5-5.35 2 1.2v-6a1.5 1.5 0 0 1 .335-.946l6.305-7.767a1.309 1.309 0 0 0 .36-.884 1.255 1.255 0 0 0 -1.253-1.253h-13.494a1.254 1.254 0 0 0 -.937 2.086l6.346 7.765a1.5 1.5 0 0 1 .338.949z"/>
                                        </svg>
                                        ФІЛЬТР
                                    </div>
                                </div>
                            <?php endif; 
                            // Вивід кнопки Додавання нового елементу.
                            if (isset($nav_add_new) && $nav_add_new):?>
                                <div class="navi navi_grid4" onclick="openAddNewForm('<?php echo htmlspecialchars($page); ?>')">
                                    <div class="icon_navi">
                                        <svg viewBox="0 0 24 24">
                                            <path d="m16.5 14.5a1.5 1.5 0 0 1 -1.5 1.5h-1.5v1.5a1.5 1.5 0 0 1 -3 0v-1.5h-1.5a1.5 1.5 0 0 1 0-3h1.5v-1.5a1.5 1.5 0 0 1 3 0v1.5h1.5a1.5 1.5 0 0 1 1.5 1.5zm5.5-6.343v10.343a5.506 5.506 0 0 1 -5.5 5.5h-9a5.506 5.506 0 0 1 -5.5-5.5v-13a5.506 5.506 0 0 1 5.5-5.5h6.343a5.464 5.464 0 0 1 3.889 1.611l2.657 2.657a5.464 5.464 0 0 1 1.611 3.889zm-3 10.343v-9.5h-4a2 2 0 0 1 -2-2v-4h-5.5a2.5 2.5 0 0 0 -2.5 2.5v13a2.5 2.5 0 0 0 2.5 2.5h9a2.5 2.5 0 0 0 2.5-2.5z"/>
                                        </svg>
                                        ДОДАТИ
                                    </div>
                                </div>
                            <?php endif;
                            // Вивід кнопки Відправки на принтер.
                            if (isset($nav_print) && $nav_print):?>
                                <div class="navi navi_grid2" onclick="PrintRoute()">
                                    <div class="icon_navi">
                                        <svg viewBox="0 0 24 24">
                                            <path d="M19.5,6H19V4.5A4.505,4.505,0,0,0,14.5,0h-5A4.505,4.505,0,0,0,5,4.5V6H4.5A4.505,4.505,0,0,0,0,10.5v6A4.505,4.505,0,0,0,4.5,21h.776A4.494,4.494,0,0,0,9.5,24h5a4.494,4.494,0,0,0,4.224-3H19.5A4.505,4.505,0,0,0,24,16.5v-6A4.505,4.505,0,0,0,19.5,6ZM8,4.5A1.5,1.5,0,0,1,9.5,3h5A1.5,1.5,0,0,1,16,4.5V6H8Zm8,15A1.5,1.5,0,0,1,14.5,21h-5A1.5,1.5,0,0,1,8,19.5v-2A1.5,1.5,0,0,1,9.5,16h5A1.5,1.5,0,0,1,16,17.5Zm5-3A1.5,1.5,0,0,1,19.5,18H19v-.5A4.505,4.505,0,0,0,14.5,13h-5A4.505,4.505,0,0,0,5,17.5V18H4.5A1.5,1.5,0,0,1,3,16.5v-6A1.5,1.5,0,0,1,4.5,9h15A1.5,1.5,0,0,1,21,10.5Z"/>
                                        </svg>
                                        ДРУК
                                    </div>
                                </div>
                            <?php endif;
                            // Вивід кнопки завантаження файлу EXCEL.
                            if (isset($nav_excel) && $nav_excel):?>
                                <div class="navi navi_grid4" onclick="LoadExcelRoute()">
                                    <div class="icon_navi">
                                        <svg viewBox="0 0 24 24">
                                            <path d="M15.27,13.64l-1.97,2.36,1.97,2.36c.35,.42,.3,1.05-.13,1.41-.19,.16-.41,.23-.64,.23-.29,0-.57-.12-.77-.36l-1.73-2.08-1.73,2.08c-.2,.24-.48,.36-.77,.36-.23,0-.45-.08-.64-.23-.42-.35-.48-.98-.13-1.41l1.97-2.36-1.97-2.36c-.35-.42-.3-1.05,.13-1.41,.43-.35,1.05-.3,1.41,.13l1.73,2.08,1.73-2.08c.35-.42,.98-.48,1.41-.13,.42,.35,.48,.98,.13,1.41Zm6.73-3.15v8.51c0,2.76-2.24,5-5,5H7c-2.76,0-5-2.24-5-5V5C2,2.24,4.24,0,7,0h4.51c1.87,0,3.63,.73,4.95,2.05l3.48,3.49c1.32,1.32,2.05,3.08,2.05,4.95ZM15.05,3.46c-.32-.32-.67-.59-1.05-.81V7c0,.55,.45,1,1,1h4.34c-.22-.38-.49-.73-.81-1.05l-3.48-3.49Zm4.95,7.02c0-.16,0-.33-.02-.49h-4.98c-1.65,0-3-1.35-3-3V2.02c-.16-.02-.32-.02-.49-.02H7c-1.65,0-3,1.35-3,3v14c0,1.65,1.35,3,3,3h10c1.65,0,3-1.35,3-3V10.49Z"/>
                                        </svg>
                                        EXCEL
                                    </div>
                                </div>
                            <?php endif;
                        ?>
                        <div class='navi_r navi_grid5'>
                            <a href='authout.php'>
                                <div class="icon_navi">
                                    <svg viewBox="0 0 24 24">
                                        <path d="m24,12c0,.553-.448,1-1,1h-2.229c-1.046,0-2.032-.557-2.571-1.453l-.564-.936-.941,2.294c-.159.387-.532.62-.926.62-.126,0-.255-.023-.379-.075-.511-.209-.755-.793-.546-1.305l1.505-3.669c-.181-.293-.505-.475-.85-.475h-.894l-2.064,5.033c-.185.449-.02.964.391,1.225l4.591,2.896c.29.184.466.502.466.846v5c0,.553-.448,1-1,1s-1-.447-1-1v-4.448l-4.126-2.604c-1.233-.781-1.726-2.326-1.173-3.675l1.753-4.273h-1.208c-.381,0-.724.212-.894.553l-1.447,2.895c-.247.494-.846.693-1.342.447-.494-.247-.694-.848-.447-1.342l1.447-2.895c.512-1.022,1.54-1.658,2.683-1.658h4.264c1.046,0,2.031.557,2.57,1.453l1.844,3.062c.18.299.508.484.857.484h2.229c.552,0,1,.447,1,1Zm-13.135,4.814c-.515-.207-1.095.044-1.3.557-.153.382-.518.629-.929.629h-4.093c-.495,0-.916.362-.989.852-.188,1.254-.393,2.043-.559,2.53-.458-1.379-.996-4.548-.996-9.382S2.541,3.978,3,2.605c.459,1.372,1,4.545,1,9.395,0,.999-.025,1.991-.074,2.949-.028.551.396,1.021.947,1.05.547.038,1.021-.396,1.05-.948.051-.991.077-2.019.077-3.051,0-3.608-.292-12-3-12S0,8.392,0,12s.292,12,3,12c1.153,0,1.884-1.207,2.391-4h3.245c1.233,0,2.327-.74,2.785-1.885.206-.514-.044-1.096-.557-1.301Zm7.125-11.814c1.381,0,2.5-1.119,2.5-2.5s-1.119-2.5-2.5-2.5-2.5,1.119-2.5,2.5,1.119,2.5,2.5,2.5Z"/>
                                    </svg>
                                    ВИЙТИ
                                </div>
                            </a>
                        </div>
                        <div class='navi_r navi_grid6'>
                            <div class="date_cursor" id='date'></div>
                        </div>
                    </div>
                    <!-- Бічна панель навігації --> 
                    <div id="Sidebar" class="sidebar">
                        <a href="javascript:void(0)" class="closebtn" onclick="closeNav()">×</a>
                        
                        <?php if (count($city) >= 2): ?>
                            <div class="city_btn_container">
                                <form method="post">
                                    <button type="submit" name="city" value="SUMY" class="city_btn <?= $current_city == 'SUMY' ? 'active' : 'inactive' ?>" <?= $current_city == 'SUMY' ? 'disabled' : '' ?>>СУМИ</button>
                                </form>
                                <form method="post">
                                    <button type="submit" name="city" value="CHERNIGIV" class="city_btn <?= $current_city == 'CHERNIGIV' ? 'active' : 'inactive' ?>" <?= $current_city == 'CHERNIGIV' ? 'disabled' : '' ?>>ЧЕРНІГІВ</button>
                                </form>
                            </div>
                            <hr>
                        <?php endif; ?>
                        <div class="pages_btn_container">
                            <a href="<?= htmlspecialchars("index.php") ?>">ГОЛОВНА</a>
                            <?php if (in_array('TASKS', $allowed_pages)): ?>
                                <a href="<?= htmlspecialchars("tasks.php") ?>">АРХІВ ЗАЯВОК</a>
                            <?php endif; ?>
                            <?php if (in_array('ROUTE', $allowed_pages)): ?>
                                <a href="<?= htmlspecialchars("route.php") ?>">МАРШРУТИ</a>
                            <?php endif; ?>
                            <?php if (in_array('METERS', $allowed_pages)): ?>
                                <a href="<?= htmlspecialchars("meters.php") ?>">ЛІЧИЛЬНИКИ</a>
                            <?php endif; ?>
                            <?php if (in_array('ADDRESSES', $allowed_pages)): ?>
                                <a href="<?= htmlspecialchars("adresses.php") ?>">АДРЕСИ</a>
                            <?php endif; ?>
                            <?php if (in_array('REPORTS', $allowed_pages)): ?>
                                <a href="<?= htmlspecialchars("reports.php") ?>">ЗВІТИ</a>
                            <?php endif; ?>
                            <?php if (in_array('SETTINGS' || 'LOGS', $allowed_pages) || in_array('LOGS', $allowed_pages)): ?>
                                <hr>
                            <?php endif; ?>
                            <?php if (in_array('SETTINGS', $allowed_pages)): ?>
                                <a href="<?= htmlspecialchars("settings.php") ?>">НАЛАШТУВАННЯ</a>
                            <?php endif; ?>
                            <?php if (in_array('LOGS', $allowed_pages)): ?>
                                <a href="<?= htmlspecialchars("logs.php") ?>">ЛОГИ</a>
                            <?php endif; ?>
                        </div>
                    </div>

                    <!-- Скрипт формування поточних дати і часу --> 
                    <script>
                        const months =  {   January:"СІЧНЯ",        February:"ЛЮТОГО",      March:"БЕРЕЗНЯ",        April:"КВІТНЯ",
                                            May:"ТРАВНЯ",         June:"ЧЕРВНЯ",          July:"ЛИПНЯ",           August:"СЕРПНЯ",
                                            September:"ВЕРЕСНЯ",    October:"ЖОВТНЯ",       November:"ЛИСТОПАДА",   December:"ГРУДНЯ"};
                        const days =    {   Monday:"ПОНЕДІЛОК",     Tuesday:"ВІВТОРОК",     Wednesday:"СЕРЕДА",     Thursday:"ЧЕТВЕР",
                                                Friday:"ПʼЯТНИЦЯ",      Saturday:"СУБОТА",      Sunday:"НЕДІЛЯ"};
                        setInterval(function(){
                            const currentDateTime = new Date();
                            var day_val = currentDateTime.toLocaleString("en-GB", {timeZone: "Europe/Athens", day: "numeric"});
                            var month_val = currentDateTime.toLocaleString("en-GB", {timeZone: "Europe/Athens", month: "long"});
                            month_val = months[month_val];
                            var year_val = currentDateTime.toLocaleString("en-GB", {timeZone: "Europe/Athens", year: "numeric"});

                            var weekday_name = currentDateTime.toLocaleString("en-GB", {timeZone: "Europe/Athens", weekday: "long"});
                            weekday_name = days[weekday_name]
                            var time_name = currentDateTime.toLocaleString("en-GB", {timeZone: "Europe/Athens", hour: "numeric", minute:"numeric", second:"2-digit"});
                            
                            //Якщо ширина сторінки більша 640 пікселів, то виводити в два рядки, інакше - в один.      
                            if( window.innerWidth >= 640 ){
                                document.getElementById('date').innerHTML = day_val + " " + month_val + " " + year_val + " <br> " + time_name + " | " + weekday_name;
                            } else {
                                document.getElementById('date').innerHTML = day_val + " " + month_val + " " + year_val + " | " + time_name + " | " + weekday_name;
                            } 
                        },1000)
                    </script>
                <!-- КІНЕЦЬ панелі навігації -->

                <!-- Кнопка прокрутки сторінки вгору --> 
                    <button onclick="topFunction()" id="BtnOnTop" title="ВГОРУ">ВГОРУ</button>

                <!-- Скрипт кнопки прокрутки сторінки вгору --> 
                    <script>
                        // Вивід кнопки
                        var BtnOnTop = document.getElementById("BtnOnTop");

                        // Коли сторінка прокручується на 500px від верхньої частини документу, виводиться кнопка
                        window.onscroll = function() {scrollFunction()};

                        function scrollFunction() {
                            if (document.body.scrollTop > 500 || document.documentElement.scrollTop > 500) {
                            BtnOnTop.style.display = "block";
                            } else {
                            BtnOnTop.style.display = "none";
                            }
                        }

                        // Коли натискається кнопка прокрутки документу вгору
                        function topFunction() {
                            document.body.scrollTop = 0;
                            document.documentElement.scrollTop = 0;
                        }
                    </script>
                <!-- Блок іконок SVG -->
                <svg style="display: none;">
                    <defs>
                        <symbol id="plus_icon" viewBox="0 0 24 24">
                            <svg height="24" width="24">
                                <path d="m12 0a12 12 0 1 0 12 12 12.013 12.013 0 0 0 -12-12zm0 21a9 9 0 1 1 9-9 9.01 9.01 0 0 1 -9 9zm1.5-10.5h3.5v3h-3.5v3.5h-3v-3.5h-3.5v-3h3.5v-3.5h3z"/>
                            </svg>
                        </symbol>
                        <symbol id="minus_icon" viewBox="0 0 24 24">
                            <svg height="24" width="24">
                                <path d="m12,0C5.383,0,0,5.383,0,12s5.383,12,12,12,12-5.383,12-12S18.617,0,12,0Zm0,21c-4.962,0-9-4.037-9-9S7.038,3,12,3s9,4.038,9,9-4.038,9-9,9Zm5-9c0,.829-.671,1.5-1.5,1.5h-7c-.829,0-1.5-.671-1.5-1.5s.671-1.5,1.5-1.5h7c.829,0,1.5.671,1.5,1.5Z"/>
                            </svg>
                        </symbol>
                        <symbol id="edit_icon" viewBox="0 0 24 24">
                            <svg height="24" width="24">
                                <path d="m22.75,9.693c.806.914,1.25,2.088,1.25,3.307v5c0,2.757-2.243,5-5,5H5c-2.757,0-5-2.243-5-5v-5c0-2.757,2.243-5,5-5h4c.553,0,1,.448,1,1s-.447,1-1,1h-4c-1.654,0-3,1.346-3,3v5c0,1.654,1.346,3,3,3h14c1.654,0,3-1.346,3-3v-5c0-.731-.267-1.436-.75-1.984-.365-.414-.326-1.046.089-1.412.413-.364,1.045-.326,1.411.088ZM5,15.5c0,.828.672,1.5,1.5,1.5s1.5-.672,1.5-1.5-.672-1.5-1.5-1.5-1.5.672-1.5,1.5Zm6.5,1.5c.828,0,1.5-.672,1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5,1.5.672,1.5,1.5,1.5Zm.5-6v-1.586c0-1.068.416-2.073,1.172-2.828L18.879.879c1.17-1.17,3.072-1.17,4.242,0,.566.566.879,1.32.879,2.121s-.313,1.555-.879,2.122l-5.707,5.707c-.755.755-1.76,1.172-2.828,1.172h-1.586c-.553,0-1-.448-1-1Zm2-1h.586c.534,0,1.036-.208,1.414-.586l5.707-5.707c.189-.189.293-.44.293-.707s-.104-.518-.293-.707c-.391-.391-1.023-.39-1.414,0l-5.707,5.707c-.372.373-.586.888-.586,1.414v.586Z"/>
                            </svg>
                        </symbol>
                        <symbol id="save_icon" viewBox="0 0 24 24">
                            <svg height="24" width="24">
                                <path d="M17,10c-3.86,0-7,3.14-7,7s3.14,7,7,7,7-3.14,7-7-3.14-7-7-7Zm0,12c-2.76,0-5-2.24-5-5s2.24-5,5-5,5,2.24,5,5-2.24,5-5,5Zm3-5c0,.59-.21,1.04-.59,1.41l-1.71,1.71c-.2,.2-.45,.29-.71,.29s-.51-.1-.71-.29c-.39-.39-.39-1.02,0-1.41l.71-.71h-3c-.55,0-1-.45-1-1s.45-1,1-1h3l-.71-.71c-.39-.39-.39-1.02,0-1.41s1.02-.39,1.41,0l1.71,1.71c.37,.37,.59,.82,.59,1.41Zm-13,2h-2c-1.65,0-3-1.35-3-3V5c0-1.65,1.35-3,3-3V6c0,1.1,.9,2,2,2h7c1.1,0,2-.9,2-2V2.83l2.71,2.73c.19,.19,.29,.44,.29,.7v.73c0,.55,.45,1,1,1s1-.45,1-1v-.73c0-.8-.31-1.55-.87-2.11l-3.24-3.27c-.43-.43-.98-.77-1.57-.89-.1-.04-10.33,0-10.33,0C2.24,0,0,2.24,0,5v11c0,2.76,2.24,5,5,5h2c.55,0,1-.45,1-1s-.45-1-1-1Zm0-13V2h7V6H7Zm2.44,6.44c-.36,.36-.51,.87-.41,1.36,.11,.54-.24,1.07-.78,1.18-.07,.01-.13,.02-.2,.02-.47,0-.88-.33-.98-.8-.23-1.15,.12-2.34,.96-3.17,.49-.49,1.1-.82,1.78-.95,.54-.11,1.07,.24,1.18,.78,.11,.54-.24,1.07-.78,1.18-.29,.06-.55,.2-.76,.41Z"/>
                            </svg>
                        </symbol>
                        <symbol id="not-save_icon" viewBox="0 0 24 24">
                            <svg height="24" width="24">
                                <path d="M19.71,15.71l-1.29,1.29,1.29,1.29c.39,.39,.39,1.02,0,1.41-.2,.2-.45,.29-.71,.29s-.51-.1-.71-.29l-1.29-1.29-1.29,1.29c-.2,.2-.45,.29-.71,.29s-.51-.1-.71-.29c-.39-.39-.39-1.02,0-1.41l1.29-1.29-1.29-1.29c-.39-.39-.39-1.02,0-1.41s1.02-.39,1.41,0l1.29,1.29,1.29-1.29c.39-.39,1.02-.39,1.41,0s.39,1.02,0,1.41Zm4.29,1.29c0,3.86-3.14,7-7,7s-7-3.14-7-7,3.14-7,7-7,7,3.14,7,7Zm-2,0c0-2.76-2.24-5-5-5s-5,2.24-5,5,2.24,5,5,5,5-2.24,5-5Zm-14,3c0,.55-.45,1-1,1h-2c-2.76,0-5-2.24-5-5V5C0,2.24,2.24,0,5,0c0,0,10.22-.04,10.33,0,.59,.11,1.14,.46,1.57,.89l3.24,3.27c.56,.56,.87,1.31,.87,2.11v.73c0,.55-.45,1-1,1s-1-.45-1-1v-.73c0-.27-.1-.52-.29-.7l-2.71-2.73v3.17c0,1.1-.9,2-2,2H7c-1.1,0-2-.9-2-2V2c-1.65,0-3,1.35-3,3v11c0,1.65,1.35,3,3,3h2c.55,0,1,.45,1,1ZM14,6V2H7V6h7Zm-3.8,6.03c.54-.11,.89-.64,.78-1.18-.11-.54-.64-.89-1.18-.78-.67,.14-1.29,.47-1.78,.95-.83,.83-1.19,2.02-.96,3.17,.1,.47,.51,.8,.98,.8,.07,0,.13,0,.2-.02,.54-.11,.89-.64,.78-1.18-.1-.5,.05-1,.41-1.36,.21-.21,.47-.35,.76-.41Z"/>
                            </svg>
                        </symbol>
                        <symbol id="new_address_icon" viewBox="0 0 24 24">
                            <svg width="24" height="24">
                                <path d="M12,8c-.552,0-1-.448-1-1v-1c0-.552,.448-1,1-1h1c.552,0,1,.448,1,1v1c0,.552-.448,1-1,1h-1Zm5,0h1c.552,0,1-.448,1-1v-1c0-.552-.448-1-1-1h-1c-.552,0-1,.448-1,1v1c0,.552,.448,1,1,1Zm-1,4c0,.552,.448,1,1,1h1c.552,0,1-.448,1-1v-1c0-.552-.448-1-1-1h-1c-.552,0-1,.448-1,1v1ZM18.5,0h-7c-3.032,0-5.5,2.468-5.5,5.5,0,.828,.672,1.5,1.5,1.5s1.5-.672,1.5-1.5c0-1.379,1.121-2.5,2.5-2.5h7c1.379,0,2.5,1.121,2.5,2.5v13c0,1.379-1.121,2.5-2.5,2.5h-1c-.828,0-1.5,.672-1.5,1.5s.672,1.5,1.5,1.5h1c3.032,0,5.5-2.468,5.5-5.5V5.5c0-3.032-2.468-5.5-5.5-5.5Zm-3.5,15.94v3.56c0,2.481-2.019,4.5-4.5,4.5H4.5c-2.481,0-4.5-2.019-4.5-4.5v-3.56c0-1.525,.689-2.939,1.891-3.881l2.572-2.013c1.787-1.398,4.286-1.399,6.075,0l2.57,2.011c1.202,.942,1.892,2.356,1.892,3.882Zm-3,0c0-.597-.27-1.15-.74-1.52l-2.57-2.011c-.351-.274-.771-.411-1.189-.411s-.839,.137-1.188,.41l-2.572,2.013c-.47,.368-.739,.922-.739,1.519v3.56c0,.827,.673,1.5,1.5,1.5h6c.827,0,1.5-.673,1.5-1.5v-3.56Zm-4,.06h-1c-.552,0-1,.448-1,1v1c0,.552,.448,1,1,1h1c.552,0,1-.448,1-1v-1c0-.552-.448-1-1-1Z"/>
                            </svg>

                        </symbol>
                        <symbol id="new_meter_icon" viewBox="0 0 24 24">
                            <svg width="24" height="24">
                                <path d="m11.996,23.045c-.047.52-.483.91-.995.91-.03,0-.06,0-.091-.004C4.69,23.391,0,18.253,0,12,0,5.383,5.383,0,12,0c6.253,0,11.391,4.69,11.951,10.91.05.55-.356,1.036-.906,1.086-.54.056-1.036-.355-1.086-.906-.467-5.182-4.748-9.09-9.959-9.09C6.486,2,2,6.486,2,12c0,5.211,3.908,9.492,9.09,9.959.55.05.956.536.906,1.086Zm-6.996-15.045v2c0,.553.448,1,1,1s1-.447,1-1v-2c0-.553-.448-1-1-1s-1,.447-1,1Zm4,0v2c0,.553.448,1,1,1s1-.447,1-1v-2c0-.553-.448-1-1-1s-1,.447-1,1Zm4,0v2c0,.553.447,1,1,1s1-.447,1-1v-2c0-.553-.447-1-1-1s-1,.447-1,1Zm4,0v2c0,.553.447,1,1,1s1-.447,1-1v-2c0-.553-.447-1-1-1s-1,.447-1,1Zm7,10.6c0,1.469-.572,2.851-1.611,3.889-1.039,1.039-2.42,1.611-3.889,1.611s-2.851-.572-3.889-1.611c-1.039-1.038-1.611-2.419-1.611-3.889s.572-2.851,1.611-3.889l1.9-1.859c1.096-1.072,2.881-1.072,3.977,0l1.893,1.852c1.047,1.046,1.619,2.428,1.619,3.896Zm-2,0c0-.935-.364-1.813-1.025-2.475l-1.885-1.844c-.165-.162-.378-.242-.59-.242s-.425.08-.59.242l-1.893,1.852c-.653.653-1.018,1.532-1.018,2.467s.364,1.813,1.025,2.475c1.322,1.322,3.627,1.323,4.949,0,.661-.661,1.025-1.54,1.025-2.475Z"/>
                            </svg>
                        </symbol>
                    </defs>
                </svg>
                <!-- КІнець блоку іконок SVG -->
    <?php
    } else {
        logger('system', $page, '[WARN]', "Unauthorized access. User [{$_SESSION['user_name']}] was trying to enter page [$page].");
        header('Location: auth.php');
        exit();
    }
?>