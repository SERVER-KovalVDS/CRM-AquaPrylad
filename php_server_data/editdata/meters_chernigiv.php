<?php
    try {
        $addressId = $data['DataId'];
        $selectQuery = $conn->prepare("SELECT a.adr_street_id, a.adr_building, a.adr_building2, a.adr_fl_of, a.history, 
                                        CONCAT(sb.type, ' ', sb.name) AS street 
                                        FROM addresses a
                                        LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
                                        WHERE a.ID = ? ");
        $selectQuery->bind_param('i', $addressId);
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
        $address = $row['street'] . ', буд. ' . $row['adr_building'];
        if ($row['adr_building2']) {
            $address .= ', корп. ' . $row['adr_building2'];
        }
        $address .= ', кв. ' . $row['adr_fl_of'];
        $addressHistory = $row['history'];
        $selectQuery->close();
        
        $changes = $data['edit_values'];
        $addMeters = [];
        $dellMeters = [];
        
        foreach ($changes as $change) {
            $meterId = $change['id'];

            // Check if meter is present in tasks
            $taskQuery = $conn->prepare("SELECT COUNT(*) as count FROM tasks WHERE FIND_IN_SET(?, REPLACE(meters_id, '|', ',')) > 0");
            $taskQuery->bind_param('i', $meterId);
            $taskQuery->execute();
            $taskResult = $taskQuery->get_result();
            $taskRow = $taskResult->fetch_assoc();
            $taskQuery->close();
            if ($taskRow['count'] > 0) {
                $response = ['status' => 'warning', 'message' => 'Обрані лічильники не можуть бути змінені<br>для цієї адреси, тому що вони<br>знаходяться в активних заявках.'];
                $conn->close();
                echo json_encode($response);
                exit();
            }
            $action = $change['action'];

            $meterQuery = $conn->prepare("SELECT number, history FROM meters WHERE ID = ?");
            $meterQuery->bind_param('i', $meterId);
            $meterQuery->execute();
            $meterResult = $meterQuery->get_result();
            $meterRow = $meterResult->fetch_assoc();
            $meterNumber = $meterRow['number'];
            $meterHistory = $meterRow['history'];
            $meterQuery->close();

            if ($action == 'add') {
                $updateQuery = $conn->prepare("UPDATE meters SET address_id = ? WHERE ID = ?");
                $updateQuery->bind_param('ii', $addressId, $meterId);
                $updateQuery->execute();
                $updateQuery->close();

                $message = "Лічильник був доданий до адреси $address.";
                $history = updateHistory(date("d.m.Y H:i"), 'Зміна адреси', $username, $message, $meterHistory);
                $updateHistoryQuery = $conn->prepare("UPDATE meters SET history = ? WHERE ID = ?");
                $updateHistoryQuery->bind_param('si', $history, $meterId);
                $updateHistoryQuery->execute();
                $updateHistoryQuery->close();

                $addMeters[] = $meterNumber;
            } elseif ($action == 'dell') {
                $updateQuery = $conn->prepare("UPDATE meters SET address_id = NULL WHERE ID = ?");
                $updateQuery->bind_param('i', $meterId);
                $updateQuery->execute();
                $updateQuery->close();
                $message = "Лічильник був видалений з адреси $address.";
                $history = updateHistory(date("d.m.Y H:i"), 'Зміна адреси', $username, $message, $meterHistory);
                $updateHistoryQuery = $conn->prepare("UPDATE meters SET history = ? WHERE ID = ?");
                $updateHistoryQuery->bind_param('si', $history, $meterId);
                $updateHistoryQuery->execute();
                $updateHistoryQuery->close();

                $dellMeters[] = $meterNumber;
            }
        }
        $messages = [];
        if (!empty($dellMeters)) {
            $messages[] = "видалено лічильники: " . implode(', ', $dellMeters);
        }
        if (!empty($addMeters)) {
            $messages[] = "додано лічильники: " . implode(', ', $addMeters) . "]";
        }
        if (!empty($messages)) {
            $addressMessage = "Було " . implode('; ', $messages);
            $addressHistory = updateHistory(date("d.m.Y H:i"), 'Зміна лічильників', $username, $addressMessage, $addressHistory);
            $updateAddressHistoryQuery = $conn->prepare("UPDATE addresses SET history = ? WHERE ID = ?");
            $updateAddressHistoryQuery->bind_param('si', $addressHistory, $addressId);
            $updateAddressHistoryQuery->execute();
            $updateAddressHistoryQuery->close();
            logger('database', 'EditDATA', '[INFO]', "За адресою $address користувачем [$username] було " . implode('; ', $messages) . ".");
        }
        $response = ['status' => 'success', 'message' => 'Зміни успішно збережені'];
    } catch (mysqli_sql_exception $e) {
        $response = ['status' => 'error', 'message' => 'Помилка при зміні даних<br>у Базі Даних Чернігів: ' . $e->getMessage()];
        logger('database', 'EditDATA', '[ERROR]', 'Помилка при зміні даних у Базі Даних Чернігів: ' . $e->getMessage());
    } finally {
        if (isset($conn)) {
            $conn->close();
        }
    }
?>