<?php
try {
    $actionDescription = '';
    $actionDescription2 = '';
    $processType = '';
    $currentDate = date("d.m.Y");

    switch ($data['action']) {
        case 'apply':
            $actionDescription = 'завершено';
            $actionDescription2 = 'завершення';
            $processType = 'Завершення заявки';
            break;
        case 'cancel':
            $actionDescription = 'відмінено';
            $actionDescription2 = 'відміни';
            $processType = 'Відміна заявки';
            break;
        default:
            throw new Exception('Невідомий тип дії.');
    }

    $taskStmt = $conn->prepare("SELECT address_id, meters_id, tasks_type, DATE_FORMAT(date, '%d.%m.%Y') as date FROM tasks WHERE ID = ?");
    $taskStmt->bind_param("i", $data['taskID']);
    $taskStmt->execute();
    $taskStmt->bind_result($address_id, $meters_id, $tasks_type, $task_date);
    $taskStmt->fetch();
    $taskStmt->close();

    if (!$address_id) {
        throw new Exception('Заявка не знайдена.');
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

    $actionTypes = [];
    foreach ($data['action_type'] as $item) {
        $actionTypes[$item['actionTypeText']][] = $item['meterId'];
    }

    $newTaskIds = [];
    $completedMeterNumbers = [];
    $newTasks = [];

    foreach ($actionTypes as $actionTypeText => $meterIds) {
        if ($actionTypeText === 'ЗАВЕРШИТИ' || $actionTypeText === 'ВІДМІНИТИ') {
            foreach ($meterIds as $meterId) {
                $meterStmt = $conn->prepare("SELECT number, history FROM meters WHERE ID = ?");
                $meterStmt->bind_param("i", $meterId);
                $meterStmt->execute();
                $meterStmt->bind_result($meterNumber, $meterHistory);
                $meterStmt->fetch();
                $meterStmt->close();

                $completedMeterNumbers[] = $meterNumber;

                $meterMessage = "$tasks_type від $task_date для адреси $address було $actionDescription з коментарем: {$data['comment']}.";
                $updatedMeterHistory = updateHistory(date("d.m.Y H:i"), $processType, $username, $meterMessage, $meterHistory);

                $updateMeterStmt = $conn->prepare("UPDATE meters SET history = ? WHERE ID = ?");
                $updateMeterStmt->bind_param("si", $updatedMeterHistory, $meterId);
                $updateMeterStmt->execute();
                $updateMeterStmt->close();
            }
        } else {
            $currentDateTime = date("d.m.Y H:i");
            $history = updateHistory($currentDateTime, 'Створення заявки', $username, "$actionTypeText від $currentDate створена після $actionDescription2 $tasks_type від $task_date з коментарем: {$data['comment']}.");
            $metersList = implode('|', $meterIds);

            $newTaskStmt = $conn->prepare("INSERT INTO tasks (address_id, tasks_type, meters_id, date, status, history) VALUES (?, ?, ?, NOW(), 'Нова заявка', ?)");
            $newTaskStmt->bind_param("isss", $address_id, $actionTypeText, $metersList, $history);
            $newTaskStmt->execute();
            $newTaskIds[] = $newTaskStmt->insert_id;
            $newTaskStmt->close();

            foreach ($meterIds as $meterId) {
                $meterStmt = $conn->prepare("SELECT number, history FROM meters WHERE ID = ?");
                $meterStmt->bind_param("i", $meterId);
                $meterStmt->execute();
                $meterStmt->bind_result($meterNumber, $meterHistory);
                $meterStmt->fetch();
                $meterStmt->close();

                $meterMessage = "$tasks_type від $task_date для адреси $address змінена на $actionTypeText від $currentDate з коментарем: {$data['comment']}.";
                $updatedMeterHistory = updateHistory($currentDateTime, 'Зміна заявки', $username, $meterMessage, $meterHistory);

                $updateMeterStmt = $conn->prepare("UPDATE meters SET history = ? WHERE ID = ?");
                $updateMeterStmt->bind_param("si", $updatedMeterHistory, $meterId);
                $updateMeterStmt->execute();
                $updateMeterStmt->close();
            }

            $newTasks[] = [
                'type' => $actionTypeText,
                'date' => $currentDate,
                'meters' => implode(', ', array_map(function($id) use ($conn) {
                    $number = null;
                    $stmt = $conn->prepare("SELECT number FROM meters WHERE ID = ?");
                    $stmt->bind_param("i", $id);
                    $stmt->execute();
                    $stmt->bind_result($number);
                    $stmt->fetch();
                    $stmt->close();
                    return $number;
                }, $meterIds))
            ];
        }
    }

    $meterNumbersText = '';
    if (!empty($completedMeterNumbers)) {
        $meterNumbersText = count($completedMeterNumbers) > 1 ? 'для лічильників ' . implode(', ', $completedMeterNumbers) : 'для лічильника ' . implode(', ', $completedMeterNumbers);
    }
    $addressMessage = "$tasks_type від $task_date $meterNumbersText було $actionDescription з коментарем: {$data['comment']}.";
    if (!empty($newTasks)) {
        $addressMessage .= count($newTasks) > 1 ? " Нові заявки: " : " Нова заявка: ";
        foreach ($newTasks as $task) {
            $addressMessage .= "$task[type] від $task[date] для " . (strpos($task['meters'], ',') !== false ? "лічильників" : "лічильника") . " $task[meters], ";
        }
        $addressMessage = rtrim($addressMessage, ', ');
    }
    $updatedAddressHistory = updateHistory(date("d.m.Y H:i"), $processType, $username, $addressMessage, $address_history);

    $deleteTaskStmt = $conn->prepare("DELETE FROM tasks WHERE ID = ?");
    $deleteTaskStmt->bind_param("i", $data['taskID']);
    $deleteTaskStmt->execute();
    $deleteTaskStmt->close();

    $logMessage = "$tasks_type від $task_date для адреси $address $meterNumbersText було $actionDescription користувачем [{$_SESSION['user_name']}] з коментарем: {$data['comment']}.";
    if (!empty($newTasks)) {
        $logMessage .= count($newTasks) > 1 ? " Нові заявки: " : " Нова заявка: ";
        foreach ($newTasks as $task) {
            $logMessage .= "$task[type] від $task[date] для " . (strpos($task['meters'], ',') !== false ? "лічильників" : "лічильника") . " $task[meters], ";
        }
        $logMessage = rtrim($logMessage, ', ');
    }
    logger('database', 'ChangeTASK', '[INFO]', $logMessage);

    $response = ['status' => 'success', 'message' => 'Заявка успішно ' . $actionDescription . '.'];

} catch (mysqli_sql_exception $e) {
    $response = ['status' => 'error', 'message' => 'Помилка при завершенні або відміні заявки: ' . $e->getMessage()];
    logger('database', 'ChangeTASK', '[ERROR]', 'Помилка при завершенні або відміні заявки: ' . $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>