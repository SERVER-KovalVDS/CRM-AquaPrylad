<?php
    try {
        $meterId = $data['DataId'];
        $new_value = $data['edit_values'];
        $selectQuery = $conn->prepare("SELECT number, balanser, history FROM meters WHERE ID = ?");
        $selectQuery->bind_param('i', $meterId);
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
        $old_value = $row['balanser'];
        $meterNumber = $row['number'];
        $meterHistory = $row['history'];
        $selectQuery->close();
        $currentDateTime = date("d.m.Y H:i");
        $processType = 'Зміна балансоутримувача';
        $old_value_text = $old_value;
        $new_value_text = $new_value;
        $message = "Балансоутримувача лічильника змінено з $old_value_text на $new_value_text.";
        $history = updateHistory($currentDateTime, $processType, $username, $message, $meterHistory);

        $updateQuery = $conn->prepare("UPDATE meters SET balanser = ?, history = ? WHERE ID = ?");
        $updateQuery->bind_param('ssi', $new_value, $history, $meterId);
        $updateQuery->execute();

        if ($updateQuery->affected_rows > 0) {
            $response = (['status' => 'success', 'message' => 'Зміни успішно збережені', 'Нове значення: ' => $new_value]);
            logger('database', 'EditDATA', '[INFO]', "Для лічильника $meterNumber користувачем [$username] змінено балансоутримувача з $old_value_text на $new_value_text.");
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