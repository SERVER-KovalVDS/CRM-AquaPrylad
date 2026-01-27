<?php 
// ==================================================== З М І Н Н І  ===================================================================================================
// =====================================================================================================================================================================
define('ROOT_PATH', '/var/www/crm_aquaprylad');

$configPath = ROOT_PATH . '/config/default.json';
$configJson = file_get_contents($configPath);
$config = json_decode($configJson, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    error_log('[ERROR] Помилка читання файлу конфігурації: ' . json_last_error_msg(), 0);
    die('Помилка читання конфігураційного файлу');
}

$dbConfig = $config['MySQL']['R145j7_aqua_crm'];
define('DB_HOST', $dbConfig['host']);
define('DB_USERNAME', $dbConfig['user']);
define('DB_PASSWORD', $dbConfig['password']);
define('DB_NAME_AQUACRM', $dbConfig['database']);

$dbConfigChernigiv = $config['MySQL']['R145j7_aqua_crm_chernigiv'];
define('DB_NAME_CHERNIGIV', $dbConfigChernigiv['database']);

$dbConfigBases = $config['MySQL']['R145j7_bases'];
define('DB_NAME_BASES', $dbConfigBases['database']);

// ==================================================== Ф У Н К Ц І Ї ==================================================================================================
// =====================================================================================================================================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);

    if (isset($data['logFile'], $data['pageType'], $data['logLevel'], $data['logMessage'])) {
        logger($data['logFile'], $data['pageType'], $data['logLevel'], $data['logMessage']);
        exit;
    }
}

function GetUserInfo() {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'UNDERFINED';
    $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'UNDERFINED';

    $userinfoText = "---> User IP: " . $ip . PHP_EOL .
                    "---> User agent: " . $user_agent . PHP_EOL .
                    "---> Script filename: " . (isset($_SERVER['SCRIPT_FILENAME']) ? $_SERVER['SCRIPT_FILENAME'] : 'UNDERFINED') . PHP_EOL .
                    "---> Referer: " . (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : 'UNDERFINED') . PHP_EOL .
                    "---> Accept Language: " . (isset($_SERVER['HTTP_ACCEPT_LANGUAGE']) ? $_SERVER['HTTP_ACCEPT_LANGUAGE'] : 'UNDERFINED') . PHP_EOL .
                    "---> Accept Encoding: " . (isset($_SERVER['HTTP_ACCEPT_ENCODING']) ? $_SERVER['HTTP_ACCEPT_ENCODING'] : 'UNDERFINED') . PHP_EOL .
                    "---> Connection: " . (isset($_SERVER['HTTP_CONNECTION']) ? $_SERVER['HTTP_CONNECTION'] : 'UNDERFINED') . PHP_EOL .
                    "---> HTTPS: " . (isset($_SERVER['HTTPS']) ? 'ON' : 'OFF') . PHP_EOL .
                    "---> Server protocol: " . (isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'UNDERFINED') . PHP_EOL .
                    "---> Request method: " . (isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'UNDERFINED') . PHP_EOL;
    $ipInfo = GetIpInfo($ip);
    if ($ipInfo['status'] === 'success') {
        $userinfoText .= 
            "--->>> Country: " . $ipInfo['country'] . PHP_EOL .
            "--->>> Region: " . $ipInfo['regionName'] . PHP_EOL .
            "--->>> City: " . $ipInfo['city'] . PHP_EOL .
            "--->>> Post code: " . $ipInfo['zip'] . PHP_EOL .
            "--->>> Location: " . $ipInfo['lat'] . ", " . $ipInfo['lon'] . PHP_EOL .
            "--->>> Time zone: " . $ipInfo['timezone'] . PHP_EOL .
            "--->>> Provider: " . $ipInfo['isp'] . PHP_EOL .
            "--->>> Organization: " . $ipInfo['org'] . PHP_EOL .
            "--->>> Operator: " . $ipInfo['as'];
    } else {
        $userinfoText .= "Unable to retrieve IP info: " . $ipInfo['message'] . PHP_EOL;
    }
    return [
        'userinfo' => $userinfoText,
        'ip' => $ip,
        'user_agent' => $user_agent,
        'country' => $ipInfo['country'] ?? 'UNKNOWN',
        'city' => $ipInfo['city'] ?? 'UNKNOWN'
    ];
}

