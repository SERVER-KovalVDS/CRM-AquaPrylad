<?php
try {
    $taskId = $data['DataId'];
    $edit_values = $data['edit_values'];
    $no_number_meter = $edit_values[0];
    $new_meter_id = $edit_values[1];
    $new_meter_number = $edit_values[2];

    $selectQuery = $conn->prepare("SELECT meters_id, history, tasks_type, DATE_FORMAT(date, '%d.%m.%Y') as formatted_date FROM tasks WHERE ID = ?");
    $selectQuery->bind_param('i', $taskId);
    $selectQuery->execute();
    $result = $selectQuery->get_result();

    if ($result->num_rows === 0) {
        $response = ['status' => 'error', 'message' => 'Запис не знайдено.'];
        $selectQuery->close();
        $conn->close();
        echo json_encode($response);
        exit();
    }

    $row = $result->fetch_assoc();
    $meters_id = $row['meters_id'];
    $taskHistory = $row['history'];
    $taskType = $row['tasks_type'];
    $taskDate = $row['formatted_date'];
    $selectQuery->close();

    $old_value = $meters_id;
    $new_value = str_replace($no_number_meter, $new_meter_id, $meters_id);

    $history_message = "Лічильник БЕЗ НОМЕРА ідентифіковано як $new_meter_number.";
    $log_message = "Для заявки $taskType від $taskDate користувачем [$username] лічильник БЕЗ НОМЕРА ідентифіковано як $new_meter_number.";

    $currentDateTime = date("d.m.Y H:i");
    $processType = 'Ідентифікація лічильника';
    $history = updateHistory($currentDateTime, $processType, $username, $history_message, $taskHistory);

    $updateQuery = $conn->prepare("UPDATE tasks SET meters_id = ?, history = ? WHERE ID = ?");
    $updateQuery->bind_param('ssi', $new_value, $history, $taskId);
    $updateQuery->execute();

    if ($updateQuery->affected_rows > 0) {
        $response = ['status' => 'success', 'message' => 'Зміни успішно збережені.', 'Нове значення: ' => $new_value];
        logger('database', 'EditDATA', '[INFO]', $log_message);
    } else {
        $response = ['status' => 'warning', 'message' => 'Зміни не вдалося зберегти'];
    }

    $updateQuery->close();
} catch (mysqli_sql_exception $e) {
    $response = ['status' => 'error', 'message' => 'Помилка при зміні даних у Базі Даних Чернігів: ' . $e->getMessage()];
    logger('database', 'EditDATA', '[ERROR]', 'Помилка при зміні даних у Базі Даних Чернігів: ' . $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>