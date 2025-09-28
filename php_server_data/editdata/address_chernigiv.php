<?php
    try {
        $meterId = $data['DataId'];
        $new_address_id = $data['edit_values'];

        // Check if meter is present in tasks
        $taskQuery = $conn->prepare("SELECT COUNT(*) as count FROM tasks WHERE FIND_IN_SET(?, REPLACE(meters_id, '|', ',')) > 0");
        $taskQuery->bind_param('i', $meterId);
        $taskQuery->execute();
        $taskResult = $taskQuery->get_result();
        $taskRow = $taskResult->fetch_assoc();
        $taskQuery->close();
        if ($taskRow['count'] > 0) {
            $response = ['status' => 'warning', 'message' => 'Адреса лічильника не може<br>бути змінена, тому що він<br>знаходиться в активній заявці.'];
            $conn->close();
            echo json_encode($response);
            exit();
        }

        $selectQuery = $conn->prepare("SELECT number, address_id, history FROM meters WHERE ID = ?");
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
        $old_address_id = $row['address_id'];
        $meterNumber = $row['number'];
        $meterHistory = $row['history'];
        $selectQuery->close();

        $currentDateTime = date("d.m.Y H:i");
        $processType = 'Зміна адреси';

        function getAddressData($conn, $addressId) {
            $addressQuery = $conn->prepare("SELECT CONCAT(sb.type, ' ', sb.name, ', буд. ', a.adr_building, 
                                            IF(a.adr_building2 IS NOT NULL, CONCAT(', корп. ', a.adr_building2), ''), ', кв. ', a.adr_fl_of) AS full_address,
                                            a.history
                                            FROM addresses a
                                            LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
                                            WHERE a.ID = ?");
            $addressQuery->bind_param('i', $addressId);
            $addressQuery->execute();
            $addressResult = $addressQuery->get_result();
            $addressData = $addressResult->fetch_assoc();
            $addressQuery->close();
            return $addressData;
        }

        $old_address_text = null;
        $old_address_history = null;
        $new_address_text = null;
        $new_address_history = null;

        if (!is_null($old_address_id)) {
            $oldAddressData = getAddressData($conn, $old_address_id);
            $old_address_text = $oldAddressData['full_address'];
            $old_address_history = $oldAddressData['history'];
        }

        if (!is_null($new_address_id)) {
            $newAddressData = getAddressData($conn, $new_address_id);
            $new_address_text = $newAddressData['full_address'];
            $new_address_history = $newAddressData['history'];
        }

        $history_message = '';
        $old_address_message = '';
        $new_address_message = '';

        switch (true) {
            case is_null($new_address_id):
                $history_message = "Лічильник було видалено з адреси $old_address_text.";
                $old_address_message = "Було видалено лічильники: $meterNumber.";

                $old_address_history = updateHistory($currentDateTime, 'Зміна лічильників', $username, $old_address_message, $old_address_history);
                $updateOldAddressQuery = $conn->prepare("UPDATE addresses SET history = ? WHERE ID = ?");
                $updateOldAddressQuery->bind_param('si', $old_address_history, $old_address_id);
                $updateOldAddressQuery->execute();
                $updateOldAddressQuery->close();

                $meterHistory = updateHistory($currentDateTime, 'Зміна адреси', $username, $history_message, $meterHistory);
                $updateQuery = $conn->prepare("UPDATE meters SET address_id = NULL, history = ? WHERE ID = ?");
                $updateQuery->bind_param('si', $meterHistory, $meterId);

                logger('database', 'EditDATA', '[INFO]', "За адресою $old_address_text користувачем [$username] були видалені лічильники: $meterNumber.");
                break;

            case is_null($old_address_id):
                $history_message = "Лічильник додано до адреси $new_address_text.";
                $new_address_message = "Було додано лічильники $meterNumber.";

                $new_address_history = updateHistory($currentDateTime, 'Зміна лічильників', $username, $new_address_message, $new_address_history);
                $updateNewAddressQuery = $conn->prepare("UPDATE addresses SET history = ? WHERE ID = ?");
                $updateNewAddressQuery->bind_param('si', $new_address_history, $new_address_id);
                $updateNewAddressQuery->execute();
                $updateNewAddressQuery->close();

                $meterHistory = updateHistory($currentDateTime, 'Зміна адреси', $username, $history_message, $meterHistory);
                $updateQuery = $conn->prepare("UPDATE meters SET address_id = ?, history = ? WHERE ID = ?");
                $updateQuery->bind_param('isi', $new_address_id, $meterHistory, $meterId);

                logger('database', 'EditDATA', '[INFO]', "За адресою $new_address_text користувачем [$username] були додані лічильники: $meterNumber.");
                break;

            default:
                $history_message = "Адресу лічильника змінено з $old_address_text на $new_address_text.";
                $old_address_message = "Лічильник $meterNumber був переміщений на адресу $new_address_text.";
                $new_address_message = "Лічильник $meterNumber був переміщений з адреси $old_address_text.";

                $old_address_history = updateHistory($currentDateTime, 'Зміна лічильників', $username, $old_address_message, $old_address_history);
                $updateOldAddressQuery = $conn->prepare("UPDATE addresses SET history = ? WHERE ID = ?");
                $updateOldAddressQuery->bind_param('si', $old_address_history, $old_address_id);
                $updateOldAddressQuery->execute();
                $updateOldAddressQuery->close();

                $new_address_history = updateHistory($currentDateTime, 'Зміна лічильників', $username, $new_address_message, $new_address_history);
                $updateNewAddressQuery = $conn->prepare("UPDATE addresses SET history = ? WHERE ID = ?");
                $updateNewAddressQuery->bind_param('si', $new_address_history, $new_address_id);
                $updateNewAddressQuery->execute();
                $updateNewAddressQuery->close();

                $meterHistory = updateHistory($currentDateTime, 'Зміна адреси', $username, $history_message, $meterHistory);
                $updateQuery = $conn->prepare("UPDATE meters SET address_id = ?, history = ? WHERE ID = ?");
                $updateQuery->bind_param('isi', $new_address_id, $meterHistory, $meterId);

                logger('database', 'EditDATA', '[INFO]', "Для лічильника $meterNumber користувачем [$username] змінено адресу з $old_address_text на $new_address_text.");
                break;
        }

        $updateQuery->execute();

        if ($updateQuery->affected_rows > 0) {
            $response = (['status' => 'success', 'message' => 'Зміни успішно збережені', 'Нове значення: ' => $new_address_text]);
        } else {
            $response = (['status' => 'warning', 'message' => 'Зміни не вдалося зберегти']);
        }

        $updateQuery->close();
    } catch (mysqli_sql_exception $e) {
        $response = ['status' => 'error', 'message' => 'Помилка при зміні даних<br>у Базі Даних Чернігів: ' . $e->getMessage()];
    } finally {
        if (isset($conn)) {
            $conn->close();
        }
    }
?>