function GetIpInfo($ip) {
    $url = "http://ip-api.com/json/{$ip}";
    $context = stream_context_create(array(
        'http' => array(
            'ignore_errors' => true,
        ),
    ));
    $response = file_get_contents($url, false, $context);
    if ($response === FALSE) {
        return ['status' => 'fail', 'message' => 'Network error'];
    }
    $data = json_decode($response, true);

    if (isset($data['status'])) {
        switch ($data['status']) {
            case 'success':
                return [
                    'status' => 'success',
                    'country' => $data['country'],
                    'regionName' => $data['regionName'],
                    'city' => $data['city'],
                    'zip' => $data['zip'],
                    'lat' => $data['lat'],
                    'lon' => $data['lon'],
                    'timezone' => $data['timezone'],
                    'isp' => $data['isp'],
                    'org' => $data['org'],
                    'as' => $data['as']
                ];
            case 'fail':
                error_log('[ERROR] Помилка сервісу ip-api.com: ' . $data['message'], 0);
                return ['status' => 'fail', 'message' => $data['message']];
            default:
                error_log('[ERROR] Невідома помилка сервісу ip-api.com: ' . $data['message'], 0);
                return ['status' => 'fail', 'message' => 'Unknown error'];
        }
    }
    return ['status' => 'fail', 'message' => 'Unexpected response'];
}

function iCheckIP($status, $user_ip, $user_agent, $user_country, $user_city, $user_info, $page) {
    $block_reason = '';
    $description = 'Спроба авторизації CRM - H2O CONTROL';
    $log_message = '';
    $tg_message_allowed = '';
    $tg_message_blocked = '';

    switch ($status) {
        case 'invalid_token':
            $block_reason = 'застарілий токен';
            $log_message = "Unauthorized access attempt with token provided, but the token is not found in the database." . PHP_EOL . $user_info;
            $tg_message_allowed = "🚨 CRM - H2O CONTROL 🚨\n\n🐰🐰🐰🐰🐰🐰🐰🐰🐰🐰🐰🐰🐰\n\nСпроба авторизації\nдовіреного користувача\n(застарілий токен):\n\n" . $user_info;
            $tg_message_blocked = "🚨 CRM - H2O CONTROL 🚨\n\n☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️\n\nНЕВІДОМИЙ користувач\n(застарілий токен):\nIP-адресу ЗАБЛОКОВАНО\n\n" . $user_info;
            break;
        case 'missing_token':
            $block_reason = 'відсутнє COOKIE з токеном';
            $log_message = "Unauthorized access attempt without a token provided (missing cookie)." . PHP_EOL . $user_info;
            $tg_message_allowed = "🚨 CRM - H2O CONTROL 🚨\n\n🐰🐰🐰🐰🐰🐰🐰🐰🐰🐰🐰🐰🐰\n\nСпроба авторизації\nдовіреного користувача\n(відсутнє COOKIE з токеном):\n\n" . $user_info;
            $tg_message_blocked = "🚨 CRM - H2O CONTROL 🚨\n\n☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️\n\nНЕВІДОМИЙ користувач\n(відсутнє COOKIE з токеном):\nIP-адресу ЗАБЛОКОВАНО\n\n" . $user_info;
            break;
        default:
            logger('system', 'iCheckIP', '[ERROR]', "Invalid status passed to iCheckIP: " . $status);
            exit();
    }

    $mysqli = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME_BASES);
    if ($mysqli->connect_error) {
        logger('database', 'AUTH', '[ERROR]', $mysqli->connect_errno . " -> " . $mysqli->connect_error);
        header("Location: ../auth.php");
        exit();
    }

    // Проверка на admin_IPs
    $query = "SELECT ip FROM admin_IPs WHERE ip = ?";
    $stmt = $mysqli->prepare($query);
    $stmt->bind_param("s", $user_ip);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) {
        $stmt->close();
        $mysqli->close();
        return;
    }
    $stmt->close();

    $query = "SELECT ip FROM allowed_IPs WHERE ip = ?";
    $stmt = $mysqli->prepare($query);
    $stmt->bind_param("s", $user_ip);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        logger("system", $page, "[WARN]", $log_message);
        // telegram_BOT($tg_message_allowed);
        $stmt->close();
        $mysqli->close();
        header("Location: ../auth.php");
        exit();
    }
    $stmt->close();

    list($ip1, $ip2, $ip3, $ip4) = array_map('intval', explode('.', $user_ip));
    $is_blocked = false;

    // ==== /8: ip1.*.*.* ====
    $query = "SELECT 1 FROM blocked_IPs 
              WHERE ip1 = ? 
                AND ip2 IS NULL 
                AND ip3 IS NULL 
                AND ip4 IS NULL 
              LIMIT 1";
    $stmt = $mysqli->prepare($query);
    $stmt->bind_param("i", $ip1);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) {
        $is_blocked = true;
    }
    $stmt->close();

    // ==== /16: ip1.ip2.*.* ====
    if (!$is_blocked) {
        $query = "SELECT 1 FROM blocked_IPs 
                  WHERE ip1 = ? 
                    AND ip2 = ? 
                    AND ip3 IS NULL 
                    AND ip4 IS NULL 
                  LIMIT 1";
        $stmt = $mysqli->prepare($query);
        $stmt->bind_param("ii", $ip1, $ip2);
        $stmt->execute();
        $stmt->store_result();
        if ($stmt->num_rows > 0) {
            $is_blocked = true;
        }
        $stmt->close();
    }

    // ==== /24: ip1.ip2.ip3.* ====
    if (!$is_blocked) {
        $query = "SELECT 1 FROM blocked_IPs 
                  WHERE ip1 = ? 
                    AND ip2 = ? 
                    AND ip3 = ? 
                    AND ip4 IS NULL 
                  LIMIT 1";
        $stmt = $mysqli->prepare($query);
        $stmt->bind_param("iii", $ip1, $ip2, $ip3);
        $stmt->execute();
        $stmt->store_result();
        if ($stmt->num_rows > 0) {
            $is_blocked = true;
        }
        $stmt->close();
    }

    // ==== /32: точный IP ====
    if (!$is_blocked) {
        $query = "SELECT 1 FROM blocked_IPs 
                  WHERE ip1 = ? 
                    AND ip2 = ? 
                    AND ip3 = ? 
                    AND ip4 = ? 
                  LIMIT 1";
        $stmt = $mysqli->prepare($query);
        $stmt->bind_param("iiii", $ip1, $ip2, $ip3, $ip4);
        $stmt->execute();
        $stmt->store_result();
        if ($stmt->num_rows > 0) {
            $is_blocked = true;
        }
        $stmt->close();
    }

    if ($is_blocked) {
        $mysqli->close();
        header("Location: blocks/blocked_IPs.html");
        exit();
    }

    if ($user_country !== 'Ukraine') {
        $query = "INSERT INTO blocked_IPs (ip1, ip2, ip3, ip4, user_agent, country, city, block_reason, description) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $mysqli->prepare($query);
        $stmt->bind_param("iiiisssss", $ip1, $ip2, $ip3, $ip4, $user_agent, $user_country, $user_city, $block_reason, $description);
        $stmt->execute();
        $stmt->close();

        logger("system", $page, "[WARN]", $log_message);
        // telegram_BOT($tg_message_blocked);
        $mysqli->close();
        header("Location: ../auth.php");
        exit();
    }
    $mysqli->close();
}

