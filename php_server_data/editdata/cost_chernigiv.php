<?php
    try {
        $taskId = $data['DataId'];
        $new_value = $data['edit_values'];

        $selectQuery = $conn->prepare("SELECT cost, history, tasks_type, DATE_FORMAT(date, '%d.%m.%Y') as formatted_date FROM tasks WHERE ID = ?");
        $selectQuery->bind_param('i', $taskId);
        $selectQuery->execute();
        $result = $selectQuery->get_result();

        if ($result->num_rows === 0) {
            $response = (['status' => 'error', 'message' => 'Запис не знайдено.']);
            $selectQuery->close();
            $conn->close();
            echo json_encode($response);
            exit();
        }

        $row = $result->fetch_assoc();
        $old_value = $row['cost'] !== null ? $row['cost'] : null;
        $taskHistory = $row['history'];
        $taskType = $row['tasks_type'];
        $taskDate = $row['formatted_date'];
        $selectQuery->close();

        $history_message = "Вартість ";
        $log_message = "Для заявки $taskType від $taskDate користувачем [$username] ";
        switch (true) {
            case !$new_value:
                $history_message .= "$old_value грн. видалена із заявки.";
                $log_message .= "видалено вартість робіт $old_value грн.";
                break;
            case !$old_value:
                $history_message .= "$new_value грн. додана до заявки.";
                $log_message .= "додано вартість робіт $new_value грн.";
                break;  
            default:
                $history_message .= "змінена з $old_value грн. на $new_value грн.";
                $log_message .= "змінено вартість робіт з $old_value грн. на $new_value грн.";
        }

        $currentDateTime = date("d.m.Y H:i");
        $processType = 'Зміна вартості';
        $history = updateHistory($currentDateTime, $processType, $username, $history_message, $taskHistory);

        $updateQuery = $conn->prepare("UPDATE tasks SET cost = ?, history = ? WHERE ID = ?");
        $updateQuery->bind_param('ssi', $new_value, $history, $taskId);
        $updateQuery->execute();

        if ($updateQuery->affected_rows > 0) {
            $response = (['status' => 'success', 'message' => 'Зміни успішно збережені', 'Нове значення: ' => $new_value]);
            logger('database', 'EditDATA', '[INFO]', $log_message);
        } else {
            $response = (['status' => 'warning', 'message' => 'Зміни не вдалося зберегти']);
        }

        $updateQuery->close();
    } catch (mysqli_sql_exception $e) {
        $response = ['status' => 'error', 'message' => 'Помилка при зміні даних<br>у Базі Даних Чернігів: ' . $e->getMessage()];
        logger('database', 'EditDATA', '[ERROR]', 'Помилка при зміні даних у Базі Даних Чернігів: ' . $e->getMessage());
    } finally {
        if (isset($conn)) {
            $conn->close();
        }
    }
?>