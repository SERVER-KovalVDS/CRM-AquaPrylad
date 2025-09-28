<?php
    // Логування помилок на сторінці
    include('../php_functions.php');
    ini_set('log_errors', 1);
    ini_set('error_log', ROOT_PATH.'/logs/system.log');
    error_reporting(E_ALL);
    ini_set('display_errors', 1);

    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }

    require '../vendor/autoload.php';

    use PhpOffice\PhpSpreadsheet\IOFactory;
    use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

    $messages = "";
    $login = $_SESSION['user_name'];
    $fileName = 'UNKNOWN';


    function parseDate($dateRaw) {
        $formats = ['d-m-Y', 'Y-m-d', 'd/m/Y'];
        foreach ($formats as $format) {
            $dateTime = DateTime::createFromFormat($format, $dateRaw);
            if ($dateTime !== false) {
                return $dateTime->format('Y-m-d');
            }
        }
        return null;
    }

    if ($_SERVER["REQUEST_METHOD"] == "POST") {
        if (empty($_FILES["fileToUpload"]["name"])) {
            $messages = "warning:Файл не був обраний.|";
            redirectWithMSG($messages);
            exit;
        }

        if ($_FILES["fileToUpload"]["size"] > 3 * 1024 * 1024) {
            $messages = "warning:Файл не може бути більше 3 МБ.|";
            redirectWithMSG($messages);
            exit;
        }

        $fileName = basename($_FILES["fileToUpload"]["name"]);

        $target_dir = "../uploads/";
        $target_file = $target_dir . $fileName;
        $fileType = strtolower(pathinfo($target_file, PATHINFO_EXTENSION));

        if ($fileType != "xlsx") {
            $messages = "warning:Тільки файли з розширенням .XLSX дозволені для завантаження.|";
            logger('reports', 'LoadIN', '[WARN]', "Спроба користувача [$login] завантаження до бази даних файлу з розширенням не .XLSX. Назва файлу: [$fileName].");
            redirectWithMSG($messages);
            exit;
        }

        if (move_uploaded_file($_FILES["fileToUpload"]["tmp_name"], $target_file)) {
            $messages = "info:Файл завантажено.|";

            $spreadsheet = IOFactory::load($target_file);
            $sheet = $spreadsheet->getActiveSheet();

            $requiredColumns = [
                'protocol_num' => ['name' => '№ протоколу', 'address' => null],
                'certificate_num' => ['name' => '№ свідоцтва', 'address' => null],
                'certificate_date' => ['name' => 'Дата свідоцтва', 'address' => null],
                'verification_date' => ['name' => 'Дата КЕП', 'address' => null],
                'number' => ['name' => 'Номер лічильника', 'address' => null],
                'type_id' => ['name' => 'Тип лічильника', 'address' => null],
                'prod_date' => ['name' => 'Рік випуску', 'address' => null],
                'service_type' => ['name' => 'Тип послуги', 'address' => null],
                'value' => ['name' => "Об'єм, м.куб.", 'address' => null],
                'result' => ['name' => 'Статус', 'address' => null],
                'validity_date' => ['name' => 'Придатний до', 'address' => null]
            ];

            $highestRow = $sheet->getHighestRow();
            $headerRow = null;

            for ($row = 1; $row <= $highestRow; $row++) {
                $currentRow = [];
                $highestColumn = $sheet->getHighestColumn();
                for ($col = 'A'; $col <= $highestColumn; $col++) {
                    $currentRow[$col] = $sheet->getCell($col . $row)->getValue();
                }
                $containsAnyHeader = false;
                foreach ($requiredColumns as $column) {
                    if (in_array($column['name'], $currentRow)) {
                        $containsAnyHeader = true;
                        break;
                    }
                }

                if ($containsAnyHeader) {
                    $allColumnsFound = true;
                    foreach ($requiredColumns as $key => &$column) {
                        if (in_array($column['name'], $currentRow)) {
                            $column['address'] = array_search($column['name'], $currentRow);
                        } else {
                            $allColumnsFound = false;
                        }
                    }
                    unset($column);
                    if ($allColumnsFound) {
                        $headerRow = $row;
                    }
                    break;
                }
            }
            $missingColumns = [];
            foreach ($requiredColumns as $key => $column) {
                if ($column['address'] === null) {
                    $missingColumns[] = '[ '.$column['name'].' ]#';
                }
            }
            if (!empty($missingColumns)) {
                $messages .= "error:В файлі відсутні необхідні колонки:#" . implode('', $missingColumns) . "|";
                logger('reports', 'LoadIN', '[ERROR]', "Помилка при завантаженні в базу даних користувачем [$login] файлу з назвою [$fileName], в файлі відсутні необхідні колонки: " . implode('', $missingColumns) . ".");
                redirectWithMSG($messages);
                exit;
            }
            $dataStartRow = $headerRow + 1;
            parseFileOne($sheet, $messages, $dataStartRow, $requiredColumns, $login, $fileName);

            unlink($target_file);
            redirectWithMSG($messages);
        } else {
            $messages = "error:Виникла помилка при завантаженні файлу.|";
            logger('reports', 'LoadIN', '[ERROR]', "Помилка при завантаженні в базу даних користувачем [$login] файлу з назвою [$fileName].");
            redirectWithMSG($messages);
        }
    }

    function redirectWithMSG($message) {
        $_SESSION['upload_message'] = $message;
        $token = isset($_GET['token']) ? $_GET['token'] : '';
        header('Location: ../reports.php?token=' . urlencode($token));
        exit;
    }
    
    function parseFileOne(Worksheet $sheet, &$messages, $dataStartRow, $requiredColumns, $login, $fileName) {
    
        $conn = new mysqli(DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME_CHERNIGIV);
    
        if ($conn->connect_error) {
            $messages .= "error:Помилка приєднання:#$conn->connect_error.|";
            logger('reports', 'LoadIN', '[ERROR]', "Помилка приєднання до бази даних при завантаженні файлу з назвою [$fileName] користувачем [$login].");
            return;
        }
    
        $existingMeters = [];
        $result = $conn->query("SELECT number, type_id, prod_date, history FROM meters");
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $key = $row['number'] . '_' . $row['type_id'] . '_' . $row['prod_date'];
                $existingMeters[$key] = $row['history'];
            }
        }
    
        $meterTypes = [];
        $result = $conn->query("SELECT ID, name FROM meters_base");
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $meterTypes[$row['name']] = $row['ID'];
            }
        }
        $insertStmt = $conn->prepare("INSERT INTO meters (protocol_num, certificate_num, certificate_date, verification_date, number, type_id, prod_date, value, result, status, validity_date, service_type, history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if (!$insertStmt) {
            logger('reports', 'LoadIN', '[ERROR]', "Помилка підготовки запиту на вставку при завантаженні файлу з назвою [$fileName] користувачем [$login]. ===> $conn->error .");
            die("error:Помилка підготовки запиту на вставку:#$conn->error .|");
        }
        $updateStmt = $conn->prepare("UPDATE meters SET protocol_num = ?, certificate_num = ?, certificate_date = ?, verification_date = ?, value = ?, result = ?, status = ?, validity_date = ?, service_type = ?, history = ? WHERE number = ? AND type_id = ? AND prod_date = ?");
        if (!$updateStmt) {
            logger('reports', 'LoadIN', '[ERROR]', "Помилка підготовки запиту на оновлення при завантаженні файлу з назвою [$fileName] користувачем [$login]. ===> $conn->error .");
            die("error:Помилка підготовки запиту на оновлення:#$conn->error .|");
        }
    
        $highestRow = $sheet->getHighestRow();
        $totalRows = 0;
        $updatedRows = 0;
        $insertedRows = 0;
        for ($row = $dataStartRow; $row <= $highestRow; $row++) {
            $totalRows++;
            $protocol_numValue = $sheet->getCell($requiredColumns['protocol_num']['address'] . $row)->getValue();
            $certificate_numValue = $sheet->getCell($requiredColumns['certificate_num']['address'] . $row)->getValue();
            $certificate_dateRaw = $sheet->getCell($requiredColumns['certificate_date']['address'] . $row)->getValue();
            $certificate_dateValue = parseDate($certificate_dateRaw);
            $verification_dateRaw = $sheet->getCell($requiredColumns['verification_date']['address'] . $row)->getValue();
            $verification_dateValue = parseDate($verification_dateRaw);
            $numberValue = $sheet->getCell($requiredColumns['number']['address'] . $row)->getValue();
            $type_idValue = $sheet->getCell($requiredColumns['type_id']['address'] . $row)->getValue();
            $prod_dateValue = $sheet->getCell($requiredColumns['prod_date']['address'] . $row)->getValue();
            $valueValue = $sheet->getCell($requiredColumns['value']['address'] . $row)->getValue();
            $service_typeValueRaw = $sheet->getCell($requiredColumns['service_type']['address'] . $row)->getValue();
            if ($service_typeValueRaw === "Холодна вода") {
                $service_typeValue = 1;
            } elseif ($service_typeValueRaw === "Гаряча вода") {
                $service_typeValue = 2;
            } else {
                $service_typeValue = null;
            }
            $resultValue = $sheet->getCell($requiredColumns['result']['address'] . $row)->getValue();
            $statusValue = "Новий";
            if ($resultValue === "Придатний") {
                $resultValue = 1;
                $statusValue = "Повірений";
            } elseif ($resultValue === "Непридатний") {
                $resultValue = 2;
                $statusValue = "Забракований";
            }
            $validity_dateRaw = $sheet->getCell($requiredColumns['validity_date']['address'] . $row)->getValue();
            $validity_dateValue = parseDate($validity_dateRaw);
            $typeName = $type_idValue;
            $typeID = isset($meterTypes[$typeName]) ? $meterTypes[$typeName] : null;
            if (!$typeID) {
                $messages .= "error:Невідомий тип лічильника у рядку $row:#$typeName.|";
                logger('reports', 'LoadIN', '[ERROR]', "Невідомий тип лічильника у рядку $row [$typeName] при завантаженні файлу з назвою [$fileName] користувачем [$login].");
                continue;
            }
            $key = $numberValue . '_' . $typeID . '_' . $prod_dateValue;
    
            $existingHistory = isset($existingMeters[$key]) ? $existingMeters[$key] : null;
            $currentDateTime = date("d.m.Y H:i");
            $processType = isset($existingMeters[$key]) ? 'Оновлення даних' : 'Створення лічильника';
            $message = isset($existingMeters[$key]) ? 'Оновлено дані про результати повірки шляхом завантаження файлу XLSX.' : 'Лічильник додано до Бази Даних м. Чернігів під час додавання результатів повірки шляхом завантаження файлу XLSX.';
            $historyJSON = updateHistory($currentDateTime, $processType, $login, $message, $existingHistory);
            if (isset($existingMeters[$key])) {
                $updateStmt->bind_param("sssssssssssss", $protocol_numValue, $certificate_numValue, $certificate_dateValue, $verification_dateValue, $valueValue, $resultValue, $statusValue, $validity_dateValue, $service_typeValue, $historyJSON, $numberValue, $typeID, $prod_dateValue);
                if (!$updateStmt->execute()) {
                    $messages .= "error:Помилка виконання запиту на оновлення у рядку $row:#$updateStmt->error.|";
                    logger('reports', 'LoadIN', '[ERROR]', "Помилка виконання запиту на оновлення при завантаженні файлу з назвою [$fileName] користувачем [$login] . у рядку $row:#$updateStmt->error.");
                } else {
                    $updatedRows++;
                }
            } else {
                $insertStmt->bind_param("sssssssssssss", $protocol_numValue, $certificate_numValue, $certificate_dateValue, $verification_dateValue, $numberValue, $typeID, $prod_dateValue, $valueValue, $resultValue, $statusValue, $validity_dateValue, $service_typeValue, $historyJSON);
                if (!$insertStmt->execute()) {
                    $messages .= "error:Помилка виконання запиту на вставку у рядку $row:#$insertStmt->error.|";
                    logger('reports', 'LoadIN', '[ERROR]', "Помилка виконання запиту на вставку при завантаженні файлу з назвою [$fileName] користувачем [$login] . у рядку $row:#$insertStmt->error.");
                } else {
                    $insertedRows++;
                }
            }
        }
    
        $messages .= "info:Оброблено записів: $totalRows#Оновлено записів: $updatedRows#Додано нових записів: $insertedRows.|";
        logger('reports', 'LoadIN', '[INFO]', "Користувачем [$login] завантажено інформацію про повірку лічильників з файлу [$fileName]. Оброблено записів: $totalRows. Оновлено записів: $updatedRows. Додано нових записів: $insertedRows.");
    
        $insertStmt->close();
        $updateStmt->close();
        $conn->close();
    }
?>