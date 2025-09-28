<?php
    try {
        $selectQuery = $conn->prepare("SELECT a.adr_street_id, a.adr_building, a.adr_building2, a.adr_fl_of, a." . $data['edit_field'] . ", a.history, 
                                            CONCAT(sb.type, ' ', sb.name) AS street 
                                        FROM addresses a
                                        LEFT JOIN street_base sb ON a.adr_street_id = sb.ID
                                        WHERE a.ID = ? ");
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
        $old_value = $row[$data['edit_field']] !== null ? $row[$data['edit_field']] : null;
        $address = $row['street'] . ', буд. ' . $row['adr_building'];
        if ($row['adr_building2']) {
            $address .= ', корп. ' . $row['adr_building2'];
        }
        $address .= ', кв. ' . $row['adr_fl_of'];
        $new_value = $data['edit_values'] !== null ? $data['edit_values'] : null;

        $history_message = "Інформація про абонента ";
        $log_message = "За адресою $address користувачем [$username] ";
        switch (true) {
            case !$new_value:
                $history_message .= "$old_value видалена із адреси.";
                $log_message .= "видалено інформацію про абонента $old_value.";
                break;
            case !$old_value:
                $history_message .= "$new_value додана до адреси.";
                $log_message .= "додано інформацію про абонента $new_value.";
                break;  
            default:
                $history_message .= "змінена з $old_value на $new_value.";
                $log_message .= "змінено інформацію про абонента з $old_value на $new_value.";
        }

        $currentDateTime = date("d.m.Y H:i");
        $processType = 'Зміна даних';
        $history = updateHistory($currentDateTime, $processType, $username, $history_message, $row['history']);
        $updateQuery = $conn->prepare("UPDATE addresses SET " . $data['edit_field'] . " = ?, history = ? WHERE ID = ?");
        $updateQuery->bind_param('ssi', $new_value, $history, $data['DataId']);
        $updateQuery->execute();

        if ($updateQuery->affected_rows > 0) {
            $response =(['status' => 'success', 'message' => 'Зміни успішно збережені', 'Нове значення: ' => $new_value]);
            logger('database', 'EditDATA', '[INFO]', $log_message);
        } else {
            $response =(['status' => 'warning', 'message' => 'Зміни не вдалося зберегти']);
        }
        $selectQuery->close();
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