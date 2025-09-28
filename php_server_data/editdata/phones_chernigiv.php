<?php
    try {
        $selectQuery = $conn->prepare("SELECT a.adr_street_id, a.adr_building, a.adr_building2, a.adr_fl_of, a.phone, a.history, 
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
        $old_value = $row['phone'] !== null ? $row['phone'] : 'Дані відсутні';
        $address = $row['street'] . ', буд. ' . $row['adr_building'];
        if ($row['adr_building2']) {
            $address .= ', корп. ' . $row['adr_building2'];
        }
        $address .= ', кв. ' . $row['adr_fl_of'];

        $new_value = $data['edit_values'] !== null ? $data['edit_values'] : null;
        $currentDateTime = date("d.m.Y H:i");
        $processType = 'Зміна даних';
        $oldPhones = $old_value !== 'Дані відсутні' ? explode('|', $old_value) : [];
        $newPhones = $new_value !== null ? explode('|', $new_value) : [];
        
        $formatPhoneNumber = function($phone) {
            if (strlen($phone) === 6) {
                return '+38(0462)' . substr($phone, 0, 2) . '-' . substr($phone, 2, 2) . '-' . substr($phone, 4, 2);
            } else if (strlen($phone) === 10) {
                return '+38(' . substr($phone, 0, 3) . ')' . substr($phone, 3, 3) . '-' . substr($phone, 6, 2) . '-' . substr($phone, 8, 2);
            }
            return $phone;
        };

        $oldPhonesFormatted = array_map($formatPhoneNumber, $oldPhones);
        $newPhonesFormatted = array_map($formatPhoneNumber, $newPhones);

        $oldPhonesString = implode(', ', $oldPhonesFormatted);
        $newPhonesString = implode(', ', $newPhonesFormatted);

        $history_message = "";
        $log_message = "За адресою $address користувачем [$username] ";
        switch (true) {
            case !$newPhonesString:
                if (count($oldPhones) > 1) {
                    $history_message .= "Номери телефонів $oldPhonesString видалені із адреси.";
                    $log_message .= "видалені номери телефонів $oldPhonesString.";
                } else {
                    $history_message .= "Номер телелфону $oldPhonesString видалено із адреси.";
                    $log_message .= "видалено номер телефону $oldPhonesString.";
                }
                break;
            case !$oldPhonesString:
                if (count($newPhones) > 1) {
                    $history_message .= "Номери телефонів $newPhonesString додані до адреси.";
                    $log_message .= "додані номери телефонів $newPhonesString.";
                } else {
                    $history_message .= "Номер телефону $newPhonesString додано до адреси.";
                    $log_message .= "додано номер телефону $newPhonesString.";
                }
                break;  
            default:
                $history_message .= "Номери телефонів змінені з $oldPhonesString на $newPhonesString.";
                $log_message .= "змінені номери телефонів з $oldPhonesString на $newPhonesString.";
        }

        $history = updateHistory($currentDateTime, $processType, $username, $history_message, $row['history']);
        
        $updateQuery = $conn->prepare("UPDATE addresses SET phone = ?, history = ? WHERE ID = ?");
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