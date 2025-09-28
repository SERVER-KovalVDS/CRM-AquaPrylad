<?php
    try {
        $metersArray = !empty($data['taskMetersId']) ? explode('|', $data['taskMetersId']) : null;

        $stmt = $conn->prepare("INSERT INTO tasks (address_id, tasks_type, brigade, cost, pay_method, note, meters_id, status, history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $status = 'Нова заявка';
        $metersId = $metersArray ? $data['taskMetersId'] : null;
        $currentDateTime = date("d.m.Y H:i");
        $currentDate = date("d.m.Y");
        $processType = 'Створення заявки';
        $message = 'Заявку додано до Бази Даних м. Чернігів.';
        $history = updateHistory($currentDateTime, $processType, $username, $message);
        $stmt->bind_param("issssssss", $data['taskAddressId'], $data['taskType'], $data['brigade'], $data['cost'], $data['payMethod'], $data['note'], $metersId, $status, $history);
        
        $formatPhoneNumber = function($phone) {
            if (strlen($phone) === 6) {
                return '+38(0462)' . substr($phone, 0, 2) . '-' . substr($phone, 2, 2) . '-' . substr($phone, 4, 2);
            } else if (strlen($phone) === 10) {
                return '+38(' . substr($phone, 0, 3) . ')' . substr($phone, 3, 3) . '-' . substr($phone, 6, 2) . '-' . substr($phone, 8, 2);
            }
            return $phone;
        };

        if ($stmt->execute()) {
            $response = ['status' => 'success', 'message' => 'Нова заявка успішно додана<br>до Бази Даних Чернігів.', 'user' => $username];
            $task_name = $data['taskType'];
            $meterNumbers = [];

            if ($metersArray) {
                $nonumberCount = 0;
                foreach ($metersArray as $meterId) {
                    if (strpos($meterId, 'nonumber') !== false) {
                        $nonumberCount++;
                    } else {
                        $meterStmt = $conn->prepare("SELECT number, history FROM meters WHERE ID = ?");
                        $meterStmt->bind_param("i", $meterId);
                        $meterStmt->execute();
                        $meterStmt->bind_result($meterNumber, $meterHistory);
                        $meterStmt->fetch();
                        $meterStmt->close();
            
                        $meterNumbers[] = $meterNumber;
            
                        $meterMessage = "Лічильник додано до заявки $task_name від $currentDate.";
                        $updatedMeterHistory = updateHistory($currentDateTime, 'Додавання до заявки', $username, $meterMessage, $meterHistory);
            
                        $newMeterStatus = 'На повірці';
                        $updateMeterStmt = $conn->prepare("UPDATE meters SET history = ?, status = ? WHERE ID = ?");
                        $updateMeterStmt->bind_param("ssi", $updatedMeterHistory, $newMeterStatus, $meterId);
                        $updateMeterStmt->execute();
                        $updateMeterStmt->close();
                    }
                }
            
                if ($nonumberCount > 0) {
                    $meterNumbers[] = "БЕЗ НОМЕРА - $nonumberCount шт";
                }
            }
        
            // Обновление истории адреса и номеров телефонов
            $addressStmt = $conn->prepare("SELECT phone, history FROM addresses WHERE ID = ?");
            $addressStmt->bind_param("i", $data['taskAddressId']);
            $addressStmt->execute();
            $addressStmt->bind_result($addressPhone, $addressHistory);
            $addressStmt->fetch();
            $addressStmt->close();

            $oldPhones = $addressPhone !== null ? explode('|', $addressPhone) : [];
            $newPhones = $data['phones'] !== null ? explode('|', $data['phones']) : [];
            $hasPhoneChanges = $data['phones'] !== null;

            if ($metersArray) {
                $meterNumbersText = implode(', ', $meterNumbers);
                if (count($meterNumbers) > 1) {
                    $addressMessage = "Адресу додано до заявки [$task_name] від $currentDate для лічильників $meterNumbersText.";
                } else {
                    $addressMessage = "Адресу додано до заявки [$task_name] від $currentDate для лічильника $meterNumbersText.";
                }
            } else {
                $addressMessage = "Адресу додано до заявки [$task_name] без лічильників від $currentDate.";
            }

            $updatedAddressHistory = updateHistory($currentDateTime, 'Додавання до заявки', $username, $addressMessage, $addressHistory);

            // Обновление телефонных номеров
            if ($hasPhoneChanges) {
                $oldPhonesString = implode(', ', array_map($formatPhoneNumber, $oldPhones));
                $newPhonesString = implode(', ', array_map($formatPhoneNumber, $newPhones));

                $phoneChangeMessage = "";
                $log_message = "За адресою ".$data['taskAddressText']." користувачем [$username] ";
                if (!$newPhonesString) {
                    if (count($oldPhones) > 1) {
                        $phoneChangeMessage .= "Номери телефонів $oldPhonesString видалені із адреси,";
                        $log_message .= "видалені номери телефонів $oldPhonesString,";
                    } else {
                        $phoneChangeMessage .= "Номер телефону $oldPhonesString видалено із адреси,";
                        $log_message .= "видалено номер телефону $oldPhonesString,";
                    }
                } elseif (!$oldPhonesString) {
                    if (count($newPhones) > 1) {
                        $phoneChangeMessage .= "Номери телефонів $newPhonesString додані до адреси,";
                        $log_message .= "додані номери телефонів $newPhonesString,";
                    } else {
                        $phoneChangeMessage .= "Номер телефону $newPhonesString додано до адреси,";
                        $log_message .= "додано номер телефону $newPhonesString,";
                    }
                } else {
                    $phoneChangeMessage .= "Номери телефонів змінені з $oldPhonesString на $newPhonesString,";
                    $log_message .= "змінені номери телефонів з $oldPhonesString на $newPhonesString,";
                }

                $phoneChangeMessage .= " при створенні нової заявки [$task_name] від $currentDate.";
                $log_message .= " при створенні нової заявки [$task_name] від $currentDate.";

                $updatedAddressHistory = updateHistory($currentDateTime, 'Зміна телефонних номерів', $username, $phoneChangeMessage, $updatedAddressHistory);

                $updateQuery = $conn->prepare("UPDATE addresses SET phone = ?, history = ? WHERE ID = ?");
                $updateQuery->bind_param('ssi', $data['phones'], $updatedAddressHistory, $data['taskAddressId']);

                logger('database', 'EditDATA', '[INFO]', $log_message);
            } else {
                $updateQuery = $conn->prepare("UPDATE addresses SET history = ? WHERE ID = ?");
                $updateQuery->bind_param('si', $updatedAddressHistory, $data['taskAddressId']);
            }

            $updateQuery->execute();
            $updateQuery->close();
        } else {
            throw new Exception('Помилка при додаванні Нової заявки до Бази Даних Чернігів.');
        }
        $stmt->close();
    } catch (mysqli_sql_exception $e) {
        $response = ['status' => 'error', 'message' => 'Помилка при додаванні Нової заявки<br>до Бази Даних Чернігів: ' . $e->getMessage()];
        logger('database', 'NewDATA', '[ERROR]', 'Помилка при додаванні Нової заявки до Бази Даних Чернігів: ' . $e->getMessage());
    } finally {
        if (isset($conn)) {
            $conn->close();
        }
    }
?>