<?php
try {
    $taskId = $data['DataId'];
    
    $vocabularyFilePath = __DIR__ . '/../../vocabulary.json';
    if (!file_exists($vocabularyFilePath)) {
        throw new Exception("Файл vocabulary.json не найден по пути: $vocabularyFilePath");
    }
    $vocabulary = json_decode(file_get_contents($vocabularyFilePath), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Ошибка при декодировании JSON из vocabulary.json: " . json_last_error_msg());
    }

    $nonumberMetersTypes = $vocabulary['chernigiv']['nonumber_meters_types'];

    $selectQuery = $conn->prepare("SELECT t.date, t.tasks_type, t.address_id, t.meters_id, t.history, 
                                    CONCAT(sb.type, ' ', sb.name) AS street, a.adr_building, a.adr_building2, a.adr_fl_of,
                                    DATE_FORMAT(t.date, '%d.%m.%Y') as formatted_date
                                    FROM tasks t
                                    LEFT JOIN addresses a ON t.address_id = a.ID
                                    LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
                                    WHERE t.ID = ?");
    $selectQuery->bind_param('i', $taskId);
    $selectQuery->execute();
    $result = $selectQuery->get_result();

    if ($result->num_rows === 0) {
        $response = (['status' => 'error', 'message' => 'Заявка не знайдена.']);
        $selectQuery->close();
        $conn->close();
        echo json_encode($response);
        exit();
    }
    
    $row = $result->fetch_assoc();
    $addressId = $row['address_id'];

    $address = $row['street'] . ', буд. ' . $row['adr_building'];
    if ($row['adr_building2']) {
        $address .= ', корп. ' . $row['adr_building2'];
    }
    $address .= ', кв. ' . $row['adr_fl_of'];
    
    $metersId = explode('|', $row['meters_id']);
    $taskHistory = $row['history'];
    $tasksType = $row['tasks_type'];
    $taskDate = $row['formatted_date'];
    $selectQuery->close();

    $changes = $data['edit_values'];
    $addMeters = [];
    $dellMeters = [];
    $nonumberCount = 0;

    foreach ($changes as $change) {
        $meterId = $change['id'];
        $action = $change['action'];

        $isNonumberMeter = in_array($meterId, $nonumberMetersTypes);

        if ($action == 'add' && !$isNonumberMeter) {
            if (!in_array($meterId, $metersId)) {
                $metersId[] = $meterId;
                $meterQuery = $conn->prepare("SELECT number, history FROM meters WHERE ID = ?");
                $meterQuery->bind_param('i', $meterId);
                $meterQuery->execute();
                $meterResult = $meterQuery->get_result();
                $meterRow = $meterResult->fetch_assoc();
                $meterQuery->close();

                if ($meterRow) {
                    $meterNumber = $meterRow['number'];
                    $meterHistory = $meterRow['history'];
                
                    $message = "Лічильник $meterNumber був доданий до заявки $tasksType від $taskDate за адресою $address.";
                    $history = updateHistory(date("d.m.Y H:i"), 'Зміна лічильника', $username, $message, $meterHistory);
                
                    $updateHistoryQuery = $conn->prepare("UPDATE meters SET history = ? WHERE ID = ?");
                    $updateHistoryQuery->bind_param('si', $history, $meterId);
                    $updateHistoryQuery->execute();
                    $updateHistoryQuery->close();
                
                    $addMeters[] = $meterNumber;
                } else {
                    throw new Exception("Лічильник з ID $meterId не знайдено в Базі Даних.");
                }
            }
        } elseif ($action == 'dell') {
            if ($isNonumberMeter) {
                $nonumberCount++;
                if (($key = array_search($meterId, $metersId)) !== false) {
                    unset($metersId[$key]);
                }
            } else {
                if (($key = array_search($meterId, $metersId)) !== false) {
                    unset($metersId[$key]);
                    $meterQuery = $conn->prepare("SELECT number, history FROM meters WHERE ID = ?");
                    $meterQuery->bind_param('i', $meterId);
                    $meterQuery->execute();
                    $meterResult = $meterQuery->get_result();
                    $meterRow = $meterResult->fetch_assoc();
                    $meterNumber = $meterRow['number'];
                    $meterHistory = $meterRow['history'];
                    $meterQuery->close();

                    $message = "Лічильник $meterNumber був видалений із заявки $tasksType від $taskDate за адресою $address.";
                    $history = updateHistory(date("d.m.Y H:i"), 'Зміна лічильника', $username, $message, $meterHistory);

                    $updateHistoryQuery = $conn->prepare("UPDATE meters SET history = ? WHERE ID = ?");
                    $updateHistoryQuery->bind_param('si', $history, $meterId);
                    $updateHistoryQuery->execute();
                    $updateHistoryQuery->close();

                    $dellMeters[] = $meterNumber;
                }
            }
        }
    }

    $newMetersId = implode('|', $metersId);
    $messages = [];
    if ($nonumberCount > 0) {
        $messages[] = "видалено БЕЗ НОМЕРУ - $nonumberCount шт.";
    }
    if (!empty($dellMeters)) {
        $messages[] = "видалено лічильники: " . implode(', ', $dellMeters);
    }
    if (!empty($addMeters)) {
        $messages[] = "додано лічильники: " . implode(', ', $addMeters);
    }
    if (!empty($messages)) {
        $taskMessage = "Було " . implode('; ', $messages);
        $taskHistory = updateHistory(date("d.m.Y H:i"), 'Зміна лічильників', $username, $taskMessage, $taskHistory);
        $updateTaskQuery = $conn->prepare("UPDATE tasks SET meters_id = ?, history = ? WHERE ID = ?");
        $updateTaskQuery->bind_param('ssi', $newMetersId, $taskHistory, $taskId);
        $updateTaskQuery->execute();
        $updateTaskQuery->close();
        logger('database', 'EditDATA', '[INFO]', "В заявці $tasksType від $taskDate за адресою $address було " . implode('; ', $messages) . " користувачем [$username].");
    }

    $response = ['status' => 'success', 'message' => 'Зміни успішно збережені'];
} catch (mysqli_sql_exception $e) {
    $response = ['status' => 'error', 'message' => 'Помилка при зміні даних<br>у Базі Даних Чернігів: ' . $e->getMessage()];
    logger('database', 'EditDATA', '[ERROR]', 'Помилка при зміні даних у Базі Даних Чернігів: ' . $e->getMessage());
} catch (Exception $e) {
    $response = ['status' => 'error', 'message' => $e->getMessage()];
    logger('database', 'EditDATA', '[ERROR]', $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>