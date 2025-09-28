<?php
    try {
        $actionDescription = '';
        $processType = '';
        $reason = '';
        $CurrentDate = date("d.m.Y H:i");

        $taskStmt = $conn->prepare("SELECT address_id, meters_id, tasks_type, DATE_FORMAT(date, '%d.%m.%Y') as date, DATE_FORMAT(work_date, '%Y-%m-%d') as work_date, brigade FROM tasks WHERE ID = ?");
        $taskStmt->bind_param("i", $data['taskID']);
        $taskStmt->execute();
        $taskStmt->bind_result($address_id, $meters_id, $tasks_type, $task_date, $work_date, $brigade);
        $taskStmt->fetch();
        $taskStmt->close();

        if (!$address_id) {
            throw new Exception('Заявка не знайдена.');
        }

        if ($data['action'] == 'apply') {
            $errors = [];
            if (empty($work_date)) {
                $errors[] = 'відсутня дата виконання';
            }
            if (empty($brigade) || $brigade == 'ЗАПЛАНОВАНІ') {
                $errors[] = 'відсутній виконавець';
            }
            if (!empty($errors)) {
                $response = ['status' => 'error', 'message' => 'Неможливо закрити заявку!<br>' . implode(' та ', $errors) . '.'];
                echo json_encode($response);
                exit;
            }
            $workDateTimestamp = strtotime($work_date);
            $currentDateTimestamp = strtotime(date("Y-m-d"));
            if ($workDateTimestamp > $currentDateTimestamp) {
                $response = ['status' => 'error', 'message' => 'Неможливо закрити заявку!<br>Дата виконання робіт не може бути майбутньою.<br>Роботи заплановано на ' . date("d.m.Y", $workDateTimestamp) . '.'];
                echo json_encode($response);
                exit;
            }
        }

        switch ($data['action']) {
            case 'apply':
                $actionDescription = 'завершено';
                $processType = 'Завершення заявки';
                $reason = 'Виконана';
                break;
            case 'cancel':
                $actionDescription = 'відмінено';
                $processType = 'Відміна заявки';
                $reason = 'Відмінена';
                break;
            default:
                throw new Exception('Невідомий тип дії.');
        }

        $addressStmt = $conn->prepare("SELECT a.adr_street_id, a.adr_building, a.adr_building2, a.adr_fl_of, a.phone, a.history, 
                                        CONCAT(sb.type, ' ', sb.name) AS street 
                                        FROM addresses a
                                        LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
                                        WHERE a.ID = ?");
        $addressStmt->bind_param("i", $address_id);
        $addressStmt->execute();
        $result = $addressStmt->get_result();
        $row = $result->fetch_assoc();
        $addressStmt->close();

        $address_history = $row['history'];
        $address = $row['street'] . ', буд. ' . $row['adr_building'];
        if ($row['adr_building2']) {
            $address .= ', корп. ' . $row['adr_building2'];
        }
        $address .= ', кв. ' . $row['adr_fl_of'];

        $meterNumbers = [];
        if ($meters_id) {
            $nonumberCount = 0;
            $meterIds = explode('|', $meters_id);
            foreach ($meterIds as $meterId) {
                if (strpos($meterId, 'nonumber') !== false) {
                    $nonumberCount++;
                } else {

                    $meterStmt = $conn->prepare("SELECT number, history, address_id FROM meters WHERE ID = ?");
                    $meterStmt->bind_param("i", $meterId);
                    $meterStmt->execute();
                    $meterStmt->bind_result($meterNumber, $meterHistory, $meterAddressId);
                    $meterStmt->fetch();
                    $meterStmt->close();

                    $meterNumbers[] = $meterNumber;
                    $addressUpdateMessage = '';

                    if (!$meterAddressId) {
                        $addressUpdateMessage = "Лічильник додано до адреси: $address.";
                    } elseif ($meterAddressId != $address_id) {
                        $addressUpdateMessage = "У лічильника змінено адресу на: $address.";
                    }

                    $meterMessage = "$tasks_type від $task_date для адреси $address було $actionDescription з коментарем: {$data['comment']}.$addressUpdateMessage";
                    $updatedMeterHistory = updateHistory($CurrentDate, $processType, $username, $meterMessage, $meterHistory);

                    $updateMeterStmt = $conn->prepare("UPDATE meters SET history = ? WHERE ID = ?");
                    $updateMeterStmt->bind_param("si", $updatedMeterHistory, $meterId);
                    $updateMeterStmt->execute();
                    $updateMeterStmt->close();
                }
            }

            if ($nonumberCount > 0) {
                $meterNumbers[] = "БЕЗ НОМЕРА - $nonumberCount шт.";
            }
        }

        $meterNumbersText = '';
        if (empty($meterNumbers)) {
            $meterNumbersText = 'без лічильників';
        } else {
            $meterNumbersText = count($meterNumbers) > 1 ? 'для лічильників ' . implode(', ', $meterNumbers) : 'для лічильника ' . implode(', ', $meterNumbers);
        }
        $addressMessage = "$tasks_type від $task_date $meterNumbersText було $actionDescription з коментарем: {$data['comment']}.";
        $updatedAddressHistory = updateHistory($CurrentDate, $processType, $username, $addressMessage, $address_history);  

        $updateAddressStmt = $conn->prepare("UPDATE addresses SET history = ? WHERE ID = ?");
        $updateAddressStmt->bind_param("si", $updatedAddressHistory, $address_id);
        $updateAddressStmt->execute();
        $updateAddressStmt->close();

        $taskHistoryStmt = $conn->prepare("SELECT history FROM tasks WHERE ID = ?");
        $taskHistoryStmt->bind_param("i", $data['taskID']);
        $taskHistoryStmt->execute();
        $taskHistoryStmt->bind_result($task_history);
        $taskHistoryStmt->fetch();
        $taskHistoryStmt->close();

        $taskMessage = "Заявку було $actionDescription з коментарем: {$data['comment']}.";
        $updatedTaskHistory = updateHistory($CurrentDate, $processType, $username, $taskMessage, $task_history);

        $archiveStmt = $conn->prepare("INSERT INTO tasks_archive (date, work_date, tasks_type, address_id, meters_id, brigade, cost, pay_method, status, note, history) 
                SELECT date, work_date, tasks_type, address_id, meters_id, brigade, cost, pay_method, ?, note, ? FROM tasks WHERE ID = ?");
        $archiveStmt->bind_param("ssi", $reason, $updatedTaskHistory, $data['taskID']);
        $archiveStmt->execute();
        $archiveStmt->close();

        $deleteTaskStmt = $conn->prepare("DELETE FROM tasks WHERE ID = ?");
        $deleteTaskStmt->bind_param("i", $data['taskID']);
        $deleteTaskStmt->execute();
        $deleteTaskStmt->close();

        $logMessage = "$tasks_type від $task_date для адреси $address $meterNumbersText було $actionDescription користувачем [{$_SESSION['user_name']}] з коментарем: {$data['comment']}.";
        logger('database', 'DellTASK', '[INFO]', $logMessage);

        $response = ['status' => 'success', 'message' => 'Заявка успішно ' . $actionDescription . '.'];

    } catch (mysqli_sql_exception $e) {
        $response = ['status' => 'error', 'message' => 'Помилка при завершенні або відміні заявки: ' . $e->getMessage()];
        logger('database', 'DellTASK', '[ERROR]', 'Помилка при завершенні або відміні заявки: ' . $e->getMessage());
    } finally {
        if (isset($conn)) {
            $conn->close();
        }
    }
?>