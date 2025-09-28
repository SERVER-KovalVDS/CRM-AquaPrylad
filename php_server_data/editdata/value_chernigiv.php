<?php
    try {
        $selectQuery = $conn->prepare("SELECT m.number, m.value, m.history
                                        FROM meters m
                                        WHERE m.ID = ?");
        $selectQuery->bind_param('i', $data['DataId']);
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
        $old_value = $row['value'] !== null ? $row['value'] : 'Дані відсутні';
        $meterNumber = $row['number'];
        $meterHistory = $row['history'];
        $selectQuery->close();

        $new_value = $data['edit_values'] !== null ? $data['edit_values'] : null;
        $currentDateTime = date("d.m.Y H:i");
        $processType = 'Зміна показників';
        $message = "Показники лічильника змінені з $old_value на $new_value.";
        $history = updateHistory($currentDateTime, $processType, $username, $message, $meterHistory);

        $updateQuery = $conn->prepare("UPDATE meters SET value = ?, history = ? WHERE ID = ?");
        $updateQuery->bind_param('ssi', $new_value, $history, $data['DataId']);
        $updateQuery->execute();

        if ($updateQuery->affected_rows > 0) {
            $response = (['status' => 'success', 'message' => 'Зміни успішно збережені', 'Нове значення: ' => $new_value]);
            logger('database', 'EditDATA', '[INFO]', "Для лічильника $meterNumber користувачем [$username] змінено показники з $old_value на $new_value.");
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