function logger($log_file, $log_page, $log_level, $log_message) {
    ini_set('error_log', ROOT_PATH.'/logs/'.$log_file.'.log');
    error_log($log_page . ' ' . $log_level . ' ' . $log_message, 0);
}

function telegram_BOT($msg) {
    $token = "6693643547:AAH4wFcMnCQQEpnZ7QYW0TqJmwafmwEMFhQ";
    $getQuery = array(
        "chat_id" 	=> 199310090,
        "text"  	=> $msg,
        "parse_mode" => "html"
    );
    $ch = curl_init("https://api.telegram.org/bot".$token."/sendMessage?".http_build_query($getQuery));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);
    $resultQuery = curl_exec($ch);
    curl_close($ch);
}

function db_users_connect() {
    $mysqli = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME_AQUACRM);
    if ($mysqli->connect_error) {
        logger('database', 'AUTH', '[ERROR]', $mysqli->connect_errno . " -> " . $mysqli->connect_error);
        exit();
    }
    return $mysqli;
}

function check_user_credentials($value, $type) {
    $mysqli = db_users_connect();
    if ($type == 'token') {
        $sql = "SELECT * FROM users WHERE token = ?";
    } else if ($type == 'login') {
        $sql = "SELECT * FROM users WHERE login = ?";
    } else {
        return null;
    }

    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param("s", $value);
    $stmt->execute();
    $result = $stmt->get_result();

    $stmt->close();
    $mysqli->close();

    if ($result->num_rows === 1) {
        return $result->fetch_assoc();
    } else {
        return null;
    }
}

function create_token($login, $session = null) {
    $token = bin2hex(random_bytes(16));
    if ($session === 'session') {
        $_SESSION['user_token'] = $token;
    } else {
        $_SESSION['user_token'] = $token;
        setcookie('user_token', $token, [
            'expires' => time() + (86400 * 30),
            'path' => '/',
            'domain' => '',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'Strict'
        ]);
    }
    $mysqli = db_users_connect();
    $update_stmt = $mysqli->prepare("UPDATE `users` SET `token` = ? WHERE `login` = ?");
    $update_stmt->bind_param("ss", $token, $login);
    $update_stmt->execute();
    $update_stmt->close();
    $mysqli->close();

    return $token;
}

function updateHistory($currentDateTime, $processType, $username, $message, $existingHistory = null) {
    $historyEntry = [
        'datetime' => $currentDateTime,
        'process' => $processType,
        'user' => $username,
        'value' => $message
    ];
    if ($existingHistory) {
        $history = json_decode($existingHistory, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            logger('system', 'AUTH', '[ERROR]', 'Помилка при розбиранні існуючої історії: ' . json_last_error_msg());
            throw new Exception("Помилка при розбиранні існуючої історії: " . json_last_error_msg());
        }
        $history[] = $historyEntry;
    } else {
        $history = [$historyEntry];
    }
    return json_encode($history, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

?>