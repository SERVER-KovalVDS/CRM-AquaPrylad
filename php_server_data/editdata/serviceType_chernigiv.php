<?php
    try {
        $meterId = $data['DataId'];
        $new_value = $data['edit_values'];
        
        $serviceTypes = [
            '1' => 'Холодний',
            '2' => 'Гарячий'
        ];

        $selectQuery = $conn->prepare("SELECT number, service_type, history FROM meters WHERE ID = ?");
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
        $old_value = $row['service_type'];
        $meterNumber = $row['number'];
        $meterHistory = $row['history'];
        $selectQuery->close();
        $currentDateTime = date("d.m.Y H:i");
        $processType = 'Зміна температури';
        $old_value_text = $serviceTypes[$old_value];
        $new_value_text = $serviceTypes[$new_value];
        $message = "Температуру лічильника змінено з $old_value_text на $new_value_text.";
        $history = updateHistory($currentDateTime, $processType, $username, $message, $meterHistory);

        $updateQuery = $conn->prepare("UPDATE meters SET service_type = ?, history = ? WHERE ID = ?");
        $updateQuery->bind_param('ssi', $new_value, $history, $meterId);
        $updateQuery->execute();

        if ($updateQuery->affected_rows > 0) {
            $response = (['status' => 'success', 'message' => 'Зміни успішно збережені', 'Нове значення: ' => $new_value]);
            logger('database', 'EditDATA', '[INFO]', "Для лічильника $meterNumber користувачем [$username] змінено температуру з $old_value_text на $new_value_text.");
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